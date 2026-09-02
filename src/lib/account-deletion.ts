import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { endCoachClientRelationshipIn } from "@/lib/relationship-termination";
import { deleteAvatarByUrl } from "@/lib/avatar-storage";

/**
 * Retires an account at its owner's request (App Store guideline 5.1.1(v)
 * makes this mandatory for the iOS app; it was a backlog item for the web
 * regardless).
 *
 * The row is kept — every message, check-in and workout row points at it,
 * and the other party's history must not develop holes — but it stops being
 * a person: `deletedAt` is set (which refuses every sign-in and, through
 * getSession(), every existing session) and the personal fields are
 * scrubbed so nothing identifying remains on it. The other side of each
 * coaching relationship sees "Deleted account" in their history, the same
 * as any ended relationship.
 *
 * Both roles' working surfaces are dismantled the way an ended relationship
 * already is (lib/relationship-termination.ts):
 * - a client's coach loses the plan assignment, schedule and chat
 * - a coach's clients each lose their assigned plan (plans are the coach's),
 *   and any open invite links stop working
 *
 * One transaction, so a failure halfway leaves the account untouched.
 */
export const DELETED_NAME = "Deleted account";

export function deletedEmailFor(userId: string): string {
  return `deleted-${userId}@deleted.logbook.fit`;
}

export interface DeletionSummary {
  role: "COACH" | "CLIENT";
  relationshipsEnded: number;
  invitesRevoked: number;
}

export async function deleteAccount(userId: string): Promise<DeletionSummary> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { avatarUrl: true },
  });
  const summary = await prisma.$transaction((tx) => deleteAccountIn(tx, userId));
  // Only after commit: the row no longer references the file, and a storage
  // hiccup must never undo an account deletion (best-effort by design).
  await deleteAvatarByUrl(user?.avatarUrl);
  return summary;
}

export async function deleteAccountIn(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<DeletionSummary> {
  const user = await tx.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      role: true,
      linkedUserId: true,
      coachProfile: {
        select: {
          id: true,
          clients: {
            where: { status: "ACTIVE" },
            select: { id: true, coachId: true, clientId: true },
          },
        },
      },
      clientProfile: {
        select: {
          id: true,
          coachRelationship: {
            select: { id: true, coachId: true, clientId: true, status: true },
          },
        },
      },
    },
  });
  if (!user) throw new AccountNotFoundError();

  let relationshipsEnded = 0;
  let invitesRevoked = 0;

  if (user.coachProfile) {
    for (const rel of user.coachProfile.clients) {
      await endCoachClientRelationshipIn(tx, rel, "COACH");
      relationshipsEnded += 1;
    }
    // An invite link that still worked would create a client for a coach
    // who no longer exists.
    const revoked = await tx.clientInvite.updateMany({
      where: { coachId: user.coachProfile.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    invitesRevoked = revoked.count;
  }

  const clientRel = user.clientProfile?.coachRelationship;
  if (clientRel && clientRel.status === "ACTIVE") {
    await endCoachClientRelationshipIn(tx, clientRel, "CLIENT");
    relationshipsEnded += 1;
  }

  // No device should hear from us again.
  await tx.pushSubscription.deleteMany({ where: { userId } });

  // The pairing is symmetric; drop both halves so the surviving account's
  // menu stops offering a switch into a dead one.
  if (user.linkedUserId) {
    await tx.user.updateMany({
      where: { id: user.linkedUserId, linkedUserId: userId },
      data: { linkedUserId: null },
    });
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      name: DELETED_NAME,
      email: deletedEmailFor(userId),
      avatarUrl: null,
      timezone: "UTC",
      linkedUserId: null,
      // Not a bcrypt hash, so no password can ever compare equal to it —
      // belt and braces on top of deletedAt.
      passwordHash: `deleted:${crypto.randomBytes(32).toString("hex")}`,
    },
  });

  return { role: user.role, relationshipsEnded, invitesRevoked };
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found");
    this.name = "AccountNotFoundError";
  }
}
