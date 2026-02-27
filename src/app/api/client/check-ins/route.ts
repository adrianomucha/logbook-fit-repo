import { NextResponse } from "next/server";
import { withClient } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

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
    const checkIns = await prisma.checkIn.findMany({
      where: { clientId: clientProfileId },
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
