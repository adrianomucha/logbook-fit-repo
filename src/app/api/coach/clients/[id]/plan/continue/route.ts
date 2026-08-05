import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import {
  CONTINUE_PLAN_MESSAGES,
  continueClientPlan,
  continuePlanStatus,
} from "@/lib/plan-continue";

/**
 * POST /api/coach/clients/[id]/plan/continue
 * Runs the client's finished plan again for another cycle — the one-tap
 * alternative to building a new block for a client who is doing fine on
 * this one.
 */
export const POST = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 404 }
      );
    }

    const result = await continueClientPlan(clientProfileId);

    if (!result.ok) {
      return NextResponse.json(
        { error: CONTINUE_PLAN_MESSAGES[result.reason] },
        { status: continuePlanStatus(result.reason) }
      );
    }

    return NextResponse.json({
      planId: result.plan.id,
      name: result.plan.name,
      durationWeeks: result.plan.durationWeeks,
      planStartDate: result.planStartDate,
    });
  }
);
