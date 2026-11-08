import prisma from "@/lib/prisma";
import { hourInTimeZone } from "@/lib/timezone";
import { workoutService } from "@/lib/services/workout";
import {
  notifyWorkoutAutoFinished,
  notifyWorkoutIdle,
  workoutUrl,
} from "@/lib/push";

/**
 * Workouts left open.
 *
 * Clients often log their last set, put the phone away and never tap Finish.
 * The session then sits IN_PROGRESS: Today keeps offering "Resume" on a
 * workout that's over, the coach's review calls it abandoned, and the stored
 * duration stretches to whenever the client next remembers.
 *
 * The sweep below does two things to a session with sets logged and then
 * nothing for a while:
 *
 *  1. After IDLE_NUDGE_AFTER_MS idle, push the client a "still training?"
 *     nudge, once per session, never during their night.
 *  2. After AUTO_FINISH_AFTER_MS idle, finish it for them, as of the last
 *     logged set (WorkoutService.autoFinish), and say so.
 *
 * Idle is measured from the last change to any set, not from Start, so a
 * long session with long rests never trips it. A session with nothing
 * logged is left alone: there's nothing to save, and an abandoned start is
 * a signal for the coach, not something to tidy away.
 *
 * Runs from /api/cron/idle-workouts. The nudge only lands on time when that
 * is called every 15 minutes or so; Vercel's free plan allows one cron run a
 * day, so the frequent schedule comes from Supabase pg_cron (DEVELOPMENT.md)
 * and the daily Vercel cron is a backstop that still closes sessions.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Well past any rest between sets, well short of a plausible session */
export const IDLE_NUDGE_AFTER_MS = 90 * MINUTE_MS;
/** Left open overnight: the session is over */
export const AUTO_FINISH_AFTER_MS = 12 * HOUR_MS;
/**
 * A save notice about an older session is noise. This also keeps the first
 * run from notifying everyone about sessions left open months ago: those are
 * closed silently.
 */
export const ANNOUNCE_AUTO_FINISH_WITHIN_MS = 36 * HOUR_MS;

/** No pushes from 22:00 to 08:00 in the client's timezone */
const QUIET_START_HOUR = 22;
const QUIET_END_HOUR = 8;

export function isQuietHours(now: Date, timeZone: string | null | undefined): boolean {
  const hour = hourInTimeZone(now, timeZone);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

export type IdleSession = {
  /** Start, or the last change to any of its sets, whichever is later */
  lastActivityAt: Date;
  /** Sets ticked as done */
  setsLogged: number;
  nudgedAt: Date | null;
  timeZone: string | null;
};

export type IdleDecision =
  | { action: "none" }
  | { action: "nudge" }
  | { action: "auto-finish"; announce: boolean };

/** What the sweep does with one open session. Pure, for the tests. */
export function idleWorkoutDecision(session: IdleSession, now: Date): IdleDecision {
  if (session.setsLogged === 0) return { action: "none" };

  const idleMs = now.getTime() - session.lastActivityAt.getTime();
  const quiet = isQuietHours(now, session.timeZone);

  // Closing never waits for morning (a once-a-day run could otherwise land
  // in someone's night every day and never close anything); only the
  // notice about it does
  if (idleMs >= AUTO_FINISH_AFTER_MS) {
    return {
      action: "auto-finish",
      announce: !quiet && idleMs < ANNOUNCE_AUTO_FINISH_WITHIN_MS,
    };
  }
  if (idleMs >= IDLE_NUDGE_AFTER_MS && !session.nudgedAt && !quiet) {
    return { action: "nudge" };
  }
  return { action: "none" };
}

export type IdleSweepResult = {
  sessionsScanned: number;
  nudged: number;
  autoFinished: number;
  failures: number;
};

export async function runIdleWorkoutSweep(now: Date = new Date()): Promise<IdleSweepResult> {
  const result: IdleSweepResult = {
    sessionsScanned: 0,
    nudged: 0,
    autoFinished: 0,
    failures: 0,
  };

  // Nothing started in the last IDLE_NUDGE_AFTER_MS can have been idle that long
  const open = await prisma.workoutCompletion.findMany({
    where: {
      status: "IN_PROGRESS",
      startedAt: { lte: new Date(now.getTime() - IDLE_NUDGE_AFTER_MS) },
    },
    select: {
      id: true,
      dayId: true,
      startedAt: true,
      idleReminderSentAt: true,
      day: { select: { name: true, weekId: true } },
      client: { select: { user: { select: { id: true, timezone: true } } } },
    },
  });
  result.sessionsScanned = open.length;
  if (open.length === 0) return result;

  // Per session: when any set last changed, and how many are ticked
  const groups = await prisma.setCompletion.groupBy({
    by: ["workoutCompletionId", "completed"],
    where: { workoutCompletionId: { in: open.map((c) => c.id) } },
    _max: { updatedAt: true },
    _count: { _all: true },
  });
  const activity = new Map<string, { last: Date | null; logged: number }>();
  for (const g of groups) {
    const entry = activity.get(g.workoutCompletionId) ?? { last: null, logged: 0 };
    const touched = g._max.updatedAt;
    if (touched && (!entry.last || touched > entry.last)) entry.last = touched;
    if (g.completed) entry.logged += g._count._all;
    activity.set(g.workoutCompletionId, entry);
  }

  for (const session of open) {
    try {
      const sets = activity.get(session.id);
      const startedAt = session.startedAt ?? now;
      const lastActivityAt =
        sets?.last && sets.last > startedAt ? sets.last : startedAt;
      const user = session.client.user;
      const notice = {
        clientUserId: user.id,
        completionId: session.id,
        dayName: session.day.name,
        url: workoutUrl(session.day.weekId, session.dayId),
      };

      const decision = idleWorkoutDecision(
        {
          lastActivityAt,
          setsLogged: sets?.logged ?? 0,
          nudgedAt: session.idleReminderSentAt,
          timeZone: user.timezone,
        },
        now
      );

      if (decision.action === "auto-finish") {
        const closed = await workoutService.autoFinish(session.id, now);
        if (closed) {
          result.autoFinished += 1;
          if (decision.announce) await notifyWorkoutAutoFinished(notice);
        }
      } else if (decision.action === "nudge") {
        // Claim the nudge before sending, so two overlapping runs (the
        // frequent schedule and the daily backstop) can't both send it
        const { count } = await prisma.workoutCompletion.updateMany({
          where: { id: session.id, status: "IN_PROGRESS", idleReminderSentAt: null },
          data: { idleReminderSentAt: now },
        });
        if (count > 0) {
          await notifyWorkoutIdle(notice);
          result.nudged += 1;
        }
      }
    } catch (error) {
      result.failures += 1;
      console.error(`[IDLE_WORKOUTS] Session ${session.id} failed:`, error);
    }
  }

  return result;
}
