import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  ValidationError,
} from "@/lib/services/workout";

/**
 * POST /api/client/workout/[id]/flag
 * Flags an exercise within a workout — creates or updates an ExerciseFlag record.
 * Accepts: { workoutExerciseId, note?: string }
 */
export const POST = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const body = await req.json();
    const { workoutExerciseId, note } = body as {
      workoutExerciseId?: string;
      note?: string;
    };

    if (!workoutExerciseId) {
      return NextResponse.json(
        { error: "workoutExerciseId is required" },
        { status: 400 }
      );
    }

    try {
      const flag = await workoutService.flagExercise(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id, workoutExerciseId, note }
      );
      return NextResponse.json(flag);
    } catch (e) {
      if (e instanceof WorkoutNotFoundError) {
        return NextResponse.json({ error: "Workout not found" }, { status: 404 });
      }
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }
);
