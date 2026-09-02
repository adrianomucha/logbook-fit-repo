/**
 * Pure state machine for the per-set countdown on TIME exercises (planks,
 * carries, holds). Kept free of React and timers so it can be unit-tested and
 * so the hook that drives it can compute elapsed time from wall-clock
 * timestamps — a tab that iOS suspends mid-plank must come back showing the
 * right number, not however many ticks happened to fire.
 */

export type SetTimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface SetTimerState {
  status: SetTimerStatus;
  /** ms accumulated by earlier run segments (before the current one). */
  accumulatedMs: number;
  /** Wall-clock ms when the current run segment started; null unless running. */
  startedAt: number | null;
}

export const IDLE_TIMER: SetTimerState = {
  status: 'idle',
  accumulatedMs: 0,
  startedAt: null,
};

/** Total ms elapsed across every run segment, as of `now`. */
export function elapsedMs(state: SetTimerState, now: number): number {
  const current = state.startedAt != null ? Math.max(0, now - state.startedAt) : 0;
  return state.accumulatedMs + current;
}

/** Whole seconds elapsed, rounded to the nearest second (what gets logged). */
export function elapsedSeconds(state: SetTimerState, now: number): number {
  return Math.round(elapsedMs(state, now) / 1000);
}

/**
 * Seconds left on a countdown, never below zero. Uses ceil so the display
 * reads "60" for the whole first second and only hits "0" at the buzzer.
 */
export function remainingSeconds(
  targetSeconds: number,
  state: SetTimerState,
  now: number
): number {
  const left = targetSeconds * 1000 - elapsedMs(state, now);
  return Math.max(0, Math.ceil(left / 1000));
}

export function startTimer(state: SetTimerState, now: number): SetTimerState {
  if (state.status === 'running' || state.status === 'done') return state;
  return { ...state, status: 'running', startedAt: now };
}

export function pauseTimer(state: SetTimerState, now: number): SetTimerState {
  if (state.status !== 'running') return state;
  return {
    status: 'paused',
    accumulatedMs: elapsedMs(state, now),
    startedAt: null,
  };
}

export function resetTimer(): SetTimerState {
  return IDLE_TIMER;
}

/**
 * Advance a running countdown. Once the target is reached the timer freezes
 * at exactly the target so the logged seconds match the prescription rather
 * than overshooting by however late the tick was. A count-up timer (no
 * target) never finishes on its own.
 */
export function tickTimer(
  state: SetTimerState,
  targetSeconds: number | undefined,
  now: number
): SetTimerState {
  if (state.status !== 'running') return state;
  if (targetSeconds == null || targetSeconds <= 0) return state;
  if (elapsedMs(state, now) < targetSeconds * 1000) return state;
  return { status: 'done', accumulatedMs: targetSeconds * 1000, startedAt: null };
}

/** Clock-style display: 45 → "0:45", 90 → "1:30", 3600 → "60:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
