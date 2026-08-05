import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import {
  CONTINUE_PLAN_MESSAGES,
  continueClientPlan,
  continuePlanStatus,
} from "@/lib/plan-continue";
import { sendPushToUser } from "@/lib/push";

/**
 * POST /api/client/plan/continue
 * Starts another cycle of the plan the client just finished.
 *
 * The client can do this themselves on purpose: finishing a block on a
 * Sunday and waiting days for the coach to queue the next one is how a
 * training habit dies. The coach still owns what comes next — this only
 * repeats the block they already assigned.
 */
export const POST = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const result = await continueClientPlan(clientProfileId);

    if (!result.ok) {
      return NextResponse.json(
        { error: CONTINUE_PLAN_MESSAGES[result.reason] },
        { status: continuePlanStatus(result.reason) }
      );
    }

    // Tell the coach. Restarting takes the client off the "plan ended" list
    // that would have prompted them to build the next block, so this must not
    // happen behind their back. Best-effort, like every other notification.
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: { clientId: clientProfileId, status: "ACTIVE" },
      select: {
        coach: { select: { userId: true } },
        client: { select: { user: { select: { name: true } } } },
      },
    });
    if (relationship) {
      const clientName =
        relationship.client.user.name?.split(" ")[0] || "Your client";
      await sendPushToUser(relationship.coach.userId, {
        title: `${clientName} restarted ${result.plan.name}`,
        body: `Back to week 1 of ${result.plan.durationWeeks}. Assign a new block any time.`,
        url: `/coach/clients/${clientProfileId}`,
        tag: `plan-continued:${clientProfileId}`,
      }).catch(() => undefined);
    }

    return NextResponse.json({
      planId: result.plan.id,
      name: result.plan.name,
      durationWeeks: result.plan.durationWeeks,
      planStartDate: result.planStartDate,
    });
  }
);
