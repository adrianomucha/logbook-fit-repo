import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  InvalidStateError,
} from "@/lib/services/workout";

/**
 * POST /api/client/workout/[id]/finish
 * Completes a workout — calculates completionPct and marks status as COMPLETED.
 * Accepts optional: { effortRating: "EASY" | "MEDIUM" | "HARD" }
 */
export const POST = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const body = await req.json().catch(() => ({}));
    const { effortRating } = body as { effortRating?: string };

    try {
      const updated = await workoutService.finish(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id, effortRating }
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
