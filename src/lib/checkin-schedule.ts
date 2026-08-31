import prisma from "@/lib/prisma";
import { notifyCheckInSent } from "@/lib/push";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_DAYS = 7;

/**
 * A PENDING check-in the client never answered goes stale after two full
 * cadences — late responders still get a whole extra cycle to answer; after
 * that the check-in expires so it stops blocking the schedule forever. Never
 * shorter than two weeks: a 3-day cadence shouldn't expire a check-in the
 * client would still plausibly answer.
 */
function stalePendingMs(intervalDays: number) {
  return Math.max(2 * intervalDays, 14) * DAY_MS;
}

/**
 * Close out PENDING check-ins the client never answered.
 *
 * Without this, one ignored check-in blocks the scheduler indefinitely —
 * exactly the quiet client the product exists to surface would stop being
 * checked on. Expired check-ins are hidden from history on both sides.
 */
export async function expireStaleCheckIns(
  clientId: string,
  intervalDays: number = DEFAULT_INTERVAL_DAYS
) {
  await prisma.checkIn.updateMany({
    where: {
      clientId,
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - stalePendingMs(intervalDays)) },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Materialize the check-in schedule for one coach-client pair.
 *
 * If the relationship has the schedule enabled, there's no check-in currently
 * in flight, and the most recent one is at least a full cadence old (or none
 * exists), a fresh PENDING check-in is created. The cadence is per
 * relationship: every `checkInIntervalDays` days, optionally anchored to a
 * weekday (`checkInDayOfWeek`, 0 = Sunday … 6 = Saturday, UTC).
 *
 * Called from two places: the nightly sweep (runScheduledCheckIns, the
 * authority — it reaches every client whether or not anyone opens the app),
 * and opportunistically when either party loads check-in data, so a due
 * check-in appears immediately rather than at the next sweep.
 *
 * Returns the created check-in, or null when nothing was due.
 */
export async function ensureScheduledCheckIn(relationship: {
  coachId: string;
  clientId: string;
  status: string;
  checkInScheduleEnabled: boolean;
  checkInIntervalDays?: number;
  checkInDayOfWeek?: number | null;
}) {
  if (relationship.status !== "ACTIVE") {
    return null;
  }

  const intervalDays = relationship.checkInIntervalDays ?? DEFAULT_INTERVAL_DAYS;
  // An anchor day only makes sense for cadences of a week or longer
  const dayOfWeek =
    intervalDays >= 7 ? relationship.checkInDayOfWeek ?? null : null;

  // Runs even when the schedule is off — a manually sent check-in the client
  // ignored should also stop pinning the workspace to "waiting" forever
  await expireStaleCheckIns(relationship.clientId, intervalDays);

  if (!relationship.checkInScheduleEnabled) {
    return null;
  }

  if (dayOfWeek !== null && new Date().getUTCDay() !== dayOfWeek) {
    return null;
  }

  const latest = await prisma.checkIn.findFirst({
    where: { clientId: relationship.clientId },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true },
  });

  // One at a time — never stack a scheduled check-in on an open one
  if (latest && (latest.status === "PENDING" || latest.status === "CLIENT_RESPONDED")) {
    return null;
  }
  if (latest) {
    // Anchored cadences get a one-day grace: the sweep fires at a fixed hour,
    // so demanding a full interval to the millisecond would skip the anchor
    // day whenever the last check-in was created later in the day — turning
    // "every Monday" into "every other Monday".
    const requiredMs =
      dayOfWeek !== null ? (intervalDays - 1) * DAY_MS : intervalDays * DAY_MS;
    if (Date.now() - latest.createdAt.getTime() < requiredMs) {
      return null;
    }
  }

  const created = await prisma.checkIn.create({
    data: {
      coachId: relationship.coachId,
      clientId: relationship.clientId,
    },
    include: {
      client: { select: { userId: true } },
      coach: { select: { user: { select: { name: true } } } },
    },
  });

  // An auto-sent check-in needs the ping more than a manual one does: no
  // human is watching to follow it up, and the client has no other cue that
  // one is waiting.
  await notifyCheckInSent({
    clientUserId: created.client.userId,
    coachName: created.coach.user.name,
  });

  return created;
}

export type ScheduleSweepResult = {
  relationshipsScanned: number;
  checkInsCreated: number;
  failures: number;
};

/**
 * Sweep every active relationship: expire abandoned check-ins and send any
 * that are due. This is what makes "auto-sends on the configured cadence"
 * true.
 *
 * Before this existed, scheduling was materialized only when someone loaded
 * check-in data — so the quiet client the product exists to catch, who by
 * definition isn't opening the app, was never checked on, and their coach's
 * dashboard showed "all clear". Run from the nightly cron
 * (POST /api/cron/check-ins).
 *
 * Each relationship is handled independently: one client's failure must not
 * abort the sweep for everyone behind them in the list.
 */
export async function runScheduledCheckIns(): Promise<ScheduleSweepResult> {
  const relationships = await prisma.coachClientRelationship.findMany({
    where: { status: "ACTIVE" },
    select: {
      coachId: true,
      clientId: true,
      status: true,
      checkInScheduleEnabled: true,
      checkInIntervalDays: true,
      checkInDayOfWeek: true,
    },
  });

  let checkInsCreated = 0;
  let failures = 0;

  for (const relationship of relationships) {
    try {
      const created = await ensureScheduledCheckIn(relationship);
      if (created) checkInsCreated++;
    } catch (error) {
      failures++;
      console.error(
        "[CRON] Check-in scheduling failed for client",
        relationship.clientId,
        error
      );
    }
  }

  return {
    relationshipsScanned: relationships.length,
    checkInsCreated,
    failures,
  };
}
