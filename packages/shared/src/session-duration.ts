/**
 * How long a session took, when we can believe it. A session's duration is
 * the span from Start to Finish, so a workout started one day and finished
 * days later stores "139h". Nobody trains that long: past the cap the stored
 * number says the session was left open, not how long the client trained.
 * Shared so the server's totals and both apps' history rows agree.
 */

/** Longer than any real gym session — beyond this a duration is an open-session artefact */
export const MAX_SESSION_SEC = 4 * 60 * 60;

/** The duration if it's believable, else undefined (shown as "—", left out of totals) */
export function plausibleSessionSec(seconds: number | null | undefined): number | undefined {
  if (seconds == null || seconds <= 0 || seconds > MAX_SESSION_SEC) return undefined;
  return seconds;
}

/**
 * The duration to store when a session is finished. Start → Finish when
 * that's believable; when the session was left open, the span between the
 * first and last logged set instead; otherwise unknown.
 */
export function finishedSessionSec(
  startedAt: Date | null | undefined,
  finishedAt: Date,
  setTimes: { first: Date | null; last: Date | null } = { first: null, last: null },
): number | null {
  if (startedAt) {
    const wallClock = plausibleSessionSec(Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000));
    if (wallClock !== undefined) return wallClock;
  }
  if (setTimes.first && setTimes.last) {
    return plausibleSessionSec(Math.floor((setTimes.last.getTime() - setTimes.first.getTime()) / 1000)) ?? null;
  }
  return null;
}
