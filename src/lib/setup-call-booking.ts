import prisma from "@/lib/prisma";
import type { CalBookingEvent } from "@/lib/cal-webhook";
import { offersSetupCall } from "@/lib/setup-call";
import { issueWaitlistInvite } from "@/lib/waitlist-invite";

export type BookingOutcome =
  /** Call recorded and the beta invite sent */
  | { outcome: "invited"; emailSent: boolean }
  /** Call recorded; no invite (already invited or joined, or not offered a call) */
  | { outcome: "recorded" }
  /** The email already has an account and no waitlist entry: nothing to record */
  | { outcome: "registered" };

/**
 * A setup call was booked (or moved). Records it on the coach's waitlist
 * entry and, for a coach still waiting, sends the beta invite right away so
 * they arrive on the call with an account.
 *
 * Cal.com retries deliveries, so this is idempotent: a repeat finds the entry
 * already INVITED and only rewrites the same call details.
 *
 * Someone who books from the public booking page without joining the
 * waitlist gets an entry (source "cal.com") and the same invite. Someone who
 * told us they aren't coaching yet is never shown the booking step; if they
 * book anyway the call is recorded for the admin to see, but no invite goes
 * out on its own.
 */
export async function recordSetupCallBooked(
  event: CalBookingEvent
): Promise<BookingOutcome> {
  const select = { id: true, status: true, clientCount: true } as const;
  let entry = await prisma.waitlistEntry.findUnique({
    where: { email: event.email },
    select,
  });

  if (!entry) {
    const registered = await prisma.user.findFirst({
      where: { email: event.email, deletedAt: null },
      select: { id: true },
    });
    if (registered) return { outcome: "registered" };
    entry = await prisma.waitlistEntry.upsert({
      where: { email: event.email },
      create: { email: event.email, source: "cal.com" },
      update: {},
      select,
    });
  }

  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      callStatus: "BOOKED",
      callStartsAt: event.startsAt,
      callTimeZone: event.timeZone ?? null,
      callBookingUid: event.uid,
      callBookedAt: new Date(),
    },
  });

  if (entry.status === "PENDING" && offersSetupCall(entry.clientCount)) {
    const invite = await issueWaitlistInvite(entry.id);
    if (invite.ok) return { outcome: "invited", emailSent: invite.emailSent };
  }
  return { outcome: "recorded" };
}

/**
 * A setup call was cancelled. Matched by booking uid, not email, so the
 * cancellation of a booking that has since been replaced (rescheduled, or
 * booked again) leaves the current one alone. The invite stays valid: a
 * coach who cancels the call can still sign up.
 */
export async function recordSetupCallCancelled(uid: string): Promise<void> {
  await prisma.waitlistEntry.updateMany({
    where: { callBookingUid: uid },
    data: { callStatus: "CANCELLED" },
  });
}
