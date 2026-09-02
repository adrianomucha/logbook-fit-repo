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

// The _ALERT] suffix matches the other alert tags ([EMAIL_ALERT] etc.) so one
// log alert on "_ALERT]" catches every silently-degraded subsystem.
if (!hasUpstash && process.env.NODE_ENV === "production") {
  console.error(
    "[RATE-LIMIT_ALERT] Upstash env vars not set — using per-instance in-memory limits, which are ineffective on serverless. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* equivalents)."
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
        // Alert-tagged because while it lasts, rate limiting is off.
        console.error("[RATE-LIMIT_ALERT] Upstash check failed, allowing request:", error);
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

export const waitlistLimiter = rateLimit("waitlist", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

// Reset requests are keyed by IP + email: tight enough that one address
// can't be flooded with reset mail, without one shared office IP starving
// everyone. The confirm side is keyed by IP alone — its failure mode is
// token guessing, not mail volume — and sized like login.
export const passwordResetRequestLimiter = rateLimit("pw-reset-request", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
});

export const passwordResetConfirmLimiter = rateLimit("pw-reset-confirm", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

// Crash reports from the error boundaries: enough for a genuine render-loop
// crash, tight enough that the endpoint can't be used to flood the logs.
export const clientErrorLimiter = rateLimit("client-error", {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
});

// Verifying the current password is a bcrypt oracle, so keep the budget
// tight. Keyed by user id (the endpoint is authenticated): a stolen session
// can't grind at the password, and a shared IP doesn't lock anyone else out.
export const changePasswordLimiter = rateLimit("change-password", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

// Avatar uploads move megabytes into storage, so one account can't fill the
// bucket in a loop. Keyed by user id (the endpoint is authenticated).
export const avatarUploadLimiter = rateLimit("avatar-upload", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});

// Feedback is authenticated, so this is keyed by user id rather than IP:
// generous enough for someone on a bug-reporting spree, tight enough that
// one account can't fill the admin inbox.
export const feedbackLimiter = rateLimit("feedback", {
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
