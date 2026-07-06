import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * DELETE /api/coach/clients/[id]/plan
 * Unassigns the client's active plan. The plan itself is untouched —
 * only the assignment (and its start date) is cleared.
 */
export const DELETE = withCoach(
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
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 404 }
      );
    }

    const updated = await prisma.clientProfile.update({
      where: { id: clientProfileId },
      data: {
        activePlanId: null,
        planStartDate: null,
      },
      select: { id: true, activePlanId: true, planStartDate: true },
    });

    return NextResponse.json(updated);
  }
);
