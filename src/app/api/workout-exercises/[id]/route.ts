import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

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
              plan: { select: { coachId: true, deletedAt: true } },
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

    const body = await req.json();
    const { sets, reps, weight, restSeconds, coachNotes, orderIndex } = body as {
      sets?: number;
      reps?: number;
      weight?: number;
      restSeconds?: number;
      coachNotes?: string;
      orderIndex?: number;
    };

    const updated = await prisma.workoutExercise.update({
      where: { id: weId },
      data: {
        ...(sets !== undefined ? { sets } : {}),
        ...(reps !== undefined ? { reps } : {}),
        ...(weight !== undefined ? { weight } : {}),
        ...(restSeconds !== undefined ? { restSeconds } : {}),
        ...(coachNotes !== undefined ? { coachNotes } : {}),
        ...(orderIndex !== undefined ? { orderIndex } : {}),
      },
      include: {
        exercise: {
          select: { id: true, name: true, category: true },
        },
      },
    });

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

    return NextResponse.json({ success: true });
  }
);
