import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { endCoachClientRelationship } from "@/lib/relationship-termination";

/**
 * DELETE /api/client/coach
 * Client unsubscribes from their coach. The relationship is kept as INACTIVE
 * history; the client keeps their account and workout history but loses the
 * assigned plan (it belongs to the coach) and the messaging channel.
 */
export const DELETE = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: { clientId: clientProfileId, status: "ACTIVE" },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "No active coach relationship" },
        { status: 404 }
      );
    }

    const ended = await endCoachClientRelationship(relationship, "CLIENT");
    return NextResponse.json({ ended: true, endedAt: ended.endedAt });
  }
);
