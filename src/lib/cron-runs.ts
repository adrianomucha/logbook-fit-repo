import prisma from "@/lib/prisma";

/**
 * Durable record of scheduled-job runs (the `cron_runs` table).
 *
 * The nightly sweep used to leave no trace beyond a per-deploy Vercel log
 * line, so a cron that silently stopped — rotated CRON_SECRET, schedule
 * dropped from vercel.json, a deploy that never picked it up — looked exactly
 * like a quiet night. Each run now writes a row on start and updates it on
 * finish; /admin/health reads the latest row per job and raises an outage
 * when it is older than the schedule allows (see `cronHealth`).
 */

/** Scheduled jobs known to the app. Add a member when wiring a second cron. */
export const CRON_JOBS = {
  checkIns: "check-ins",
} as const;

export type CronJob = (typeof CRON_JOBS)[keyof typeof CRON_JOBS];

type JsonSummary = Record<string, string | number | boolean | null>;

/**
 * Runs `work` and records the attempt. Writes a row before starting so an
 * invocation that dies mid-flight (function timeout) still shows up as an
 * open run rather than nothing at all. Rethrows the job's error after
 * recording it so the route can answer 500 as before.
 *
 * Bookkeeping failures never mask the job's own outcome: if the database
 * write itself fails, the job still runs and the error is logged.
 */
export async function recordCronRun<T extends JsonSummary>(
  job: CronJob,
  work: () => Promise<T>,
  /** Decides whether a completed result counts as healthy. Default: always. */
  isOk: (result: T) => boolean = () => true
): Promise<T> {
  const run = await prisma.cronRun
    .create({ data: { job }, select: { id: true } })
    .catch((error) => {
      console.error("[CRON] Could not record run start:", error);
      return null;
    });

  const finish = async (data: {
    ok: boolean;
    summary?: JsonSummary;
    error?: string;
  }) => {
    if (!run) return;
    await prisma.cronRun
      .update({
        where: { id: run.id },
        data: { finishedAt: new Date(), ...data },
      })
      .catch((error) => {
        console.error("[CRON] Could not record run finish:", error);
      });
  };

  try {
    const result = await work();
    await finish({ ok: isOk(result), summary: result });
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    await finish({ ok: false, error: message.slice(0, 2000) });
    throw error;
  }
}

/** The most recent run per job, newest first, plus a short history. */
export async function latestCronRuns(job: CronJob, take = 10) {
  return prisma.cronRun.findMany({
    where: { job },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      ok: true,
      summary: true,
      error: true,
    },
  });
}
