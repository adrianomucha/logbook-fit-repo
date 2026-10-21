import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { notifyCheckInSent } from "@/lib/push";
import { weekdayInTimeZone } from "@/lib/timezone";

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
 *
 * Anchored cadences get the same one-day grace as sending does: the check-in
 * went out on an anchor day, possibly later in the day than the sweep, and
 * the sweep two cadences on would otherwise find it a few hours (or seconds)
 * short of stale. It would then sit PENDING through the anchor day and the
 * next one couldn't go out until the anchor day after, turning "every two
 * weeks" into "every three".
 */
export async function expireStaleCheckIns(
  clientId: string,
  intervalDays: number = DEFAULT_INTERVAL_DAYS,
  anchored = false
) {
  const staleMs = stalePendingMs(intervalDays) - (anchored ? DAY_MS : 0);
  await prisma.checkIn.updateMany({
    where: {
      clientId,
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - staleMs) },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * True when a create failed because the pair already has a PENDING check-in.
 * The database enforces one at a time (check_ins_one_pending_per_pair, a
 * partial unique index), so two requests that both saw nothing open (the
 * nightly sweep, the coach's workspace and the client's app can all
 * materialize the same due check-in) can't both create one.
 */
export function isDuplicatePendingCheckIn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

type ScheduleRelationship = {
  coachId: string;
  clientId: string;
  status: string;
  checkInScheduleEnabled: boolean;
  checkInIntervalDays?: number;
  checkInDayOfWeek?: number | null;
};

/** The anchor weekday, when the cadence is long enough to have one. */
function anchorDayOfWeek(relationship: ScheduleRelationship, intervalDays: number) {
  // An anchor day only makes sense for cadences of a week or longer
  return intervalDays >= 7 ? relationship.checkInDayOfWeek ?? null : null;
}

/**
 * Whether the schedule would send this pair a check-in right now. Pure read:
 * expiry is the caller's job. `ignoreCheckInId` asks the question as if that
 * check-in didn't exist, which is how unsend tells "this was the one the
 * schedule was owed" from "an extra one the coach sent early".
 */
async function scheduledCheckInDue(
  relationship: ScheduleRelationship,
  { ignoreCheckInId }: { ignoreCheckInId?: string } = {}
) {
  if (relationship.status !== "ACTIVE" || !relationship.checkInScheduleEnabled) {
    return false;
  }

  const intervalDays = relationship.checkInIntervalDays ?? DEFAULT_INTERVAL_DAYS;
  const dayOfWeek = anchorDayOfWeek(relationship, intervalDays);

  const client = await prisma.clientProfile.findUnique({
    where: { id: relationship.clientId },
    select: { planStartDate: true, user: { select: { timezone: true } } },
  });

  // "Monday" means the client's Monday, not the server's: compare weekdays in
  // their stored IANA timezone (captured from the browser by TimezoneSync).
  // Unknown or invalid zones fall back to UTC.
  if (
    dayOfWeek !== null &&
    weekdayInTimeZone(new Date(), client?.user.timezone) !== dayOfWeek
  ) {
    return false;
  }

  // This pair's latest — a previous coach's check-ins don't set the new
  // coach's cadence
  const latest = await prisma.checkIn.findFirst({
    where: {
      coachId: relationship.coachId,
      clientId: relationship.clientId,
      ...(ignoreCheckInId ? { id: { not: ignoreCheckInId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true },
  });

  // One at a time — never stack a scheduled check-in on an open one
  if (latest && (latest.status === "PENDING" || latest.status === "CLIENT_RESPONDED")) {
    return false;
  }

  // The cadence runs from whichever came later: the last check-in or the
  // start of the current plan. Asking how training is going before the
  // client has had a cycle on the plan is premature — a fresh plan would
  // otherwise get a check-in seconds after it was assigned. A client with
  // neither has nothing to check in on yet.
  const anchorMs = Math.max(
    latest?.createdAt.getTime() ?? -Infinity,
    client?.planStartDate?.getTime() ?? -Infinity
  );
  if (anchorMs === -Infinity) {
    return false;
  }
  // Anchored cadences get a one-day grace: the sweep fires at a fixed hour,
  // so demanding a full interval to the millisecond would skip the anchor
  // day whenever the last check-in (or plan start) was later in the day —
  // turning "every Monday" into "every other Monday".
  const requiredMs =
    dayOfWeek !== null ? (intervalDays - 1) * DAY_MS : intervalDays * DAY_MS;
  return Date.now() - anchorMs >= requiredMs;
}

/**
 * Materialize the check-in schedule for one coach-client pair.
 *
 * If the relationship has the schedule enabled, there's no check-in currently
 * in flight, and a full cadence has passed since the later of the most recent
 * check-in and the current plan's start, a fresh PENDING check-in is created.
 * A client with neither a plan nor a past check-in gets nothing. The cadence is per
 * relationship: every `checkInIntervalDays` days, optionally anchored to a
 * weekday (`checkInDayOfWeek`, 0 = Sunday … 6 = Saturday, evaluated in the
 * client's timezone: the check-in is for them, so "Monday" means their
 * Monday; UTC when their timezone is unknown).
 *
 * Called from two places: the nightly sweep (runScheduledCheckIns, the
 * authority, since it reaches every client whether or not anyone opens the app),
 * and opportunistically when either party loads check-in data, so a due
 * check-in appears immediately rather than at the next sweep.
 *
 * Returns the created check-in, or null when nothing was due.
 */
export async function ensureScheduledCheckIn(relationship: ScheduleRelationship) {
  if (relationship.status !== "ACTIVE") {
    return null;
  }

  const intervalDays = relationship.checkInIntervalDays ?? DEFAULT_INTERVAL_DAYS;

  // Runs even when the schedule is off: a manually sent check-in the client
  // ignored should also stop pinning the workspace to "waiting" forever
  await expireStaleCheckIns(
    relationship.clientId,
    intervalDays,
    anchorDayOfWeek(relationship, intervalDays) !== null
  );

  if (!(await scheduledCheckInDue(relationship))) {
    return null;
  }

  let created;
  try {
    created = await prisma.checkIn.create({
      data: {
        coachId: relationship.coachId,
        clientId: relationship.clientId,
      },
      include: {
        client: { select: { userId: true } },
        coach: { select: { user: { select: { name: true } } } },
      },
    });
  } catch (error) {
    // Another request materialized this same due check-in a moment ago; it
    // sent the push too, so there's nothing left to do
    if (isDuplicatePendingCheckIn(error)) return null;
    throw error;
  }

  // An auto-sent check-in needs the ping more than a manual one does: no
  // human is watching to follow it up, and the client has no other cue that
  // one is waiting.
  await notifyCheckInSent({
    clientUserId: created.client.userId,
    coachName: created.coach.user.name,
  });

  return created;
}

/**
 * Coach unsends a check-in that's still unanswered.
 *
 * When it's the check-in the schedule was owed (it would send one right back
 * if this one disappeared), unsending means "skip this one": it's closed out
 * as EXPIRED, hidden on both sides like any unanswered check-in, and still
 * counts as this cycle's, so the next one comes a full cadence later.
 * Deleting it instead would leave the schedule due, and the very next load of
 * the coach's workspace would send a fresh copy and ping the client again.
 * An extra check-in sent ahead of schedule is deleted outright, so the
 * cadence carries on as if it had never been sent (and Undo stays exact).
 *
 * Returns "deleted" or "skipped", or null when there's no unanswered
 * check-in by that id for this coach (including one the client answered a
 * moment ago).
 */
export async function unsendCheckIn(coachId: string, checkInId: string) {
  const checkIn = await prisma.checkIn.findFirst({
    where: { id: checkInId, coachId, status: "PENDING" },
    select: { id: true, clientId: true },
  });
  if (!checkIn) return null;

  const relationship = await prisma.coachClientRelationship.findUnique({
    where: { clientId: checkIn.clientId },
    select: {
      coachId: true,
      clientId: true,
      status: true,
      checkInScheduleEnabled: true,
      checkInIntervalDays: true,
      checkInDayOfWeek: true,
    },
  });
  const owedBySchedule =
    relationship?.coachId === coachId &&
    (await scheduledCheckInDue(relationship, { ignoreCheckInId: checkIn.id }));

  // Conditional on still being PENDING: a response that lands between the
  // read above and this write is part of the conversation and stays
  const where = { id: checkIn.id, status: "PENDING" as const };
  const { count } = owedBySchedule
    ? await prisma.checkIn.updateMany({ where, data: { status: "EXPIRED" } })
    : await prisma.checkIn.deleteMany({ where });
  if (count === 0) return null;

  return owedBySchedule ? ("skipped" as const) : ("deleted" as const);
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
