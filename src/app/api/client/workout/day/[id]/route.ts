import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { formatReps } from "@/lib/reps";
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

    // Prior performance: the heaviest logged set from each exercise's most recent
    // COMPLETED session — a "last time you hit X" reference while logging today.
    const exerciseIds = day.exercises.map((we) => we.exerciseId);
    const priorSets = exerciseIds.length
      ? await prisma.setCompletion.findMany({
          where: {
            completed: true,
            OR: [{ actualWeight: { not: null } }, { actualReps: { not: null } }],
            workoutExercise: { exerciseId: { in: exerciseIds } },
            workoutCompletion: {
              clientId: clientProfileId,
              status: "COMPLETED",
              // Exclude today's own completion so it never references itself.
              ...(completion ? { id: { not: completion.id } } : {}),
            },
          },
          select: {
            actualWeight: true,
            actualReps: true,
            workoutExercise: { select: { exerciseId: true } },
            workoutCompletion: { select: { id: true, completedAt: true } },
          },
          orderBy: [
            { workoutCompletion: { completedAt: "desc" } },
            { workoutCompletionId: "asc" }, // deterministic tiebreak on equal timestamps
          ],
        })
      : [];

    // Reduce to one "top set" per exercise from its most recent session. Rows are
    // newest-first, so the first row seen for an exercise fixes that session; later
    // rows from the same session compete for the heaviest (by weight, then reps).
    const lastByExercise = new Map<
      string,
      {
        completionId: string;
        performedAt: Date | null;
        weight: number | null;
        reps: number | null;
      }
    >();
    for (const s of priorSets) {
      const exId = s.workoutExercise.exerciseId;
      const cur = lastByExercise.get(exId);
      if (!cur) {
        lastByExercise.set(exId, {
          completionId: s.workoutCompletion.id,
          performedAt: s.workoutCompletion.completedAt,
          weight: s.actualWeight,
          reps: s.actualReps,
        });
        continue;
      }
      if (s.workoutCompletion.id !== cur.completionId) continue; // older session
      const heavier =
        (s.actualWeight ?? -1) > (cur.weight ?? -1) ||
        ((s.actualWeight ?? -1) === (cur.weight ?? -1) &&
          (s.actualReps ?? -1) > (cur.reps ?? -1));
      if (heavier) {
        cur.weight = s.actualWeight;
        cur.reps = s.actualReps;
      }
    }

    return NextResponse.json({
      dayId: day.id,
      orderIndex: day.orderIndex,
      name: day.name,
      description: day.description,
      weekNumber: day.week.weekNumber,
      exercises: day.exercises.map((we) => ({
        workoutExerciseId: we.id,
        orderIndex: we.orderIndex,
        sets: we.sets,
        reps: formatReps(we.reps, we.repsMax),
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
        lastPerformance: (() => {
          const p = lastByExercise.get(we.exerciseId);
          return p
            ? { weight: p.weight, reps: p.reps, performedAt: p.performedAt }
            : null;
        })(),
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
