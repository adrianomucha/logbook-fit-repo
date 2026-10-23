import type { CheckIn } from './types';

/**
 * The coach's reply to a check-in, as the client sees it on Today.
 *
 * A reply is news, not furniture: it shows on Today (where the "replied to
 * your check-in" push lands) for a week, roughly until the next check-in,
 * then steps aside. The client can also put it away sooner: dismissing it or
 * opening the full check-in. The full history stays in Progress.
 */
export const CHECK_IN_REPLY_FRESH_DAYS = 7;

export const CHECK_IN_REPLY_COPY = {
  label: 'Check-in reply',
  open: 'Open check-in reply',
  dismiss: 'Dismiss check-in reply',
} as const;

/**
 * Per-device storage key holding the id of the reply the client put away.
 * Only the newest reply is ever shown, so one id is enough: a new reply has
 * a new check-in id and shows again on its own.
 */
export const DISMISSED_CHECK_IN_REPLY_KEY = 'logbook.checkin.reply-dismissed';

type ReplyFields = Pick<CheckIn, 'status' | 'coachResponse' | 'completedAt'>;

/** Newest check-in with a coach reply, whenever it arrived. */
export function latestCheckInReply<T extends ReplyFields>(checkIns: T[]): T | null {
  let latest: T | null = null;
  for (const ci of checkIns) {
    if (ci.status !== 'completed' || !ci.completedAt || !ci.coachResponse?.trim()) continue;
    if (!latest || new Date(ci.completedAt).getTime() > new Date(latest.completedAt!).getTime()) latest = ci;
  }
  return latest;
}

/** The latest reply, only while it's still new enough to lead with. */
export function freshCheckInReply<T extends ReplyFields>(checkIns: T[], now: Date = new Date()): T | null {
  const latest = latestCheckInReply(checkIns);
  if (!latest) return null;
  const ageMs = now.getTime() - new Date(latest.completedAt!).getTime();
  return ageMs <= CHECK_IN_REPLY_FRESH_DAYS * 24 * 60 * 60 * 1000 ? latest : null;
}
