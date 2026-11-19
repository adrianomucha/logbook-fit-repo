import prisma from "@/lib/prisma";
import { sendSetupCallNudge } from "@/lib/services/email";
import { setupCallBookingUrl, setupCallLink } from "@/lib/setup-call";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Long enough that the reminder doesn't land on top of the welcome email */
export const NUDGE_AFTER_DAYS = 3;
/**
 * Signups older than this are never reminded: the reminder is about the
 * moment they joined, not a sweep through everyone who ever signed up.
 */
export const NUDGE_WITHIN_DAYS = 14;
/** A cap per run, so one run can never turn into a mass mailing */
export const NUDGE_BATCH = 50;

export type NudgeSweepResult = {
  candidates: number;
  sent: number;
  failures: number;
  /** "no-link" when the setup call isn't configured; nothing is sent then */
  skipped: string | null;
};

/**
 * The one-time "book your setup call" reminder: for a coach who joined the
 * waitlist, was offered the call, and hasn't booked (said "Not now", closed
 * the tab, or never reached the step).
 *
 * Who gets it: still PENDING (not invited by hand, not joined), never booked
 * a call (a coach who booked and then cancelled chose to, so they're left
 * alone), not "not-coaching" (they're never offered the call), joined
 * between NUDGE_AFTER_DAYS and NUDGE_WITHIN_DAYS ago, and never reminded.
 *
 * Each entry is claimed with a conditional update before the send, so
 * overlapping runs send once. A failed send releases the claim, so the next
 * daily run tries again while the entry is still inside the window.
 *
 * Runs daily from /api/cron/setup-call-nudges.
 */
export async function runSetupCallNudges(now = new Date()): Promise<NudgeSweepResult> {
  const link = setupCallLink();
  if (!link) return { candidates: 0, sent: 0, failures: 0, skipped: "no-link" };

  const due = {
    status: "PENDING" as const,
    callStatus: null,
    callNudgedAt: null,
    // Spelled out: a plain `not` would also drop entries that skipped the
    // question (SQL's <> never matches NULL)
    OR: [{ clientCount: null }, { clientCount: { not: "not-coaching" } }],
    createdAt: {
      lte: new Date(now.getTime() - NUDGE_AFTER_DAYS * DAY_MS),
      gte: new Date(now.getTime() - NUDGE_WITHIN_DAYS * DAY_MS),
    },
  };

  const entries = await prisma.waitlistEntry.findMany({
    where: due,
    orderBy: { createdAt: "asc" },
    take: NUDGE_BATCH,
    select: { id: true, email: true },
  });

  let sent = 0;
  let failures = 0;
  for (const entry of entries) {
    try {
      // Re-checks every condition, so a booking or an invite since the read
      // above wins
      const { count } = await prisma.waitlistEntry.updateMany({
        where: { id: entry.id, ...due },
        data: { callNudgedAt: now },
      });
      if (count === 0) continue;

      const ok = await sendSetupCallNudge(
        entry.email,
        setupCallBookingUrl(link, entry.email)
      );
      if (ok) {
        sent += 1;
      } else {
        failures += 1;
        await prisma.waitlistEntry.updateMany({
          where: { id: entry.id, callNudgedAt: now },
          data: { callNudgedAt: null },
        });
      }
    } catch (error) {
      failures += 1;
      console.error("[CRON] Setup call nudge failed for an entry:", error);
    }
  }

  return { candidates: entries.length, sent, failures, skipped: null };
}
