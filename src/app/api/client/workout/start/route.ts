import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  workoutService,
  ValidationError,
} from "@/lib/services/workout";
import { parseBody } from "@/lib/validations/parseBody";
import { startWorkoutSchema } from "@/lib/validations/schemas";

/**
 * POST /api/client/workout/start
 * Starts a workout by creating a WorkoutCompletion record (status: IN_PROGRESS).
 * Also pre-creates SetCompletion rows for every set of every exercise.
 */
export const POST = withClient(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const result = await parseBody(req, startWorkoutSchema);
    if (!result.success) return result.response;
    const { dayId } = result.data;

    try {
      const { completion, created } = await workoutService.start(
        { role: "client", clientProfileId },
        { dayId }
      );

      if (!created) {
        return NextResponse.json(
          { id: completion.id, status: completion.status, message: "Workout already started" },
          { status: 200 }
        );
      }

      return NextResponse.json(completion, { status: 201 });
    } catch (e) {
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }
);
