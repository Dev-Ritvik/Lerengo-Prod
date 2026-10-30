/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveCoursesFallbackAvailability,
  resolveSampleLoginAvailability,
} from "../src/lib/env.ts";
import {
  checkLocalRateLimit,
  checkGlobalRateLimit,
  resolveClientIp,
  sweepExpiredEntries,
} from "../src/lib/local-rate-limit.ts";

test("sample login is disabled in production even if the flag is set", () => {
  assert.equal(
    resolveSampleLoginAvailability({
      enabledValue: "true",
      nodeEnv: "production",
    }),
    false,
  );
});

test("course fallback stays allowed in development by default", () => {
  assert.equal(
    resolveCoursesFallbackAvailability({
      enabledValue: undefined,
      nodeEnv: "development",
    }),
    true,
  );
});

test("course fallback stays disabled in production unless explicitly enabled", () => {
  assert.equal(
    resolveCoursesFallbackAvailability({
      enabledValue: undefined,
      nodeEnv: "production",
    }),
    false,
  );
  assert.equal(
    resolveCoursesFallbackAvailability({
      enabledValue: "true",
      nodeEnv: "production",
    }),
    true,
  );
});

test("local rate limiting blocks requests after the configured limit", () => {
  const first = checkLocalRateLimit({
    key: "test:user:1",
    limit: 2,
    nowMs: 1_000,
    windowMs: 10_000,
  });
  const second = checkLocalRateLimit({
    key: "test:user:1",
    limit: 2,
    nowMs: 1_500,
    windowMs: 10_000,
  });
  const third = checkLocalRateLimit({
    key: "test:user:1",
    limit: 2,
    nowMs: 2_000,
    windowMs: 10_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});

test("client IP resolution prefers forwarded headers when proxy trust is enabled", () => {
  const request = new Request("https://lerengo.test/api/example", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 203.0.113.11",
      "x-real-ip": "198.51.100.20",
    },
  });

  assert.equal(
    resolveClientIp(request, { TRUST_PROXY_HEADERS: "true" }),
    "203.0.113.10",
  );
});

test("client IP resolution prioritizes cf-connecting-ip over spoofed forwarded-for", () => {
  const request = new Request("https://lerengo.test/api/example", {
    headers: {
      "cf-connecting-ip": "198.51.100.99",
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    },
  });

  assert.equal(
    resolveClientIp(request, { TRUST_PROXY_HEADERS: "true" }),
    "198.51.100.99",
  );
});

test("client IP resolution ignores spoofable headers by default (H2)", () => {
  const request = new Request("https://lerengo.test/api/example", {
    headers: {
      "cf-connecting-ip": "198.51.100.99",
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    },
  });

  // Without TRUST_PROXY_HEADERS=true, header values must never be trusted.
  assert.equal(resolveClientIp(request, {}), "shared");
  assert.equal(
    resolveClientIp(request, { TRUST_PROXY_HEADERS: "false" }),
    "shared",
  );
});

