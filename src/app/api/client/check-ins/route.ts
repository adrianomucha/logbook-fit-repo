import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { ensureScheduledCheckIn } from "@/lib/checkin-schedule";

/**
 * GET /api/client/check-ins
 * Returns all check-ins for the current client (newest first).
 * Includes pending ones so the client can see prompts.
 */
export const GET = withClient(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    clientProfileId: string
  ) => {
    // Weekly schedule is enforced lazily on both sides — the client opening
    // their check-ins is enough to materialize a due one
    const relationship = await prisma.coachClientRelationship.findUnique({
      where: { clientId: clientProfileId },
    });
    if (relationship) {
      await ensureScheduledCheckIn(relationship);
    }

    const checkIns = await prisma.checkIn.findMany({
      // Expired check-ins were never answered — noise, not history
      where: { clientId: clientProfileId, status: { not: "EXPIRED" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        effortRating: true,
        painBlockers: true,
        clientFeeling: true,
        clientRespondedAt: true,
        coachFeedback: true,
        planAdjustment: true,
        completedAt: true,
      },
    });

    return NextResponse.json(checkIns);
  }
);
