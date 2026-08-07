import { NextResponse } from "next/server";
import { bearerToken, isValidCronToken } from "@/lib/admin";
import { runScheduledCheckIns } from "@/lib/checkin-schedule";

/**
 * Scheduled check-in sweep. Wired to a nightly Vercel cron (see vercel.json),
 * which authenticates with `Authorization: Bearer $CRON_SECRET`.
 *
 * This endpoint is what makes the weekly check-in promise true. Scheduling
 * used to be materialized only when a coach opened a client's profile or a
 * client opened their check-ins tab — so a client who stopped opening the app
 * silently stopped being checked on, which is precisely the fade the product
 * exists to catch.
 *
 * GET and POST both run it: Vercel Cron issues GET, while a human re-running
 * it by hand (or a future queue) naturally reaches for POST.
 */
async function handle(req: Request) {
  if (!isValidCronToken(bearerToken(req))) {
    return NextResponse.json(
      {
        error: process.env.CRON_SECRET
          ? "Unauthorized"
          : "Unauthorized — CRON_SECRET is not set on this deployment, so scheduled check-ins never run.",
      },
      { status: 401 }
    );
  }

  try {
    const result = await runScheduledCheckIns();
    // Logged so a quiet sweep is still visible in the deploy's logs; the
    // alert tag fires only when a client actually failed.
    console.log("[CRON] Check-in sweep:", JSON.stringify(result));
    if (result.failures > 0) {
      console.error(
        `[CRON_ALERT] Check-in sweep finished with ${result.failures} failure(s).`
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON_ALERT] Check-in sweep failed:", error);
    return NextResponse.json(
      { error: "Check-in sweep failed" },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