test("global rate limit blocks after exceeding the configured limit", () => {
  const ip = "global-test-block-" + Date.now();
  const config = { limit: 3, windowMs: 60_000, nowMs: 100_000 };

  assert.equal(checkGlobalRateLimit(ip, config).allowed, true);
  assert.equal(checkGlobalRateLimit(ip, config).allowed, true);
  assert.equal(checkGlobalRateLimit(ip, config).allowed, true);

  const blocked = checkGlobalRateLimit(ip, config);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("global rate limit resets after window expires", () => {
  const ip = "global-test-reset-" + Date.now();

  // Exhaust the limit at t = 0.
  for (let i = 0; i < 3; i++) {
    checkGlobalRateLimit(ip, { limit: 3, windowMs: 10_000, nowMs: 0 });
  }
  assert.equal(
    checkGlobalRateLimit(ip, { limit: 3, windowMs: 10_000, nowMs: 0 }).allowed,
    false,
  );

  // After the window (t = 10_001) the counter should reset.
  const afterWindow = checkGlobalRateLimit(ip, {
    limit: 3,
    windowMs: 10_000,
    nowMs: 10_001,
  });
  assert.equal(afterWindow.allowed, true);
});

test("sweepExpiredEntries removes stale entries", () => {
  const ip = "global-test-sweep-" + Date.now();

  // Create an entry that expires at t = 5000.
  checkGlobalRateLimit(ip, { limit: 10, windowMs: 5_000, nowMs: 0 });

  // Sweep at t = 6000 should remove it — subsequent check should start fresh.
  sweepExpiredEntries(6_000);

  // A new check should be allowed (counter starts from 1 again).
  const fresh = checkGlobalRateLimit(ip, {
    limit: 1,
    windowMs: 5_000,
    nowMs: 6_000,
  });
  assert.equal(fresh.allowed, true);
});

// ---------------------------------------------------------------------------
// H4 — webhook receipt/user cross-check + amount validation (pure logic mirror
// of the helpers in src/app/api/webhook/route.ts).
// ---------------------------------------------------------------------------

function receiptMatchesUser(receipt: unknown, userId: string): boolean {
  if (typeof receipt !== "string" || receipt.length === 0) {
    return false;
  }
  return /^.*_(.+)$/.test(receipt) && receipt.endsWith(`_${userId}`);
}

const MAX_VALID_AMOUNT_PAISE = 10_000_000;
function isValidCapturedAmount(amount: unknown): boolean {
  return (
    typeof amount === "number" &&
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= MAX_VALID_AMOUNT_PAISE
  );
}

test("H4: receipt matching accepts our own receipt shapes", () => {
  const uid = "8f14e45f-ea0a-4b3c-9d2e-1a2b3c4d5e6f";
  assert.equal(receiptMatchesUser(`course_dsa-in-java_${uid}`, uid), true);
  assert.equal(receiptMatchesUser(`note_${uid.slice(0, 8)}-${uid.slice(8)}-${uid.slice(13)}-${uid.slice(18)}-${uid.slice(23)}_${uid}`, uid), true);
});

test("H4: receipt matching rejects mismatched or missing receipts", () => {
  const uid = "8f14e45f-ea0a-4b3c-9d2e-1a2b3c4d5e6f";
  const other = "11111111-2222-3333-4444-555555555555";
  assert.equal(receiptMatchesUser(`course_dsa-in-java_${other}`, uid), false);
  assert.equal(receiptMatchesUser("random-receipt", uid), false);
  assert.equal(receiptMatchesUser("", uid), false);
  assert.equal(receiptMatchesUser(undefined, uid), false);
  assert.equal(receiptMatchesUser(null, uid), false);
});

test("H4: amount validation rejects implausible amounts", () => {
  assert.equal(isValidCapturedAmount(49900), true);
  assert.equal(isValidCapturedAmount(10_000_000), true);
  assert.equal(isValidCapturedAmount(10_000_001), false);
  assert.equal(isValidCapturedAmount(0), false);
  assert.equal(isValidCapturedAmount(-5), false);
  assert.equal(isValidCapturedAmount(1.5), false);
  assert.equal(isValidCapturedAmount("49900"), false);
  assert.equal(isValidCapturedAmount(undefined), false);
});

// ---------------------------------------------------------------------------
// M6 — resolvePostAuthDestination must not honour /admin/* next targets for
// non-admin roles (pure mirror of src/lib/auth-journey logic).
// ---------------------------------------------------------------------------
const ADMIN_ROLES = new Set(["admin", "superadmin"]);
type JourneyProfileLite = { role?: string | null };

function hasAdminJourneyRole(profile: JourneyProfileLite | null | undefined) {
  return Boolean(profile?.role && ADMIN_ROLES.has(profile.role));
}

function resolveSafeAppPathMirror(nextPath: string | null | undefined, fallback = "/") {
  if (!nextPath || !nextPath.startsWith("/")) return fallback;
  if (nextPath.startsWith("//")) return fallback;
  return nextPath;
}

function resolvePostAuthDestinationMirror(
  profile: JourneyProfileLite | null | undefined,
  nextPath: string | null | undefined,
) {
  const safeNextPath = resolveSafeAppPathMirror(nextPath, "/");
  if (safeNextPath === "/admin" || safeNextPath.startsWith("/admin/")) {
    return hasAdminJourneyRole(profile) ? safeNextPath : "/";
  }
  return safeNextPath;
}

test("M6: student role cannot land on /admin via next param", () => {
  assert.equal(resolvePostAuthDestinationMirror({ role: "user" }, "/admin/surfaces"), "/");
  assert.equal(resolvePostAuthDestinationMirror({ role: "senior" }, "/admin"), "/");
  assert.equal(resolvePostAuthDestinationMirror(null, "/admin/users"), "/");
});

test("M6: admin/superadmin roles keep their /admin destination", () => {
  assert.equal(resolvePostAuthDestinationMirror({ role: "admin" }, "/admin/surfaces"), "/admin/surfaces");
  assert.equal(resolvePostAuthDestinationMirror({ role: "superadmin" }, "/admin"), "/admin");
});

test("M6: non-admin paths are unaffected by the role gate", () => {
  assert.equal(resolvePostAuthDestinationMirror({ role: "user" }, "/courses/dsa"), "/courses/dsa");
  assert.equal(resolvePostAuthDestinationMirror({ role: "user" }, "//evil.com"), "/");
});

// ── M2: cross-subdomain SSO cookie domain integration tests ─────────────
// getSupabaseCookieOptions must keep the wide `.lerengo`-style domain for
// any request whose host is a subdomain of the derived root (so sessions
// work across skillgo./campusgo./admin.), and must fall back to host-scoped
// cookies when the request host belongs to a different domain entirely
// (e.g. *.vercel.app previews) so browsers don't silently drop cookies.
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

test("M2: apex host keeps wide cookie domain", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://lerengo.com";
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  const opts = getSupabaseCookieOptions("lerengo.com");
  assert.equal(opts.domain, ".lerengo.com");
});

test("M2: known subdomain request keeps wide cookie domain (cross-subdomain SSO)", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://lerengo.com";
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  for (const host of ["skillgo.lerengo.com", "campusgo.lerengo.com", "admin.lerengo.com"]) {
    const opts = getSupabaseCookieOptions(host);
    assert.equal(opts.domain, ".lerengo.com", `subdomain ${host} must share the wide cookie domain`);
  }
});

test("M2: unrelated preview host falls back to host-scoped cookies", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://lerengo.com";
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  const opts = getSupabaseCookieOptions("my-app-git-preview.vercel.app");
  assert.equal(opts.domain, undefined);
});

test("M2: explicit cookie domain env override wins", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://lerengo.com";
  process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN = "auth.example.net";
  const opts = getSupabaseCookieOptions("skillgo.lerengo.com");
  // Request host doesn't match the explicit domain -> safe host-scoped fallback.
  assert.equal(opts.domain, undefined);
  // Request host is under the explicit domain itself -> wide domain kept.
  const sameRoot = getSupabaseCookieOptions("app.auth.example.net");
  assert.equal(sameRoot.domain, ".auth.example.net");
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
});

test("M2: localhost dev never sets a cookie domain", () => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  const opts = getSupabaseCookieOptions("localhost");
  assert.equal(opts.domain, undefined);
  assert.equal(opts.secure, false);
});
