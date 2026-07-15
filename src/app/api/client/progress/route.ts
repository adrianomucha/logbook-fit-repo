import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import { workoutService } from "@/lib/services/workout";

/**
 * GET /api/client/progress
 * Returns recent workout history and stats for the client.
 * Last 7 days of completions + overall stats.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    // Roll abandoned sessions into history first so they count toward the
    // stats and show up in the list at their partial completion percentage.
    await workoutService
      .finalizeStaleSessions(clientProfileId)
      .catch((err) => console.error("finalizeStaleSessions failed", err));

    const progress = await workoutService.getProgress({
      role: "client",
      clientProfileId,
    });
    return NextResponse.json(progress);
  }
);
