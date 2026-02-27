import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

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
    const completionId = ctx.params.id;

    // Verify ownership
    const completion = await prisma.workoutCompletion.findFirst({
      where: { id: completionId, clientId: clientProfileId },
    });
    if (!completion) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

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

    // Validate all workoutExerciseIds belong to the completion's day
    const uniqueWeIds = [...new Set(sets.map((s) => s.workoutExerciseId))];
    const validExercises = await prisma.workoutExercise.findMany({
      where: { id: { in: uniqueWeIds }, dayId: completion.dayId },
      select: { id: true },
    });
    const validIds = new Set(validExercises.map((e) => e.id));
    const invalidIds = uniqueWeIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "workoutExerciseId(s) do not belong to this workout day" },
        { status: 400 }
      );
    }

    // Batch upsert in a transaction
    await prisma.$transaction(
      sets.map((s) =>
        prisma.setCompletion.upsert({
          where: {
            workoutCompletionId_workoutExerciseId_setNumber: {
              workoutCompletionId: completionId,
              workoutExerciseId: s.workoutExerciseId,
              setNumber: s.setNumber,
            },
          },
          create: {
            workoutCompletionId: completionId,
            workoutExerciseId: s.workoutExerciseId,
            setNumber: s.setNumber,
            completed: s.completed,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            completedAt: s.completed ? new Date() : null,
          },
          update: {
            completed: s.completed,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            completedAt: s.completed ? new Date() : null,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  }
);
