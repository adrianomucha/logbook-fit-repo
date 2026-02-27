import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { verifyCoachOwnership } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * PUT /api/exercises/[id]
 * Updates an exercise in the coach's library.
 */
export const PUT = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const exerciseId = ctx.params.id;

    const owned = await verifyCoachOwnership(coachProfileId, "exercise", exerciseId);
    if (!owned) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, category, defaultSets, defaultReps, defaultWeight, defaultRest, instructions } =
      body as {
        name?: string;
        category?: string;
        defaultSets?: number;
        defaultReps?: number;
        defaultWeight?: number;
        defaultRest?: number;
        instructions?: string;
      };

    // If renaming, check for duplicate
    if (name) {
      const duplicate = await prisma.exercise.findFirst({
        where: {
          coachId: coachProfileId,
          name,
          deletedAt: null,
          NOT: { id: exerciseId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An exercise with this name already exists" },
          { status: 409 }
        );
      }
    }

    const exercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category: category as never } : {}),
        ...(defaultSets !== undefined ? { defaultSets } : {}),
        ...(defaultReps !== undefined ? { defaultReps } : {}),
        ...(defaultWeight !== undefined ? { defaultWeight } : {}),
        ...(defaultRest !== undefined ? { defaultRest } : {}),
        ...(instructions !== undefined ? { instructions } : {}),
      },
    });

    return NextResponse.json(exercise);
  }
);
