import { NextResponse } from "next/server";
import { bearerToken, isValidCronToken } from "@/lib/admin";
import { CRON_JOBS, recordCronRun } from "@/lib/cron-runs";
import { runSetupCallNudges } from "@/lib/setup-call-nudge";

// A full batch at the mailer's pace (lib/setup-call-nudge.ts) takes about 30s
export const maxDuration = 60;

/**
 * Daily "book your setup call" reminder to waitlist coaches who didn't book
 * (see lib/setup-call-nudge.ts). Wired to a Vercel cron at 17:00 UTC
 * (vercel.json), morning in the Americas and evening in Europe, which
 * authenticates with `Authorization: Bearer $CRON_SECRET`.
 *
 * Every invocation is recorded in `cron_runs` (see lib/cron-runs.ts).
 */
async function handle(req: Request) {
  if (!isValidCronToken(bearerToken(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordCronRun(
      CRON_JOBS.setupCallNudges,
      () => runSetupCallNudges(),
      (r) => r.failures === 0
    );
    if (result.sent > 0 || result.failures > 0) {
      console.log("[CRON] Setup call nudges:", JSON.stringify(result));
    }
    if (result.failures > 0) {
      console.error(
        `[CRON_ALERT] Setup call nudges finished with ${result.failures} failure(s).`
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON_ALERT] Setup call nudges failed:", error);
    return NextResponse.json({ error: "Setup call nudges failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
