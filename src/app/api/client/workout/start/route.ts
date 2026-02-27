import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

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
    const body = await req.json();
    const { dayId } = body as { dayId?: string };

    if (!dayId) {
      return NextResponse.json(
        { error: "dayId is required" },
        { status: 400 }
      );
    }

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
        week: { select: { planId: true } },
        exercises: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!day || day.week.planId !== client.activePlanId) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    // Check if workout already started
    const existing = await prisma.workoutCompletion.findFirst({
      where: {
        clientId: clientProfileId,
        planId: client.activePlanId,
        dayId,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          id: existing.id,
          status: existing.status,
          message: "Workout already started",
        },
        { status: 200 }
      );
    }

    // Create workout completion + pre-create set completion rows
    const completion = await prisma.$transaction(async (tx) => {
      const wc = await tx.workoutCompletion.create({
        data: {
          clientId: clientProfileId,
          planId: client.activePlanId!,
          dayId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          exercisesTotal: day.exercises.length,
          exercisesDone: 0,
          completionPct: 0,
        },
      });

      // Pre-create set completion rows
      const setData = day.exercises.flatMap((we) =>
        Array.from({ length: we.sets }, (_, i) => ({
          workoutCompletionId: wc.id,
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

    return NextResponse.json(completion, { status: 201 });
  }
);
