import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getClientUrgency } from "@/lib/urgency";

/**
 * GET /api/coach/dashboard
 * Returns coach's client list sorted by urgency — see lib/urgency.ts for
 * the ranking, which is shared with the client-detail endpoint.
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
            activePlan: { select: { id: true, name: true, durationWeeks: true } },
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

    const clients = relationships.map((rel) => {
      const client = rel.client;
      const lastWorkout = client.completions[0]?.completedAt;
      const pendingCheckIn = client.checkIns[0];

      const { urgency, urgencyOrder, planStatus } = getClientUrgency({
        hasPlan: !!client.activePlan,
        planStartDate: client.planStartDate,
        planDurationWeeks: client.activePlan?.durationWeeks,
        lastWorkoutAt: lastWorkout,
        openCheckInStatus: pendingCheckIn?.status ?? null,
      });

      return {
        clientProfileId: client.id,
        user: client.user,
        activePlan: client.activePlan,
        lastWorkoutAt: lastWorkout,
        pendingCheckIn: pendingCheckIn || null,
        isSample: client.isSample,
        planStatus,
        urgency,
        urgencyOrder,
      };
    });

    // Sort by urgency, then most-silent first within a bucket (never trained
    // leads), then by name — so equally urgent clients keep a stable order
    clients.sort((a, b) => {
      if (a.urgencyOrder !== b.urgencyOrder) return a.urgencyOrder - b.urgencyOrder;
      const aWorkout = a.lastWorkoutAt ? a.lastWorkoutAt.getTime() : 0;
      const bWorkout = b.lastWorkoutAt ? b.lastWorkoutAt.getTime() : 0;
      if (aWorkout !== bWorkout) return aWorkout - bWorkout;
      return (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email);
    });

    return NextResponse.json(clients);
  }
);
