import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type InviteAcceptErrorCode = "invite_invalid" | "already_connected";

/** A refusal the accept route turns into a JSON error the UI can show as-is. */
export class InviteAcceptError extends Error {
  constructor(
    public code: InviteAcceptErrorCode,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/**
 * Connects an existing client account to the coach behind an invite — the
 * signed-in counterpart of an invite signup, and the way back for a client
 * whose coaching ended (either side may have ended it).
 *
 * A client has one relationship row for life (`clientId` is unique), so an
 * ended one is reused rather than a second created:
 * - same coach: the row goes back to ACTIVE. Unlike a coach's Restore, the
 *   old plan isn't re-applied — a returning client starts from a plan the
 *   coach picks now, not one they walked away from.
 * - another coach: the row moves to the new coach with that coach's defaults.
 *   Check-ins the client answered but the old coach never replied to are
 *   closed out (EXPIRED), since nobody can review them any more and they would
 *   otherwise pin the new coach's check-in loop to "waiting".
 *
 * Either way the row's createdAt restarts, so the roster reads the client as
 * newly joined. The invite is redeemed in the same transaction, guarded on
 * its status so two tabs can't both spend it. The relationship write is
 * guarded the same way: two accepts racing for one client (two coaches'
 * invites in two tabs) can't both activate it — the loser's whole
 * transaction, invite included, rolls back as already_connected.
 */
export async function acceptInviteForClient(params: {
  token: string;
  clientProfileId: string;
  clientUserId: string;
}) {
  const { token, clientProfileId, clientUserId } = params;

  return prisma.$transaction(async (tx) => {
    const invite = await tx.clientInvite.findUnique({
      where: { token },
      include: { coach: { select: { userId: true } } },
    });
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new InviteAcceptError(
        "invite_invalid",
        "This invite link is invalid or expired. Ask your coach for a fresh one.",
        400
      );
    }

    const existing = await tx.coachClientRelationship.findUnique({
      where: { clientId: clientProfileId },
      select: { id: true, coachId: true, status: true },
    });
    if (existing?.status === "ACTIVE") {
      throw new InviteAcceptError(
        "already_connected",
        existing.coachId === invite.coachId
          ? "You're already training with this coach."
          : "You already have a coach. Leave them in Settings first, then open this link again.",
        409
      );
    }

    const { count } = await tx.clientInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (count === 0) {
      throw new InviteAcceptError(
        "invite_invalid",
        "This invite link was just used. Ask your coach for a fresh one.",
        400
      );
    }

    const active = {
      coachId: invite.coachId,
      status: "ACTIVE" as const,
      checkInScheduleEnabled: true,
      endedAt: null,
      endedBy: null,
      endedPlanId: null,
      endedPlanStartDate: null,
      createdAt: new Date(),
    };

    const lostRace = () =>
      new InviteAcceptError(
        "already_connected",
        "You were just connected to a coach. Refresh to see who.",
        409
      );

    if (!existing) {
      try {
        await tx.coachClientRelationship.create({
          data: { ...active, clientId: clientProfileId },
        });
      } catch (error) {
        // clientId is unique: a concurrent accept created the row first
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw lostRace();
        }
        throw error;
      }
    } else {
      const switchingCoach = existing.coachId !== invite.coachId;
      // Only an ended relationship may be taken over. A concurrent accept
      // that got here first has made it ACTIVE, so this matches nothing.
      const { count: activated } = await tx.coachClientRelationship.updateMany({
        where: { id: existing.id, status: { not: "ACTIVE" } },
        data: {
          ...active,
          // The cadence was the old coach's choice, not the new one's
          ...(switchingCoach ? { checkInIntervalDays: 7, checkInDayOfWeek: null } : {}),
        },
      });
      if (activated === 0) {
        throw lostRace();
      }
      if (switchingCoach) {
        await tx.checkIn.updateMany({
          where: {
            clientId: clientProfileId,
            coachId: existing.coachId,
            status: { in: ["PENDING", "CLIENT_RESPONDED"] },
          },
          data: { status: "EXPIRED" },
        });
      }
    }

    // Same as an invite signup: the coach's note opens the chat
    if (invite.note) {
      await tx.message.create({
        data: {
          senderId: invite.coach.userId,
          recipientId: clientUserId,
          content: invite.note,
        },
      });
    }

    return { coachUserId: invite.coach.userId };
  });
}
