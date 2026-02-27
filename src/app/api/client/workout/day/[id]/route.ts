import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/client/workout/day/[id]
 * Returns full workout detail for a specific day (by dayId), including exercises
 * ordered by orderIndex and any existing set completions.
 */
export const GET = withClient(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const dayId = ctx.params.id;

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      select: { activePlanId: true },
    });

    if (!client?.activePlanId) {
      return NextResponse.json(
        { error: "No active plan assigned" },
        { status: 404 }
      );
    }

    // Verify day belongs to client's active plan
    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        week: {
          select: { planId: true, weekNumber: true },
        },
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                category: true,
                instructions: true,
              },
            },
          },
        },
      },
    });

    if (!day || day.week.planId !== client.activePlanId) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    // Get existing workout completion (if any)
    const completion = await prisma.workoutCompletion.findFirst({
      where: {
        clientId: clientProfileId,
        planId: client.activePlanId,
        dayId,
      },
      include: {
        sets: {
          orderBy: [{ workoutExerciseId: "asc" }, { setNumber: "asc" }],
        },
        flags: true,
      },
    });

    return NextResponse.json({
      dayId: day.id,
      dayNumber: day.dayNumber,
      name: day.name,
      isRestDay: day.isRestDay,
      weekNumber: day.week.weekNumber,
      exercises: day.exercises.map((we) => ({
        workoutExerciseId: we.id,
        orderIndex: we.orderIndex,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight,
        restSeconds: we.restSeconds,
        coachNotes: we.coachNotes,
        exercise: we.exercise,
        setCompletions: completion
          ? completion.sets.filter((s) => s.workoutExerciseId === we.id)
          : [],
        flag: completion
          ? completion.flags.find((f) => f.workoutExerciseId === we.id) ?? null
          : null,
      })),
      completion: completion
        ? {
            id: completion.id,
            status: completion.status,
            startedAt: completion.startedAt,
            completedAt: completion.completedAt,
            completionPct: completion.completionPct,
            effortRating: completion.effortRating,
            durationSec: completion.durationSec,
          }
        : null,
    });
  }
);
