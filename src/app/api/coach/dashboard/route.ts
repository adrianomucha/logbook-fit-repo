import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/coach/dashboard
 * Returns coach's client list sorted by urgency:
 * AT_RISK > CHECKIN_DUE > AWAITING_RESPONSE > ON_TRACK
 */
export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const relationships = await prisma.coachClientRelationship.findMany({
      where: { coachId: coachProfileId, status: "ACTIVE" },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            activePlan: { select: { id: true, name: true } },
            completions: {
              where: { status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: { completedAt: true },
            },
            checkIns: {
              where: { status: { in: ["PENDING", "CLIENT_RESPONDED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, status: true, createdAt: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const clients = relationships.map((rel) => {
      const client = rel.client;
      const lastWorkout = client.completions[0]?.completedAt;
      const pendingCheckIn = client.checkIns[0];

      // Determine urgency
      let urgency: string;
      let urgencyOrder: number;

      if (!lastWorkout || lastWorkout < sevenDaysAgo) {
        urgency = "AT_RISK";
        urgencyOrder = 0;
      } else if (pendingCheckIn?.status === "CLIENT_RESPONDED") {
        urgency = "AWAITING_RESPONSE";
        urgencyOrder = 2;
      } else if (pendingCheckIn?.status === "PENDING") {
        urgency = "CHECKIN_DUE";
        urgencyOrder = 1;
      } else {
        urgency = "ON_TRACK";
        urgencyOrder = 3;
      }

      return {
        clientProfileId: client.id,
        user: client.user,
        activePlan: client.activePlan,
        lastWorkoutAt: lastWorkout,
        pendingCheckIn: pendingCheckIn || null,
        urgency,
        urgencyOrder,
      };
    });

    // Sort by urgency (AT_RISK first, ON_TRACK last)
    clients.sort((a, b) => a.urgencyOrder - b.urgencyOrder);

    return NextResponse.json(clients);
  }
);
