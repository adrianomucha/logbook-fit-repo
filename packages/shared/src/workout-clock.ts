/**
 * The elapsed clock in the workout screen's header. Pure and wall-clock
 * based, like the set timer: the value is always "now minus Start", so a
 * phone that slept mid-workout shows the true time on the next paint.
 * Shared so the web and native headers count the same way.
 */

import { MAX_SESSION_SEC, plausibleSessionSec } from './session-duration';

/**
 * Seconds since the workout was started, or undefined when there is nothing
 * believable to show: not started yet (viewing doesn't start a workout), or
 * left open so long that a ticking "139:12:04" would only be noise.
 */
export function workoutElapsedSec(
  startedAt: string | null | undefined,
  now: number,
): number | undefined {
  if (!startedAt) return undefined;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return undefined;
  // A device clock a little behind the server's must read 0:00, not a negative.
  const sec = Math.max(0, Math.floor((now - start) / 1000));
  return sec > MAX_SESSION_SEC ? undefined : sec;
}

export interface WorkoutClockInput {
  startedAt: string | null | undefined;
  /** Stored duration once finished; the clock then shows it, frozen. */
  durationSec: number | null | undefined;
  isFinished: boolean;
}

/** Seconds the header clock shows right now, or undefined to hide it. */
export function workoutClockSec(input: WorkoutClockInput, now: number): number | undefined {
  if (input.isFinished) return plausibleSessionSec(input.durationSec);
  return workoutElapsedSec(input.startedAt, now);
}

/** 65 → "1:05", 754 → "12:34", 3725 → "1:02:05". */
export function formatWorkoutClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Screen-reader wording for the clock, e.g. "Workout time 12:34". */
export const WORKOUT_CLOCK_LABEL = 'Workout time';
