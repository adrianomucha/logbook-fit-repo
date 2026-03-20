import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  InvalidStateError,
} from "@/lib/services/workout";

/**
 * POST /api/client/workout/[id]/restart
 * Resets a workout completion — deletes all sets/flags, resets status to IN_PROGRESS,
 * and re-creates SetCompletion rows for a fresh start.
 */
export const POST = withClient(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    try {
      const updated = await workoutService.restart(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id }
      );
      return NextResponse.json(updated);
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
