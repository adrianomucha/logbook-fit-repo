import { emailConfigStatus } from "@/lib/services/email";

/**
 * Production env sanity check.
 *
 * Several subsystems degrade *silently* when their env vars are missing —
 * the mailer skips every send, rate limiting falls back to per-instance
 * memory, /admin 404s for everyone, and emailed links point at the wrong
 * host. Each of those failure modes is invisible from the outside, so this
 * module gives them one loud shared surface: a banner on every /admin page
 * and an [ENV_ALERT]-tagged log line per problem (one Vercel log alert on
 * "_ALERT]" catches these plus [EMAIL_ALERT] and [RATE-LIMIT_ALERT]).
 */

const ALERT_TAG = "[ENV_ALERT]";

/**
 * Every detectable misconfiguration, as human-readable sentences. Pure env
 * inspection — safe to call from a server component on every render.
 */
export function envProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];

  const mailer = emailConfigStatus();
  if (!mailer.ok) {
    problems.push(mailer.reason);
  }

  const hasAdmin = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .some((entry) => entry.trim().length > 0);
  if (!hasAdmin) {
    problems.push(
      "ADMIN_EMAILS is not set — every /admin page returns 404 for everyone and no beta invites can be sent."
    );
  }

  const hasRedis = Boolean(
    (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL) &&
      (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)
  );
  if (!hasRedis) {
    problems.push(
      "Upstash Redis is not configured — rate limiting is per-instance in-memory, which is effectively off on serverless. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  if (!env.NEXTAUTH_URL) {
    problems.push(
      "NEXTAUTH_URL is not set — emailed links (password resets, beta invites) fall back to the per-deploy *.vercel.app hostname, or localhost outside Vercel."
    );
  }

  return problems;
}

let reported = false;

/**
 * Log every current env problem, once per server instance. Production
 * runtime only: dev is expected to run without the mailer or Redis, and
 * `next build` imports server modules with NODE_ENV=production but without
 * runtime env, which would make every build log a false alarm.
 */
export function reportEnvProblemsOnce(): void {
  if (reported) return;
  reported = true;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  for (const problem of envProblems()) {
    console.error(`${ALERT_TAG} ${problem}`);
  }
}
