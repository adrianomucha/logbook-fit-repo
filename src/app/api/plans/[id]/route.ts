import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * GET /api/plans/[id]
 * Returns a single plan with all weeks, days, and exercises.
 */
export const GET = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const planId = ctx.params.id;

    const plan = await prisma.plan.findFirst({
      where: {
        id: planId,
        ...coachScope(coachProfileId),
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            days: {
              orderBy: { orderIndex: "asc" },
              include: {
                exercises: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    exercise: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                        instructions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            planStartDate: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  }
);

/**
 * PUT /api/plans/[id]
 * Updates plan metadata (name, description, durationWeeks).
 */
export const PUT = withCoach(
  async (
    req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const planId = ctx.params.id;

    // Verify ownership
    const existing = await prisma.plan.findFirst({
      where: {
        id: planId,
        ...coachScope(coachProfileId),
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, durationWeeks, workoutsPerWeek } = body as {
      name?: string;
      description?: string;
      durationWeeks?: number;
      workoutsPerWeek?: number;
    };

    // If renaming a TEMPLATE, check for duplicate name among templates.
    // Client instances share (or tailor) names freely — no uniqueness there.
    if (name && name !== existing.name && existing.sourceTemplateId === null) {
      const duplicate = await prisma.plan.findFirst({
        where: {
          ...coachScope(coachProfileId),
          sourceTemplateId: null,
          name,
          NOT: { id: planId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A plan with this name already exists" },
          { status: 409 }
        );
      }
    }

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(durationWeeks !== undefined ? { durationWeeks } : {}),
        ...(workoutsPerWeek !== undefined ? { workoutsPerWeek } : {}),
        editedAt: new Date(),
      },
    });

    return NextResponse.json(plan);
  }
);

/**
 * DELETE /api/plans/[id]
 * Soft-deletes a plan (sets deletedAt).
 * Blocked while any client is assigned to it — plans are shared by reference,
 * so deleting one would silently strand every assigned client with no plan.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const planId = ctx.params.id;

    const existing = await prisma.plan.findFirst({
      where: {
        id: planId,
        ...coachScope(coachProfileId),
      },
      include: {
        assignedTo: {
          select: { user: { select: { name: true } } },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (existing.assignedTo.length > 0) {
      const names = existing.assignedTo
        .map((c) => c.user.name || "a client")
        .slice(0, 3)
        .join(", ");
      const extra = existing.assignedTo.length > 3 ? ` and ${existing.assignedTo.length - 3} more` : "";
      return NextResponse.json(
        {
          error: `This plan is assigned to ${names}${extra}. Change their plan first, then delete it.`,
        },
        { status: 409 }
      );
    }

    await prisma.plan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  }
);
