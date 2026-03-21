import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  ValidationError,
} from "@/lib/services/workout";
import { parseBody } from "@/lib/validations/parseBody";
import { flagExerciseSchema } from "@/lib/validations/schemas";

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
    const result = await parseBody(req, flagExerciseSchema);
    if (!result.success) return result.response;
    const { workoutExerciseId, note } = result.data;

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
