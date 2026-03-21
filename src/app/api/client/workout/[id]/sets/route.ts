import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  ValidationError,
} from "@/lib/services/workout";
import { parseBody } from "@/lib/validations/parseBody";
import { updateSetsSchema } from "@/lib/validations/schemas";

/**
 * PUT /api/client/workout/[id]/sets
 * Batch upsert set completions. Hot path — called on every set toggle (debounced 500ms).
 * Accepts: { sets: [{ workoutExerciseId, setNumber, completed, actualWeight?, actualReps? }] }
 */
export const PUT = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const result = await parseBody(req, updateSetsSchema);
    if (!result.success) return result.response;
    const { sets } = result.data;

    try {
      await workoutService.updateSets(
        { role: "client", clientProfileId },
        { completionId: ctx.params.id, sets }
      );
      return NextResponse.json({ success: true });
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
