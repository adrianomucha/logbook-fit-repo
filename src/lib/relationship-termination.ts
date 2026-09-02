import prisma from "@/lib/prisma";
import type { Prisma, UserRole } from "@prisma/client";

/**
 * Ends a coach-client relationship, initiated by either side (the coach
 * terminating the client, or the client unsubscribing from the coach).
 *
 * The relationship row is kept as history (status INACTIVE + audit fields)
 * rather than deleted, but the working surface is dismantled:
 * - the client's assigned plan is cleared (plans belong to the coach), with
 *   the assignment snapshotted onto the relationship so Restore can undo it
 * - the weekly check-in schedule is switched off
 * - unanswered PENDING check-ins are removed; ones the client already
 *   responded to are kept — their words are theirs, and they resurface for
 *   review if the relationship is restored
 *
 * Completed check-ins, workout history, and past messages are untouched.
 * Messaging and all coach access close on their own: every route that grants
 * cross-party access already requires status ACTIVE.
 */
export async function endCoachClientRelationship(
  relationship: { id: string; coachId: string; clientId: string },
  endedBy: UserRole
) {
  return prisma.$transaction((tx) =>
    endCoachClientRelationshipIn(tx, relationship, endedBy)
  );
}

/**
 * The transactional core of endCoachClientRelationship, for callers that
 * already hold a transaction — account deletion ends every relationship
 * and retires the account in one commit.
 */
export async function endCoachClientRelationshipIn(
  tx: Prisma.TransactionClient,
  relationship: { id: string; coachId: string; clientId: string },
  endedBy: UserRole
) {
  {
    const client = await tx.clientProfile.findUnique({
      where: { id: relationship.clientId },
      select: { activePlanId: true, planStartDate: true },
    });

    const ended = await tx.coachClientRelationship.update({
      where: { id: relationship.id },
      data: {
        status: "INACTIVE",
        endedAt: new Date(),
        endedBy,
        checkInScheduleEnabled: false,
        endedPlanId: client?.activePlanId ?? null,
        endedPlanStartDate: client?.planStartDate ?? null,
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
        status: "PENDING",
      },
    });

    return ended;
  }
}

/**
 * Restores an ended relationship — the coach's undo for a mistaken
 * termination. Flips the row back to ACTIVE (which reopens messaging and all
 * coach access on its own) and re-applies the plan assignment snapshotted at
 * termination time, when that plan still exists and the client hasn't been
 * assigned anything else since.
 *
 * Callers decide *whether* a restore is allowed (a relationship the client
 * chose to end should not be coach-restorable); this only performs it.
 */
export async function restoreCoachClientRelationship(relationship: {
  id: string;
  coachId: string;
  clientId: string;
  endedPlanId: string | null;
  endedPlanStartDate: Date | null;
}) {
  return prisma.$transaction(async (tx) => {
    const restored = await tx.coachClientRelationship.update({
      where: { id: relationship.id },
      data: {
        status: "ACTIVE",
        endedAt: null,
        endedBy: null,
        endedPlanId: null,
        endedPlanStartDate: null,
      },
      select: { id: true, status: true },
    });

    let planRestored = false;
    if (relationship.endedPlanId) {
      const plan = await tx.plan.findFirst({
        where: {
          id: relationship.endedPlanId,
          coachId: relationship.coachId,
          deletedAt: null,
        },
        select: { id: true },
      });
      const client = await tx.clientProfile.findUnique({
        where: { id: relationship.clientId },
        select: { activePlanId: true },
      });
      if (plan && !client?.activePlanId) {
        await tx.clientProfile.update({
          where: { id: relationship.clientId },
          data: {
            activePlanId: plan.id,
            // Keep the original start date so plan-week math lands where the
            // client left off; a missing snapshot restarts the clock
            planStartDate: relationship.endedPlanStartDate ?? new Date(),
          },
        });
        planRestored = true;
      }
    }

    return { ...restored, planRestored };
  });
}
