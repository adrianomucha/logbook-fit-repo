import prisma from "@/lib/prisma";
import { emailConfigStatus } from "@/lib/services/email";
import { envProblems } from "@/lib/env-check";
import { pingRateLimitStore } from "@/lib/rate-limit";
import { CRON_JOBS, latestCronRuns } from "@/lib/cron-runs";

/**
 * Live health of the deployment's dependencies, for /admin/health.
 *
 * The env banner in the admin layout already catches *configuration* that is
 * missing. This module covers the other half — things that are configured
 * but not working: a database that won't answer, a Redis whose token was
 * revoked, a cron that has quietly stopped firing. Every check is bounded by
 * a timeout so one hung dependency can't take the health page down with it.
 */

export type HealthLevel = "ok" | "warn" | "down";

export type HealthCheck = {
  /** Stable identifier, e.g. "database". */
  id: string;
  label: string;
  level: HealthLevel;
  /** One line a human can act on. */
  detail: string;
  /** Round-trip time of the live probe, when one ran. */
  latencyMs?: number;
};

const PROBE_TIMEOUT_MS = 4000;

/** The nightly sweep runs at 09:00 UTC; anything older than this is missing. */
export const CRON_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

async function timed<T>(
  probe: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      probe(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`No answer within ${PROBE_TIMEOUT_MS} ms`)),
          PROBE_TIMEOUT_MS
        );
      }),
    ]);
    return { result, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function checkDatabase(): Promise<HealthCheck> {
  try {
    const { latencyMs } = await timed(() => prisma.$queryRaw`SELECT 1`);
    return {
      id: "database",
      label: "Database",
      level: "ok",
      detail: "Postgres answered.",
      latencyMs,
    };
  } catch (error) {
    return {
      id: "database",
      label: "Database",
      level: "down",
      detail: `Postgres did not answer: ${errorText(error)}`,
    };
  }
}

export async function checkRedis(): Promise<HealthCheck> {
  const base = { id: "redis", label: "Rate limiting (Upstash Redis)" };
  try {
    const { result, latencyMs } = await timed(pingRateLimitStore);
    if (result === "unconfigured") {
      return {
        ...base,
        level: process.env.NODE_ENV === "production" ? "down" : "warn",
        detail:
          "Not configured — limits are per-instance in-memory, which is effectively off on serverless.",
      };
    }
    return { ...base, level: "ok", detail: "Redis answered.", latencyMs };
  } catch (error) {
    return {
      ...base,
      level: "down",
      detail: `Redis did not answer, so every limiter is failing open: ${errorText(error)}`,
    };
  }
}

/** Mailer is config-only: there is no way to probe Resend without sending. */
export function checkMailer(): HealthCheck {
  const status = emailConfigStatus();
  return status.ok
    ? {
        id: "mailer",
        label: "Email (Resend)",
        level: "ok",
        detail: "Configured. Sends are best-effort; failures log [EMAIL_ALERT].",
      }
    : { id: "mailer", label: "Email (Resend)", level: "down", detail: status.reason };
}

/**
 * Same posture as the admin layout's banner: in production every missing
 * variable is an outage; in dev, Redis and NEXTAUTH_URL are expected to be
 * absent, so the row only warns.
 */
export function checkEnv(): HealthCheck {
  const problems = envProblems();
  return problems.length === 0
    ? {
        id: "env",
        label: "Environment",
        level: "ok",
        detail: "Every required variable is set.",
      }
    : {
        id: "env",
        label: "Environment",
        level: process.env.NODE_ENV === "production" ? "down" : "warn",
        detail: problems.join(" "),
      };
}

export type CronRunLike = {
  startedAt: Date;
  finishedAt: Date | null;
  ok: boolean | null;
  error: string | null;
};

/**
 * Classifies the nightly sweep from its most recent recorded run. Pure, so
 * the staleness rules are unit-testable without a database.
 */
export function cronHealth(
  latest: CronRunLike | null | undefined,
  now: Date = new Date()
): Pick<HealthCheck, "level" | "detail"> {
  if (!latest) {
    return {
      level: "warn",
      detail:
        "No run recorded yet. Expected nightly at 09:00 UTC; the first run after this deploy will appear here.",
    };
  }

  const ageMs = now.getTime() - latest.startedAt.getTime();
  const ageHours = Math.floor(ageMs / 3_600_000);

  if (ageMs > CRON_STALE_AFTER_MS) {
    return {
      level: "down",
      detail: `Last run started ${ageHours}h ago — the nightly sweep has missed at least one night. Check CRON_SECRET and the schedule in vercel.json.`,
    };
  }

  if (!latest.finishedAt) {
    // A run that started recently may still be going; one that never
    // finished hours ago hit a function timeout.
    return ageMs > 15 * 60_000
      ? {
          level: "warn",
          detail: `Last run started ${ageHours}h ago and never finished — it likely hit the function timeout.`,
        }
      : { level: "ok", detail: "A run is in progress." };
  }

  if (latest.ok === false) {
    return {
      level: "warn",
      detail: latest.error
        ? `Last run failed: ${latest.error}`
        : "Last run finished with failures for at least one client — see the run log below.",
    };
  }

  return {
    level: "ok",
    detail: `Last run finished ${ageHours < 1 ? "under an hour" : `${ageHours}h`} ago.`,
  };
}

export async function checkCron(): Promise<HealthCheck> {
  const base = { id: "cron", label: "Nightly check-in sweep" };
  try {
    const [latest] = await latestCronRuns(CRON_JOBS.checkIns, 1);
    return { ...base, ...cronHealth(latest) };
  } catch (error) {
    return {
      ...base,
      level: "down",
      detail: `Could not read the run log: ${errorText(error)}`,
    };
  }
}

/** Every check, run concurrently. Order is the display order. */
export async function runHealthChecks(): Promise<HealthCheck[]> {
  const [database, redis, cron] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkCron(),
  ]);
  return [database, redis, checkMailer(), cron, checkEnv()];
}

/** The worst level across a set of checks. */
export function overallLevel(checks: HealthCheck[]): HealthLevel {
  if (checks.some((c) => c.level === "down")) return "down";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "ok";
}
