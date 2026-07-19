/**
 * Sliding-window rate limiter.
 *
 * Uses Upstash Redis (distributed, survives cold starts and scales across
 * lambda instances) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are set. Falls back to a per-instance in-memory limiter otherwise — fine
 * for local dev, but on serverless every instance gets its own budget, so
 * production should always run with Upstash configured.
 */
import crypto from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

// The Vercel Marketplace integration injects KV_-prefixed names; a database
// created directly in the Upstash console uses UPSTASH_-prefixed ones.
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const hasUpstash = Boolean(redisUrl && redisToken);

if (!hasUpstash && process.env.NODE_ENV === "production") {
  console.warn(
    "[RATE-LIMIT] Upstash env vars not set — using per-instance in-memory limits, which are ineffective on serverless. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* equivalents)."
  );
}

const redis = hasUpstash
  ? new Redis({ url: redisUrl!, token: redisToken! })
  : null;

// ──────────────────────────────────────
// In-memory fallback (dev / test)
// ──────────────────────────────────────

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

function memoryCheck(name: string, config: RateLimitConfig, key: string): RateLimitResult {
  const store = getStore(name);
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
}

/**
 * Rate-limit keys carry PII (login keys contain the attempted email, others
 * the client IP). Hash every key before use so raw identifiers are never
 * persisted — in particular not in Upstash, an external service. HMAC-keyed
 * with NEXTAUTH_SECRET so a leaked Redis snapshot can't be dictionary-attacked
 * back to emails. Same input still maps to the same bucket, so limiting
 * behavior is unchanged.
 */
function pseudonymizeKey(key: string): string {
  return crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "rate-limit")
    .update(key)
    .digest("base64url")
    .slice(0, 32);
}

// ──────────────────────────────────────
// Limiter factory
// ──────────────────────────────────────

/**
 * Creates a rate limiter instance.
 * Returns an async `check(key)` function that tracks and enforces limits.
 */
export function rateLimit(name: string, config: RateLimitConfig) {
  const upstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          config.maxRequests,
          `${config.windowMs} ms`
        ),
        prefix: `ratelimit:${name}`,
      })
    : null;

  return async function check(rawKey: string): Promise<RateLimitResult> {
    const key = pseudonymizeKey(rawKey);

    if (upstashLimiter) {
      try {
        const result = await upstashLimiter.limit(key);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetAt: result.reset,
        };
      } catch (error) {
        // Fail open: a Redis outage shouldn't lock everyone out of login.
        console.error("[RATE-LIMIT] Upstash check failed, allowing request:", error);
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetAt: Date.now() + config.windowMs,
        };
      }
    }

    return memoryCheck(name, config, key);
  };
}

/**
 * Resolve the real client IP from a header lookup function.
 *
 * A raw `x-forwarded-for` is NOT trustworthy for rate limiting: a client can
 * send any value, and Vercel's proxy *appends* the real connecting IP to the
 * end of whatever the client supplied. So the FIRST entry is attacker-
 * controlled — reading it lets an attacker rotate the value on every request
 * and drop each attempt into a fresh limiter bucket, uncapping brute force
 * (CWE-290 / CWE-307).
 *
 * We therefore trust, in order:
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge, not forgeable.
 *   2. `x-real-ip` — also set by the platform proxy.
 *   3. the LAST `x-forwarded-for` entry — the hop appended by the trusted
 *      proxy, i.e. the real client as seen by Vercel (fallback for local dev
 *      and non-Vercel proxies).
 */
function resolveClientIp(getHeader: (name: string) => string | null | undefined): string {
  const trusted =
    getHeader("x-vercel-forwarded-for")?.trim() || getHeader("x-real-ip")?.trim();
  if (trusted) return trusted;

  const forwarded = getHeader("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

/**
 * Extract client IP from a Web `Request` (Vercel / reverse proxy).
 * See resolveClientIp for why the last forwarded entry is used.
 */
export function getClientIp(req: Request): string {
  return resolveClientIp((name) => req.headers.get(name));
}

/**
 * Extract client IP from a plain headers record, e.g. NextAuth's
 * `authorize(credentials, req)` where `req.headers` is a lowercased object
 * rather than a `Headers` instance.
 */
export function getClientIpFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined | null
): string {
  return resolveClientIp((name) => {
    const value = headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  });
}

// Pre-configured limiters for auth-sensitive endpoints
export const signupLimiter = rateLimit("signup", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

// Per (IP + email) login cap. Stops a single client hammering one account.
export const loginLimiter = rateLimit("login", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

// Per-email login cap, independent of IP. Even if an attacker rotates source
// IPs (e.g. via forged/rotated X-Forwarded-For or a botnet), guessing against
// a single account stays bounded. The window is generous enough that a real
// user fumbling their password won't trip it, but tight enough to keep online
// guessing infeasible; bcrypt remains the backstop. Trade-off: an attacker can
// briefly lock a known victim out of their own account, which we accept as far
// less damaging than uncapped credential stuffing.
export const loginEmailLimiter = rateLimit("login-email", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
});

export const inviteLimiter = rateLimit("invite", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});

export const waitlistLimiter = rateLimit("waitlist", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

// Periodic cleanup of expired in-memory entries (every 5 minutes)
if (!hasUpstash && typeof setInterval !== "undefined") {
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
