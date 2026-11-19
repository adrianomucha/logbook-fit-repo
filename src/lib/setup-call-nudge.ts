import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendSetupCallNudge, type SetupCallNudgeKind } from "@/lib/services/email";
import { setupCallBookingUrl, setupCallLink } from "@/lib/setup-call";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Long enough that the reminder doesn't land on top of the welcome email */
export const NUDGE_AFTER_DAYS = 3;
/**
 * Signups older than this are never reminded by the daily job: the reminder
 * is about the moment they joined. Older ones are the backlog, reached once
 * by the admin's one-off send instead.
 */
export const NUDGE_WITHIN_DAYS = 14;
/**
 * A cap per run (daily job, or one batch of the backlog send), so a run can
 * never turn into a mass mailing and always finishes inside the function's
 * time limit at the pace below.
 */
export const NUDGE_BATCH = 40;
/** Resend's default limit is 2 requests a second; stay under it */
export const SEND_GAP_MS = 600;

type Pause = (ms: number) => Promise<void>;
const sleep: Pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Everyone who could be reminded: still PENDING (not invited by hand, not
 * joined), never booked a call (a coach who booked and then cancelled chose
 * to, so they're left alone), never reminded, and offered the call (not
 * "not-coaching").
 */
function remindable(): Prisma.WaitlistEntryWhereInput {
  return {
    status: "PENDING",
    callStatus: null,
    callNudgedAt: null,
    // Spelled out: a plain `not` would also drop entries that skipped the
    // question (SQL's <> never matches NULL)
    OR: [{ clientCount: null }, { clientCount: { not: "not-coaching" } }],
  };
}

/** The daily job's window: joined between 3 and 14 days ago. */
function recentWhere(now: Date): Prisma.WaitlistEntryWhereInput {
  return {
    ...remindable(),
    createdAt: {
      lte: new Date(now.getTime() - NUDGE_AFTER_DAYS * DAY_MS),
      gte: new Date(now.getTime() - NUDGE_WITHIN_DAYS * DAY_MS),
    },
  };
}

/** The backlog: joined before the daily job's window. */
function backlogWhere(now: Date): Prisma.WaitlistEntryWhereInput {
  return {
    ...remindable(),
    createdAt: { lt: new Date(now.getTime() - NUDGE_WITHIN_DAYS * DAY_MS) },
  };
}

type SendResult = { candidates: number; sent: number; failures: number };

/**
 * Sends the reminder to up to NUDGE_BATCH entries matching `where`, oldest
 * signup first. Each entry is claimed with a conditional update before the
 * send (re-checking `where`, so a booking or an invite since the read wins,
 * and overlapping runs send once). A failed send releases the claim, so the
 * entry is tried again on a later run.
 */
async function sendReminders(
  where: Prisma.WaitlistEntryWhereInput,
  kind: SetupCallNudgeKind,
  link: string,
  now: Date,
  pause: Pause
): Promise<SendResult> {
  const entries = await prisma.waitlistEntry.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: NUDGE_BATCH,
    select: { id: true, email: true },
  });

  let sent = 0;
  let failures = 0;
  let first = true;
  for (const entry of entries) {
    try {
      const { count } = await prisma.waitlistEntry.updateMany({
        where: { id: entry.id, ...where },
        data: { callNudgedAt: now },
      });
      if (count === 0) continue;

      if (!first) await pause(SEND_GAP_MS);
      first = false;

      const ok = await sendSetupCallNudge(
        entry.email,
        setupCallBookingUrl(link, entry.email),
        kind
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
      console.error("[CRON] Setup call reminder failed for an entry:", error);
    }
  }

  return { candidates: entries.length, sent, failures };
}

export type NudgeSweepResult = SendResult & {
  /** "no-link" when the setup call isn't configured; nothing is sent then */
  skipped: string | null;
};

/**
 * The daily "book your setup call" reminder, for a coach who joined the
 * waitlist 3 to 14 days ago and hasn't booked (said "Not now", closed the
 * tab, or never reached the step). Runs from /api/cron/setup-call-nudges.
 */
export async function runSetupCallNudges(
  now = new Date(),
  pause: Pause = sleep
): Promise<NudgeSweepResult> {
  const link = setupCallLink();
  if (!link) return { candidates: 0, sent: 0, failures: 0, skipped: "no-link" };
  const result = await sendReminders(recentWhere(now), "recent", link, now, pause);
  return { ...result, skipped: null };
}

/** How many backlog entries the one-off send would still reach. */
export async function countBacklogNudges(now = new Date()): Promise<number> {
  return prisma.waitlistEntry.count({ where: backlogWhere(now) });
}

export type BacklogBatchResult = SendResult & { remaining: number };

/**
 * One batch of the one-off backlog send: the same reminder, worded for
 * people who joined before booking existed. The admin page calls this
 * repeatedly until `remaining` is 0. Everyone reached is marked reminded,
 * so they never get the daily reminder as well.
 */
export async function sendBacklogNudgeBatch(
  now = new Date(),
  pause: Pause = sleep
): Promise<BacklogBatchResult> {
  const link = setupCallLink();
  if (!link) throw new Error("NEXT_PUBLIC_CAL_SETUP_CALL_LINK is not set");
  const result = await sendReminders(backlogWhere(now), "backlog", link, now, pause);
  return { ...result, remaining: await countBacklogNudges(now) };
}
