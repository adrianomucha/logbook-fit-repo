import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * POST /api/plans/[id]/assign
 * Assigns a plan to a client. Coach must own the plan
 * and have an active relationship with the client.
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
        deletedAt: null,
      },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const { clientProfileId } = body as { clientProfileId?: string };

    if (!clientProfileId) {
      return NextResponse.json(
        { error: "clientProfileId is required" },
        { status: 400 }
      );
    }

    // Verify coach-client relationship
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "ACTIVE",
      },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 404 }
      );
    }

    // Assign plan and set start date
    const updatedClient = await prisma.clientProfile.update({
      where: { id: clientProfileId },
      data: {
        activePlanId: planId,
        planStartDate: new Date(),
      },
      select: {
        id: true,
        activePlanId: true,
        planStartDate: true,
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(updatedClient);
  }
);
