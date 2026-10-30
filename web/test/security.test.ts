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

test("client IP resolution prefers forwarded headers", () => {
  const request = new Request("https://lerengo.test/api/example", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 203.0.113.11",
      "x-real-ip": "198.51.100.20",
    },
  });

  assert.equal(resolveClientIp(request), "203.0.113.10");
});

test("client IP resolution prioritizes cf-connecting-ip over spoofed forwarded-for", () => {
  const request = new Request("https://lerengo.test/api/example", {
    headers: {
      "cf-connecting-ip": "198.51.100.99",
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    },
  });

  assert.equal(resolveClientIp(request), "198.51.100.99");
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
