import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * POST /api/client/workout/[id]/restart
 * Resets a workout completion — deletes all sets/flags, resets status to IN_PROGRESS,
 * and re-creates SetCompletion rows for a fresh start.
 */
export const POST = withClient(
  async (
    _req: Request,
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
            exercises: { orderBy: { orderIndex: "asc" } },
          },
        },
      },
    });

    if (!completion) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    if (completion.status !== "IN_PROGRESS" && completion.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Workout cannot be restarted" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete all set completions
      await tx.setCompletion.deleteMany({
        where: { workoutCompletionId: completionId },
      });

      // Delete all exercise flags
      await tx.exerciseFlag.deleteMany({
        where: { workoutCompletionId: completionId },
      });

      // Reset the completion record
      const wc = await tx.workoutCompletion.update({
        where: { id: completionId },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          completedAt: null,
          completionPct: 0,
          exercisesDone: 0,
          exercisesTotal: completion.day.exercises.length,
          durationSec: null,
          effortRating: null,
        },
      });

      // Re-create set completion rows
      const setData = completion.day.exercises.flatMap((we) =>
        Array.from({ length: we.sets }, (_, i) => ({
          workoutCompletionId: completionId,
          workoutExerciseId: we.id,
          setNumber: i + 1,
          completed: false,
        }))
      );

      if (setData.length > 0) {
        await tx.setCompletion.createMany({ data: setData });
      }

      return wc;
    });

    return NextResponse.json(updated);
  }
);
