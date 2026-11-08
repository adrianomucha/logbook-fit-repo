import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";
import { addWeekSchema, MAX_PLAN_WEEKS } from "@/lib/validations/schemas";

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
    // Every other path caps a plan at MAX_PLAN_WEEKS; without this, repeated
    // calls grew one without bound (and every assign deep-clones it)
    if (nextWeekNumber > MAX_PLAN_WEEKS) {
      return NextResponse.json(
        { error: `A plan can have at most ${MAX_PLAN_WEEKS} weeks` },
        { status: 400 }
      );
    }

    // Optional day templates; an empty body means "use the plan's default"
    const raw = await req.json().catch(() => ({}));
    const parsed = addWeekSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid week" },
        { status: 400 }
      );
    }
    const dayTemplates = parsed.data.days;

    const wpw = plan.workoutsPerWeek || 3;

    // Create week with workout days only (no rest day records)
    const week = await prisma.week.create({
      data: {
        planId,
        weekNumber: nextWeekNumber,
        days: {
          create: dayTemplates
            ? dayTemplates.map((d, i) => ({
                orderIndex: i + 1,
                name: d.name ?? null,
              }))
            : Array.from({ length: wpw }, (_, i) => ({
                orderIndex: i + 1,
                name: `Day ${i + 1}`,
              })),
        },
      },
      include: {
        days: { orderBy: { orderIndex: "asc" } },
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
