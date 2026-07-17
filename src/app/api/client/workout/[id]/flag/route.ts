import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  InvalidStateError,
  ValidationError,
} from "@/lib/services/workout";
import { parseBody } from "@/lib/validations/parseBody";
import {
  flagExerciseSchema,
  unflagExerciseSchema,
} from "@/lib/validations/schemas";

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
      if (e instanceof InvalidStateError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }
);

/**
 * DELETE /api/client/workout/[id]/flag
 * Removes an exercise's flag. Without this, an optimistically-removed flag
 * resurrects on the next revalidation.
 * Accepts: { workoutExerciseId }
 */
export const DELETE = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const result = await parseBody(req, unflagExerciseSchema);
    if (!result.success) return result.response;
    const { workoutExerciseId } = result.data;

    try {
      await workoutService.unflagExercise(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id, workoutExerciseId }
      );
      return NextResponse.json({ success: true });
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
