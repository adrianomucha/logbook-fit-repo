import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";
import { parseBody } from "@/lib/validations/parseBody";
import { createPlanSchema } from "@/lib/validations/schemas";

/**
 * GET /api/plans
 * Returns the coach's plan TEMPLATES (excluding soft-deleted). Client
 * instances (clones created at assignment) are hidden from this list; their
 * assignees are folded into the source template's assignedTo so the Plans
 * page still shows who's training on each template.
 */
export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const plans = await prisma.plan.findMany({
      where: { ...coachScope(coachProfileId), sourceTemplateId: null },
      include: {
        weeks: {
          select: { id: true, weekNumber: true },
          orderBy: { weekNumber: "asc" },
        },
        // Legacy direct assignments (pre clone-on-assign)
        assignedTo: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Clients training on copies of each template
    const instances = await prisma.plan.findMany({
      where: {
        ...coachScope(coachProfileId),
        sourceTemplateId: { in: plans.map((p) => p.id) },
        assignedTo: { some: {} },
      },
      select: {
        sourceTemplateId: true,
        assignedTo: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    const byTemplate = new Map<string, (typeof instances)[number]["assignedTo"]>();
    for (const instance of instances) {
      const key = instance.sourceTemplateId!;
      byTemplate.set(key, [...(byTemplate.get(key) ?? []), ...instance.assignedTo]);
    }

    return NextResponse.json(
      plans.map((p) => ({
        ...p,
        assignedTo: [...p.assignedTo, ...(byTemplate.get(p.id) ?? [])],
      }))
    );
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
    const result = await parseBody(req, createPlanSchema);
    if (!result.success) return result.response;
    const { name, description, emoji, durationWeeks, workoutsPerWeek } = result.data;

    // Check for duplicate name (scoped to coach's TEMPLATES — client
    // instances share their template's name by design)
    const existing = await prisma.plan.findFirst({
      where: {
        ...coachScope(coachProfileId),
        sourceTemplateId: null,
        name,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this name already exists" },
        { status: 409 }
      );
    }

    const weeks = durationWeeks;
    const wpw = workoutsPerWeek;

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
          data: Array.from({ length: wpw }, (_, i) => ({
            weekId: week.id,
            orderIndex: i + 1,
            name: `Day ${i + 1}`,
          })),
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
