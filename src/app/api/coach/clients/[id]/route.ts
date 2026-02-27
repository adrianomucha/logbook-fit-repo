import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/coach/clients/[id]
 * Returns detailed client profile for the authenticated coach.
 * Returns 404 if client not found or not owned by this coach.
 */
export const GET = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    // Verify coach-client relationship
    const relationship = await prisma.coachClientRelationship.findFirst({
      where: {
        coachId: coachProfileId,
        clientId: clientProfileId,
      },
    });

    if (!relationship) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        activePlan: {
          select: {
            id: true,
            name: true,
            description: true,
            durationWeeks: true,
          },
        },
        completions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 10,
          select: {
            id: true,
            dayId: true,
            completedAt: true,
            completionPct: true,
            effortRating: true,
            durationSec: true,
            day: {
              select: { name: true, dayNumber: true },
            },
          },
        },
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            effortRating: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...client,
      relationshipStatus: relationship.status,
      joinedAt: relationship.createdAt,
      planStartDate: client.planStartDate,
    });
  }
);
