import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * PUT /api/days/[id]
 * Updates a day's metadata (name, isRestDay). Coach must own the plan.
 */
export const PUT = withCoach(
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

    if (
      !day ||
      day.week.plan.coachId !== coachProfileId ||
      day.week.plan.deletedAt !== null
    ) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, isRestDay, dayNumber } = body as {
      name?: string;
      description?: string | null;
      isRestDay?: boolean;
      dayNumber?: number;
    };

    // Validate dayNumber if provided
    if (dayNumber !== undefined && (dayNumber < 1 || dayNumber > 7)) {
      return NextResponse.json(
        { error: "dayNumber must be between 1 and 7" },
        { status: 400 }
      );
    }

    const updated = await prisma.day.update({
      where: { id: dayId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isRestDay !== undefined ? { isRestDay } : {}),
        ...(dayNumber !== undefined ? { dayNumber } : {}),
      },
    });

    return NextResponse.json(updated);
  }
);
