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
        deletedAt: null,
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            days: {
              orderBy: { dayNumber: "asc" },
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
        deletedAt: null,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, durationWeeks } = body as {
      name?: string;
      description?: string;
      durationWeeks?: number;
    };

    // If renaming, check for duplicate name
    if (name && name !== existing.name) {
      const duplicate = await prisma.plan.findFirst({
        where: {
          ...coachScope(coachProfileId),
          name,
          deletedAt: null,
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
        editedAt: new Date(),
      },
    });

    return NextResponse.json(plan);
  }
);

/**
 * DELETE /api/plans/[id]
 * Soft-deletes a plan (sets deletedAt).
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
        deletedAt: null,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.plan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  }
);
