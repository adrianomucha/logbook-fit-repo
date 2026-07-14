import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getPlanProgressStatus } from "@/lib/workout-week-helpers";

/**
 * GET /api/coach/dashboard
 * Returns coach's client list sorted by urgency:
 * NEEDS_PLAN > PLAN_ENDED > AT_RISK > AWAITING_RESPONSE > CHECKIN_DUE > ON_TRACK
 * A client who already responded outranks one who hasn't — they're
 * actively waiting on the coach.
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

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const clients = relationships.map((rel) => {
      const client = rel.client;
      const lastWorkout = client.completions[0]?.completedAt;
      const pendingCheckIn = client.checkIns[0];

      // Where the client is relative to their plan's end
      const planStatus = !client.activePlan
        ? "NONE"
        : client.planStartDate
          ? getPlanProgressStatus(client.planStartDate, client.activePlan.durationWeeks)
          : "ACTIVE";

      // Determine urgency
      let urgency: string;
      let urgencyOrder: number;

      if (!client.activePlan) {
        // Fresh signup waiting on their first plan — the coach's next move,
        // and the window where new clients churn if nothing happens
        urgency = "NEEDS_PLAN";
        urgencyOrder = 0;
      } else if (planStatus === "ENDED") {
        // Plan finished with nothing lined up — the highest-churn moment
        // after signup; the remedy is assigning the next block
        urgency = "PLAN_ENDED";
        urgencyOrder = 1;
      } else if (!lastWorkout || lastWorkout < sevenDaysAgo) {
        urgency = "AT_RISK";
        urgencyOrder = 2;
      } else if (pendingCheckIn?.status === "CLIENT_RESPONDED") {
        urgency = "AWAITING_RESPONSE";
        urgencyOrder = 3;
      } else if (pendingCheckIn?.status === "PENDING") {
        urgency = "CHECKIN_DUE";
        urgencyOrder = 4;
      } else {
        urgency = "ON_TRACK";
        urgencyOrder = 5;
      }

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
