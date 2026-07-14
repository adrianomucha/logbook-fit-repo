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
// How long a new client counts as "just walked in" for the say-hello nudge
const HELLO_WINDOW_MS = 48 * 60 * 60 * 1000;

export const GET = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    session: Session,
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

    // Say-hello nudge: real clients who joined inside the window and have
    // never received a message from this coach. One distinct-recipient query
    // covers every candidate; an invite note counts as the greeting because
    // it is delivered as the coach's first chat message.
    const now = Date.now();
    const helloCandidates = relationships.filter(
      (rel) =>
        !rel.client.isSample && now - rel.createdAt.getTime() < HELLO_WINDOW_MS
    );
    const greeted = helloCandidates.length
      ? await prisma.message.findMany({
          where: {
            senderId: session.user.id,
            recipientId: { in: helloCandidates.map((rel) => rel.client.user.id) },
          },
          select: { recipientId: true },
          distinct: ["recipientId"],
        })
      : [];
    const greetedUserIds = new Set(greeted.map((m) => m.recipientId));

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

      const awaitingHello =
        !client.isSample &&
        now - rel.createdAt.getTime() < HELLO_WINDOW_MS &&
        !greetedUserIds.has(client.user.id);

      return {
        clientProfileId: client.id,
        user: client.user,
        activePlan: client.activePlan,
        lastWorkoutAt: lastWorkout,
        pendingCheckIn: pendingCheckIn || null,
        isSample: client.isSample,
        joinedAt: rel.createdAt,
        awaitingHello,
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
