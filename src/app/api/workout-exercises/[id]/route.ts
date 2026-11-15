import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { markPlanEdited } from "@/lib/plan-edits";
import { verifyCoachOwnership } from "@/lib/scoping";
import { REPLACE_EXERCISE } from "@logbook/shared/coach-copy";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { updateWorkoutExerciseSchema } from "@/lib/validations/schemas";

/**
 * Helper to verify a workout exercise belongs to a plan owned by this coach.
 */
async function verifyWorkoutExerciseOwnership(
  workoutExerciseId: string,
  coachProfileId: string
) {
  const we = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    include: {
      day: {
        include: {
          week: {
            include: {
              plan: { select: { id: true, coachId: true, deletedAt: true } },
            },
          },
        },
      },
    },
  });

  if (!we || we.day.week.plan.coachId !== coachProfileId || we.day.week.plan.deletedAt !== null) {
    return null;
  }
  return we;
}

/**
 * PUT /api/workout-exercises/[id]
 * Updates a workout exercise (sets, reps, weight, rest, notes, order).
 * Sending a different exerciseId swaps which exercise the row is: only for
 * one in the coach's own library, and only while the client has logged
 * nothing on it. Their sets and flags hang off this row, so swapping it
 * later would rename work they already did.
 */
export const PUT = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const weId = ctx.params.id;
    const we = await verifyWorkoutExerciseOwnership(weId, coachProfileId);
    if (!we) {
      return NextResponse.json({ error: "Workout exercise not found" }, { status: 404 });
    }

    const result = await parseBody(req, updateWorkoutExerciseSchema);
    if (!result.success) return result.response;
    const { exerciseId, trackingType, sets, reps, repsMax, weight, restSeconds, coachNotes, orderIndex, supersetWithPrevious } = result.data;

    const swapping = exerciseId !== undefined && exerciseId !== we.exerciseId;
    if (swapping) {
      const owned = await verifyCoachOwnership(coachProfileId, "exercise", exerciseId);
      if (!owned) {
        return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
      }
      const [loggedSets, flags] = await Promise.all([
        prisma.setCompletion.count({ where: { workoutExerciseId: weId, completed: true } }),
        prisma.exerciseFlag.count({ where: { workoutExerciseId: weId } }),
      ]);
      if (loggedSets > 0 || flags > 0) {
        return NextResponse.json({ error: REPLACE_EXERCISE.logged, code: "EXERCISE_LOGGED" }, { status: 409 });
      }
    }

    const updated = await prisma.workoutExercise.update({
      where: { id: weId },
      data: {
        ...(swapping ? { exerciseId } : {}),
        ...(trackingType !== undefined ? { trackingType } : {}),
        ...(sets !== undefined ? { sets } : {}),
        ...(reps !== undefined ? { reps } : {}),
        ...(repsMax !== undefined ? { repsMax } : {}),
        ...(weight !== undefined ? { weight } : {}),
        ...(restSeconds !== undefined ? { restSeconds } : {}),
        ...(coachNotes !== undefined ? { coachNotes } : {}),
        ...(orderIndex !== undefined ? { orderIndex } : {}),
        ...(supersetWithPrevious !== undefined ? { supersetWithPrevious } : {}),
      },
      include: {
        exercise: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    await markPlanEdited(we.day.week.plan.id);

    return NextResponse.json(updated);
  }
);

/**
 * DELETE /api/workout-exercises/[id]
 * Removes a workout exercise from a day.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const weId = ctx.params.id;
    const we = await verifyWorkoutExerciseOwnership(weId, coachProfileId);
    if (!we) {
      return NextResponse.json({ error: "Workout exercise not found" }, { status: 404 });
    }

    await prisma.workoutExercise.delete({
      where: { id: weId },
    });

    await markPlanEdited(we.day.week.plan.id);

    return NextResponse.json({ success: true });
  }
);
