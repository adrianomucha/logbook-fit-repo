import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import {
  CONTINUE_PLAN_MESSAGES,
  continueClientPlan,
  continuePlanStatus,
} from "@/lib/plan-continue";
import { continuePlanSchema } from "@/lib/validations/schemas";

/**
 * POST /api/coach/clients/[id]/plan/continue
 * Runs the client's finished plan again for another cycle — the one-tap
 * alternative to building a new block for a client who is doing fine on
 * this one. Body (optional): { startOn: "today" | "monday" }, default today.
 */
export const POST = withCoach(
  async (
    req: Request,
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

    // No body is fine: older clients sent none, and that meant "today"
    const parsed = continuePlanSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const result = await continueClientPlan(clientProfileId, parsed.data.startOn);

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
