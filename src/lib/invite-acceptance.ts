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
 * its status so two tabs can't both spend it.
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

    if (!existing) {
      await tx.coachClientRelationship.create({
        data: { ...active, clientId: clientProfileId },
      });
    } else {
      const switchingCoach = existing.coachId !== invite.coachId;
      await tx.coachClientRelationship.update({
        where: { id: existing.id },
        data: {
          ...active,
          // The cadence was the old coach's choice, not the new one's
          ...(switchingCoach ? { checkInIntervalDays: 7, checkInDayOfWeek: null } : {}),
        },
      });
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
