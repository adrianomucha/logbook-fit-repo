import prisma from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * Ends a coach-client relationship, initiated by either side (the coach
 * terminating the client, or the client unsubscribing from the coach).
 *
 * The relationship row is kept as history (status INACTIVE + audit fields)
 * rather than deleted, but the working surface is dismantled:
 * - the client's assigned plan is cleared (plans belong to the coach)
 * - the weekly check-in schedule is switched off
 * - check-ins still in flight are removed — nobody is left answering a
 *   question the other side will never read
 *
 * Completed check-ins, workout history, and past messages are untouched.
 * Messaging and all coach access close on their own: every route that grants
 * cross-party access already requires status ACTIVE.
 */
export async function endCoachClientRelationship(
  relationship: { id: string; coachId: string; clientId: string },
  endedBy: UserRole
) {
  return prisma.$transaction(async (tx) => {
    const ended = await tx.coachClientRelationship.update({
      where: { id: relationship.id },
      data: {
        status: "INACTIVE",
        endedAt: new Date(),
        endedBy,
        checkInScheduleEnabled: false,
      },
      select: { id: true, status: true, endedAt: true, endedBy: true },
    });

    await tx.clientProfile.update({
      where: { id: relationship.clientId },
      data: { activePlanId: null, planStartDate: null },
    });

    await tx.checkIn.deleteMany({
      where: {
        coachId: relationship.coachId,
        clientId: relationship.clientId,
        status: { in: ["PENDING", "CLIENT_RESPONDED"] },
      },
    });

    return ended;
  });
}
