import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * GET /api/plans
 * Returns all plans for the authenticated coach (excluding soft-deleted).
 */
export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const plans = await prisma.plan.findMany({
      where: { ...coachScope(coachProfileId) },
      include: {
        weeks: {
          select: { id: true, weekNumber: true },
          orderBy: { weekNumber: "asc" },
        },
        assignedTo: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(plans);
  }
);

/**
 * POST /api/plans
 * Creates a new plan for the authenticated coach.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const body = await req.json();
    const { name, description, emoji, durationWeeks, workoutsPerWeek } = body as {
      name?: string;
      description?: string;
      emoji?: string;
      durationWeeks?: number;
      workoutsPerWeek?: number;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name (scoped to coach, non-deleted)
    const existing = await prisma.plan.findFirst({
      where: {
        ...coachScope(coachProfileId),
        name,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this name already exists" },
        { status: 409 }
      );
    }

    const weeks = durationWeeks ?? 4;
    const wpw = workoutsPerWeek ?? 4;

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          coachId: coachProfileId,
          name,
          description,
          emoji: emoji ?? "💪",
          durationWeeks: weeks,
          workoutsPerWeek: wpw,
        },
      });

      // Scaffold weeks and days using createMany to minimize round-trips
      for (let w = 1; w <= weeks; w++) {
        const week = await tx.week.create({
          data: { planId: created.id, weekNumber: w },
        });
        await tx.day.createMany({
          data: Array.from({ length: 7 }, (_, i) => {
            const d = i + 1;
            const isRestDay = d > wpw;
            return {
              weekId: week.id,
              dayNumber: d,
              name: isRestDay ? null : `Day ${d}`,
              isRestDay,
            };
          }),
        });
      }

      return tx.plan.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          weeks: {
            orderBy: { weekNumber: "asc" },
            select: { id: true, weekNumber: true },
          },
        },
      });
    }, { timeout: 15000 });

    return NextResponse.json(plan, { status: 201 });
  }
);
