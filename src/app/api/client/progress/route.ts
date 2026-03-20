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
    const progress = await workoutService.getProgress({
      role: "client",
      clientProfileId,
    });
    return NextResponse.json(progress);
  }
);
