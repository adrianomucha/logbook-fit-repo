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
      where: { ...coachScope(coachProfileId), deletedAt: null },
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
    const { name, description, durationWeeks } = body as {
      name?: string;
      description?: string;
      durationWeeks?: number;
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
        deletedAt: null,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this name already exists" },
        { status: 409 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        coachId: coachProfileId,
        name,
        description,
        durationWeeks: durationWeeks ?? 4,
      },
      include: {
        weeks: true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  }
);
