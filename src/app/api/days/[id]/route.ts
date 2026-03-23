import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * PUT /api/days/[id]
 * Updates a day's metadata (name, description). Coach must own the plan.
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
    const { name, description } = body as {
      name?: string;
      description?: string | null;
    };

    const updated = await prisma.day.update({
      where: { id: dayId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return NextResponse.json(updated);
  }
);
