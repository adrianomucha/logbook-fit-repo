import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * POST /api/client/workout/[id]/flag
 * Flags an exercise within a workout — creates an ExerciseFlag record.
 * Accepts: { workoutExerciseId, note?: string }
 */
export const POST = withClient(
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
    const { workoutExerciseId, note } = body as {
      workoutExerciseId?: string;
      note?: string;
    };

    if (!workoutExerciseId) {
      return NextResponse.json(
        { error: "workoutExerciseId is required" },
        { status: 400 }
      );
    }

    // Check if already flagged (unique constraint)
    const existingFlag = await prisma.exerciseFlag.findUnique({
      where: {
        workoutCompletionId_workoutExerciseId: {
          workoutCompletionId: completionId,
          workoutExerciseId,
        },
      },
    });

    if (existingFlag) {
      // Update existing flag
      const updated = await prisma.exerciseFlag.update({
        where: { id: existingFlag.id },
        data: { note: note ?? existingFlag.note },
      });
      return NextResponse.json(updated);
    }

    const flag = await prisma.exerciseFlag.create({
      data: {
        workoutCompletionId: completionId,
        workoutExerciseId,
        note: note ?? null,
      },
    });

    return NextResponse.json(flag, { status: 201 });
  }
);
