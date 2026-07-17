import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { restoreCoachClientRelationship } from "@/lib/relationship-termination";

/**
 * POST /api/coach/clients/[id]/restore
 * Undoes an ended coaching relationship: back to ACTIVE, with the plan the
 * client was on re-assigned when it still exists. Only relationships the
 * coach ended can be restored — when the client chose to leave, rejoining is
 * their call (via a fresh invite), not the coach's.
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
      },
    });

    if (!relationship) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (relationship.status === "ACTIVE") {
      // Idempotent — double-clicking Restore isn't an error
      return NextResponse.json({ restored: true, planRestored: false });
    }

    if (relationship.endedBy === "CLIENT") {
      return NextResponse.json(
        { error: "This client chose to leave. They can rejoin with a new invite link." },
        { status: 403 }
      );
    }

    const result = await restoreCoachClientRelationship(relationship);
    return NextResponse.json({
      restored: true,
      planRestored: result.planRestored,
    });
  }
);
