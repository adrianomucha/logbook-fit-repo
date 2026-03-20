import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  WorkoutNotFoundError,
  ValidationError,
} from "@/lib/services/workout";

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
    const body = await req.json();
    const { sets } = body as {
      sets?: {
        workoutExerciseId: string;
        setNumber: number;
        completed: boolean;
        actualWeight?: number;
        actualReps?: number;
      }[];
    };

    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      return NextResponse.json(
        { error: "sets array is required" },
        { status: 400 }
      );
    }

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
