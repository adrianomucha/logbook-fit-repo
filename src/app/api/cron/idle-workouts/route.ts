import { NextResponse } from "next/server";
import { bearerToken, isValidCronToken } from "@/lib/admin";
import { runIdleWorkoutSweep } from "@/lib/idle-workouts";
import { CRON_JOBS, recordCronRun } from "@/lib/cron-runs";

/**
 * Idle workout sweep: nudges clients who left a workout open, and finishes
 * it for them once it has sat overnight (see lib/idle-workouts.ts).
 *
 * Two callers, both with `Authorization: Bearer $CRON_SECRET`:
 *  - Supabase pg_cron, every 15 minutes (setup in DEVELOPMENT.md). This is
 *    what makes the nudge arrive about 90 minutes after the last set.
 *  - Vercel Cron, once a day (vercel.json). The free plan allows no more, so
 *    on its own it only closes sessions; it is the backstop if pg_cron stops.
 *
 * Overlapping runs are safe: each nudge and each auto-finish is claimed with
 * a conditional update, so a session is acted on once.
 */
async function handle(req: Request) {
  if (!isValidCronToken(bearerToken(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordCronRun(
      CRON_JOBS.idleWorkouts,
      () => runIdleWorkoutSweep(),
      (r) => r.failures === 0
    );
    if (result.nudged > 0 || result.autoFinished > 0 || result.failures > 0) {
      console.log("[CRON] Idle workout sweep:", JSON.stringify(result));
    }
    if (result.failures > 0) {
      console.error(
        `[CRON_ALERT] Idle workout sweep finished with ${result.failures} failure(s).`
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON_ALERT] Idle workout sweep failed:", error);
    return NextResponse.json({ error: "Idle workout sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
