import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * POST /api/client/workout/[id]/finish
 * Completes a workout — calculates completionPct and marks status as COMPLETED.
 * Accepts optional: { effortRating: "EASY" | "MEDIUM" | "HARD" }
 */
export const POST = withClient(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const completionId = ctx.params.id;

    const completion = await prisma.workoutCompletion.findFirst({
      where: { id: completionId, clientId: clientProfileId },
      include: {
        day: {
          include: {
            exercises: { select: { id: true, sets: true } },
          },
        },
      },
    });

    if (!completion) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    if (completion.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Workout already completed" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { effortRating } = body as { effortRating?: string };

    // Calculate completion stats
    const totalSets = completion.day.exercises.reduce(
      (sum, ex) => sum + ex.sets,
      0
    );
    const completedSets = await prisma.setCompletion.count({
      where: { workoutCompletionId: completionId, completed: true },
    });

    // Count exercises with at least 1 completed set
    const exercisesWithCompletedSets = await prisma.setCompletion.groupBy({
      by: ["workoutExerciseId"],
      where: { workoutCompletionId: completionId, completed: true },
    });

    const completionPct = totalSets > 0 ? completedSets / totalSets : 0;
    const now = new Date();
    const durationSec = completion.startedAt
      ? Math.floor((now.getTime() - completion.startedAt.getTime()) / 1000)
      : null;

    const updated = await prisma.workoutCompletion.update({
      where: { id: completionId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completionPct,
        exercisesDone: exercisesWithCompletedSets.length,
        exercisesTotal: completion.day.exercises.length,
        durationSec,
        ...(effortRating ? { effortRating: effortRating as never } : {}),
      },
    });

    return NextResponse.json(updated);
  }
);
