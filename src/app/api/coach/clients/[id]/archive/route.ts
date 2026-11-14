import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * GET /api/coach/clients/[id]/archive
 * The read-only record of a past client: what they trained, the check-ins,
 * and the conversation. This is what "nothing is deleted" promises.
 *
 * Only for an ENDED relationship with this coach (an active client has the
 * live profile). Everything is limited to what was between these two:
 * workouts on this coach's plans, this coach's check-ins, their own thread.
 */
export const GET = withCoach(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    session: Session,
    coachProfileId: string
  ) => {
    const clientProfileId = ctx.params.id;

    const relationship = await prisma.coachClientRelationship.findFirst({
      where: { coachId: coachProfileId, clientId: clientProfileId, status: "INACTIVE" },
      include: {
        client: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!relationship) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const coachUserId = session.user.id;
    const clientUserId = relationship.client.user.id;

    const [workouts, checkIns, recentMessages] = await Promise.all([
      prisma.workoutCompletion.findMany({
        where: {
          clientId: clientProfileId,
          status: "COMPLETED",
          plan: { coachId: coachProfileId },
        },
        orderBy: { completedAt: "desc" },
        take: 200,
        select: {
          id: true,
          completedAt: true,
          completionPct: true,
          exercisesDone: true,
          exercisesTotal: true,
          durationSec: true,
          day: { select: { name: true } },
          plan: { select: { name: true } },
        },
      }),
      prisma.checkIn.findMany({
        // Expired check-ins were never answered: noise, not history
        where: { clientId: clientProfileId, coachId: coachProfileId, status: { not: "EXPIRED" } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          status: true,
          effortRating: true,
          clientFeeling: true,
          painBlockers: true,
          clientRespondedAt: true,
          coachFeedback: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: coachUserId, recipientId: clientUserId },
            { senderId: clientUserId, recipientId: coachUserId },
          ],
        },
        // The latest stretch of the thread, shown oldest first
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { id: true, senderId: true, content: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      clientProfileId: relationship.client.id,
      user: relationship.client.user,
      joinedAt: relationship.createdAt,
      endedAt: relationship.endedAt,
      endedBy: relationship.endedBy,
      workouts: workouts.map((w) => ({
        id: w.id,
        dayName: w.day.name,
        planName: w.plan.name,
        completedAt: w.completedAt,
        completionPct: w.completionPct,
        exercisesDone: w.exercisesDone,
        exercisesTotal: w.exercisesTotal,
        durationSec: w.durationSec,
      })),
      checkIns,
      messages: recentMessages
        .reverse()
        .map((m) => ({
          id: m.id,
          fromCoach: m.senderId === coachUserId,
          content: m.content,
          createdAt: m.createdAt,
        })),
    });
  }
);
