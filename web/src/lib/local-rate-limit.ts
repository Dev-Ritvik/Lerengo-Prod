type LocalRateLimitEntry = {
  count: number;
  resetAtMs: number;
};

type RateLimitParams = {
  key: string;
  limit: number;
  nowMs?: number;
  windowMs: number;
};

const RATE_LIMIT_STORE_KEY = "__lerengoRouteRateLimitStore";

function getRateLimitStore() {
  const scope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, LocalRateLimitEntry>;
  };

  if (!scope[RATE_LIMIT_STORE_KEY]) {
    scope[RATE_LIMIT_STORE_KEY] = new Map<string, LocalRateLimitEntry>();
  }

  return scope[RATE_LIMIT_STORE_KEY];
}

/**
 * Resolve the client IP for rate-limit keying.
 *
 * SECURITY NOTE: `cf-connecting-ip`, `x-forwarded-for` and `x-real-ip` are
 * set legitimately by Cloudflare / Vercel / well-configured reverse proxies,
 * but they are trivially spoofable when the app is exposed directly (or
 * behind a proxy that does not strip inbound copies of these headers).
 * Trusting them unconditionally lets an attacker rotate header values to
 * obtain unlimited independent rate-limit buckets.
 *
 * Therefore header trust is opt-in via TRUST_PROXY_HEADERS=true. When it is
 * off (the safe default), every request shares the single "shared" bucket —
 * coarse, but never bypassable via header spoofing. Deployments behind a
 * trusted proxy (Vercel, Cloudflare) should set the flag to regain per-IP
 * granularity.
 */
export function resolveClientIp(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.TRUST_PROXY_HEADERS !== "true") {
    return "shared";
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return cfConnectingIp || forwardedFor || realIp || "unknown";
}

export function checkLocalRateLimit(params: RateLimitParams) {
  const nowMs = params.nowMs ?? Date.now();
  const store = getRateLimitStore();
  const existing = store.get(params.key);

  if (!existing || existing.resetAtMs <= nowMs) {
    store.set(params.key, {
      count: 1,
      resetAtMs: nowMs + params.windowMs,
    });

    return {
      allowed: true as const,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAtMs - nowMs) / 1000),
      ),
    };
  }

  store.set(params.key, {
    ...existing,
    count: existing.count + 1,
  });

  return {
    allowed: true as const,
    retryAfterSeconds: 0,
  };
}

// ---------------------------------------------------------------------------
// Global (middleware-level) rate limiting
// ---------------------------------------------------------------------------

const GLOBAL_RATE_LIMIT_STORE_KEY = "__lerengoGlobalRateLimitStore";

function getGlobalRateLimitStore() {
  const scope = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_STORE_KEY]?: Map<string, LocalRateLimitEntry>;
  };

  if (!scope[GLOBAL_RATE_LIMIT_STORE_KEY]) {
    scope[GLOBAL_RATE_LIMIT_STORE_KEY] = new Map<string, LocalRateLimitEntry>();
  }

  return scope[GLOBAL_RATE_LIMIT_STORE_KEY];
}

/**
 * Remove expired entries from the global store to prevent unbounded memory
 * growth. Called lazily on every global rate-limit check — the iteration cost
 * is negligible compared to the network I/O the middleware already performs.
 */
export function sweepExpiredEntries(nowMs?: number) {
  const now = nowMs ?? Date.now();
  const store = getGlobalRateLimitStore();

  for (const [key, entry] of store) {
    if (entry.resetAtMs <= now) {
      store.delete(key);
    }
  }
}

export type GlobalRateLimitConfig = {
  /** Maximum requests per window. Default: 300 */
  limit?: number;
  /** Testing override for Date.now(). */
  nowMs?: number;
  /** Window duration in milliseconds. Default: 60 000 (1 minute) */
  windowMs?: number;
};

export function checkGlobalRateLimit(
  ip: string,
  config?: GlobalRateLimitConfig,
) {
  const windowMs = config?.windowMs ?? 60_000;
  const limit = config?.limit ?? 300;
  const nowMs = config?.nowMs ?? Date.now();

  // Lazy sweep on every check — lightweight for typical store sizes.
  sweepExpiredEntries(nowMs);

  const store = getGlobalRateLimitStore();
  const existing = store.get(ip);

  if (!existing || existing.resetAtMs <= nowMs) {
    store.set(ip, { count: 1, resetAtMs: nowMs + windowMs });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAtMs - nowMs) / 1000),
      ),
    };
  }

  store.set(ip, { ...existing, count: existing.count + 1 });
  return { allowed: true as const, retryAfterSeconds: 0 };
}
