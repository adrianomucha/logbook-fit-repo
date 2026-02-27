import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * POST /api/plans/[id]/weeks
 * Adds a new week with 7 days to a plan.
 */
export const POST = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const planId = ctx.params.id;

    // Verify coach owns the plan
    const plan = await prisma.plan.findFirst({
      where: {
        id: planId,
        ...coachScope(coachProfileId),
      },
      include: {
        weeks: { select: { weekNumber: true }, orderBy: { weekNumber: "desc" }, take: 1 },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const nextWeekNumber = (plan.weeks[0]?.weekNumber ?? 0) + 1;

    // Parse optional day templates from body
    const body = await req.json().catch(() => ({}));
    const { days: dayTemplates } = body as {
      days?: { dayNumber: number; name?: string; isRestDay?: boolean }[];
    };

    // Create week with 7 days
    const week = await prisma.week.create({
      data: {
        planId,
        weekNumber: nextWeekNumber,
        days: {
          create: dayTemplates
            ? dayTemplates.map((d) => ({
                dayNumber: d.dayNumber,
                name: d.name ?? null,
                isRestDay: d.isRestDay ?? false,
              }))
            : Array.from({ length: 7 }, (_, i) => ({
                dayNumber: i + 1,
                name: null,
                isRestDay: false,
              })),
        },
      },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
      },
    });

    // Update plan durationWeeks if new week exceeds it
    if (nextWeekNumber > plan.durationWeeks) {
      await prisma.plan.update({
        where: { id: planId },
        data: { durationWeeks: nextWeekNumber, editedAt: new Date() },
      });
    }

    return NextResponse.json(week, { status: 201 });
  }
);
