import prisma from "@/lib/prisma";
import { generateSecureToken } from "@/lib/tokens";
import { appBaseUrl, waitlistInvitePath } from "@/lib/waitlist";
import { sendWaitlistInvite } from "@/lib/services/email";
import {
  offersSetupCall,
  setupCallBookingUrl,
  setupCallLink,
} from "@/lib/setup-call";

export type IssueInviteResult =
  | { ok: true; emailSent: boolean; inviteUrl: string }
  | { ok: false; reason: "not_found" | "joined" };

/**
 * Send (or re-send) a private-beta invite: a fresh single-use token, the
 * entry marked INVITED, and the signup link emailed. Re-sending rotates the
 * token, so the previously emailed link stops working (rotation doubles as
 * revocation). Used by the admin's Invite button and by the Cal.com webhook
 * when a coach books their setup call.
 *
 * The email mentions the setup call: the booked time when there is one,
 * otherwise a link to book (for coaches who are offered a call).
 */
export async function issueWaitlistInvite(id: string): Promise<IssueInviteResult> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      status: true,
      clientCount: true,
      callStatus: true,
      callStartsAt: true,
      callTimeZone: true,
    },
  });
  if (!entry) return { ok: false, reason: "not_found" };
  if (entry.status === "JOINED") return { ok: false, reason: "joined" };

  // The JOINED guard in the WHERE closes the race against a concurrent
  // redemption: a signup between the read above and this write makes
  // count 0 instead of silently un-joining the entry.
  const inviteToken = generateSecureToken();
  const { count } = await prisma.waitlistEntry.updateMany({
    where: { id: entry.id, status: { not: "JOINED" } },
    data: { status: "INVITED", inviteToken, invitedAt: new Date() },
  });
  if (count === 0) return { ok: false, reason: "joined" };

  const inviteUrl = `${appBaseUrl()}${waitlistInvitePath(inviteToken)}`;
  const link = setupCallLink();
  const booked =
    entry.callStatus === "BOOKED" && entry.callStartsAt && entry.callStartsAt > new Date()
      ? { startsAt: entry.callStartsAt, timeZone: entry.callTimeZone }
      : null;
  const emailSent = await sendWaitlistInvite(entry.email, inviteUrl, {
    booked,
    bookingUrl:
      !booked && link && offersSetupCall(entry.clientCount)
        ? setupCallBookingUrl(link, entry.email)
        : null,
  });

  return { ok: true, emailSent, inviteUrl };
}
