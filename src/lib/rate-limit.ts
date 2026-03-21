/**
 * Simple in-memory sliding-window rate limiter.
 * Works in Node.js runtime (required by Prisma-based routes).
 *
 * Upgrade path: swap to @upstash/ratelimit for distributed limiting
 * without changing the consumer API.
 */

type RateLimitConfig = {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type Entry = { count: number; resetAt: number };

const stores = new Map<string, Map<string, Entry>>();

function getStore(name: string): Map<string, Entry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

/**
 * Creates a rate limiter instance.
 * Returns a `check(key)` function that tracks and enforces limits.
 */
export function rateLimit(name: string, config: RateLimitConfig) {
  const store = getStore(name);

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  };
}

/**
 * Extract client IP from request headers (Vercel / reverse proxy).
 */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// Pre-configured limiters for auth-sensitive endpoints
export const signupLimiter = rateLimit("signup", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

export const loginLimiter = rateLimit("login", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

export const inviteLimiter = rateLimit("invite", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const store of stores.values()) {
      for (const [key, entry] of store) {
        if (now > entry.resetAt) {
          store.delete(key);
        }
      }
    }
  }, 5 * 60 * 1000);
}
