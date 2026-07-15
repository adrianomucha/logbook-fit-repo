import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { addWorkoutExerciseSchema } from "@/lib/validations/schemas";

/**
 * POST /api/days/[id]/exercises
 * Adds an exercise to a day in a plan. Coach must own the plan.
 */
export const POST = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const dayId = ctx.params.id;

    // Verify the day belongs to a plan owned by this coach
    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        week: {
          include: {
            plan: { select: { id: true, coachId: true, deletedAt: true } },
          },
        },
      },
    });

    if (!day || day.week.plan.coachId !== coachProfileId || day.week.plan.deletedAt !== null) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const result = await parseBody(req, addWorkoutExerciseSchema);
    if (!result.success) return result.response;
    const { exerciseId, trackingType, sets, reps, repsMax, weight, restSeconds, coachNotes, orderIndex, supersetWithPrevious } = result.data;

    // Verify exercise belongs to coach
    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, coachId: coachProfileId, deletedAt: null },
    });
    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Determine orderIndex — append to end if not specified
    let idx = orderIndex;
    if (idx === undefined) {
      const lastExercise = await prisma.workoutExercise.findFirst({
        where: { dayId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      idx = (lastExercise?.orderIndex ?? -1) + 1;
    }

    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        dayId,
        exerciseId,
        orderIndex: idx,
        trackingType: trackingType ?? exercise.trackingType,
        sets: sets ?? exercise.defaultSets ?? 3,
        reps: reps ?? exercise.defaultReps ?? 10,
        repsMax: repsMax ?? null,
        weight: weight ?? exercise.defaultWeight,
        restSeconds: restSeconds ?? exercise.defaultRest,
        coachNotes,
        supersetWithPrevious: supersetWithPrevious ?? false,
      },
      include: {
        exercise: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    return NextResponse.json(workoutExercise, { status: 201 });
  }
);
