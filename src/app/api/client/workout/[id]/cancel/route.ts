import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  InvalidStateError,
} from "@/lib/services/workout";

/**
 * POST /api/client/workout/[id]/cancel
 * Discards an untouched workout completion — deletes the record (sets/flags
 * cascade) so the day returns to "not started" instead of lingering in
 * IN_PROGRESS. Rejected once any set has been completed, and for COMPLETED
 * workouts.
 */
export const POST = withClient(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    try {
      const result = await workoutService.cancel(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id }
      );
      return NextResponse.json(result);
    } catch (e) {
      if (e instanceof WorkoutNotFoundError) {
        return NextResponse.json({ error: "Workout not found" }, { status: 404 });
      }
      if (e instanceof InvalidStateError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }
);
