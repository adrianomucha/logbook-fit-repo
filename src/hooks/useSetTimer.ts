'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IDLE_TIMER,
  elapsedSeconds,
  pauseTimer,
  remainingSeconds,
  resetTimer,
  startTimer,
  tickTimer,
  type SetTimerState,
  type SetTimerStatus,
} from '@/lib/set-timer';

/**
 * How often to repaint while running. The displayed value is derived from
 * Date.now(), so this only affects smoothness, never accuracy.
 */
const TICK_MS = 250;

/**
 * Only one set timer may run at a time across the whole workout: starting a
 * plank on set 2 while set 1 is still counting is always a mistake. Each
 * running hook registers a pause callback here; the next one to start pauses
 * it. A module-level slot is enough — there is one workout screen per tab.
 */
let activeTimerPause: (() => void) | null = null;

export interface UseSetTimerOptions {
  /** Seconds to count down from. Undefined or 0 turns the timer into a count-up stopwatch. */
  targetSeconds?: number;
  /** Fires once when a countdown reaches zero, with the prescribed seconds. */
  onFinish?: (seconds: number) => void;
}

export interface SetTimer {
  status: SetTimerStatus;
  /** True when counting down from a target rather than up from zero. */
  isCountdown: boolean;
  /** Seconds to show: remaining for a countdown, elapsed for a stopwatch. */
  displaySeconds: number;
  /** Whole seconds worked so far — what gets logged on an early stop. */
  elapsedSeconds: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * Drives the countdown for one TIME set. Wall-clock based: elapsed time is
 * always `Date.now()` minus the moment the current segment started, so a
 * phone that locks its screen or a tab that iOS suspends mid-hold comes back
 * showing the true remaining time, and a countdown that ends while asleep
 * completes on the very next paint.
 */
export function useSetTimer({ targetSeconds, onFinish }: UseSetTimerOptions): SetTimer {
  const isCountdown = targetSeconds != null && targetSeconds > 0;
  const [state, setState] = useState<SetTimerState>(IDLE_TIMER);
  // Re-rendered every tick; the state itself only changes on transitions.
  const [now, setNow] = useState(() => Date.now());

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finishedRef = useRef(false);

  const pause = useCallback(() => {
    setState((s) => pauseTimer(s, Date.now()));
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    setNow(now);
    if (activeTimerPause && activeTimerPause !== pause) activeTimerPause();
    activeTimerPause = pause;
    setState((s) => startTimer(s, now));
  }, [pause]);

  const reset = useCallback(() => {
    if (activeTimerPause === pause) activeTimerPause = null;
    finishedRef.current = false;
    setState(resetTimer());
  }, [pause]);

  // Tick while running. visibilitychange forces a repaint the instant the tab
  // comes back so the user never sees a stale number after unlocking.
  useEffect(() => {
    if (state.status !== 'running') return;

    const tick = () => {
      const now = Date.now();
      setNow(now);
      setState((s) => tickTimer(s, targetSeconds, now));
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [state.status, targetSeconds]);

  // Fire onFinish exactly once per run. Done in an effect rather than inside
  // the tick so the callback runs after the state commit, never mid-render.
  useEffect(() => {
    if (state.status !== 'done' || finishedRef.current) return;
    finishedRef.current = true;
    if (activeTimerPause === pause) activeTimerPause = null;
    onFinishRef.current?.(targetSeconds ?? 0);
  }, [state.status, targetSeconds, pause]);

  // Keep the screen awake for the duration of a hold. Best-effort: the API is
  // missing on older Safari and the request can be refused on low battery.
  useEffect(() => {
    if (state.status !== 'running') return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) await lock.release();
        else sentinel = lock;
      } catch {
        // Denied or unsupported — the timer still works, the screen may dim.
      }
    };
    // The lock is dropped automatically when the tab is hidden; re-acquire on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [state.status]);

  // Free the exclusive slot if this set unmounts mid-run (exercise collapsed,
  // set ticked by hand).
  useEffect(() => {
    return () => {
      if (activeTimerPause === pause) activeTimerPause = null;
    };
  }, [pause]);

  const elapsed = elapsedSeconds(state, now);
  const displaySeconds = isCountdown ? remainingSeconds(targetSeconds, state, now) : elapsed;

  return {
    status: state.status,
    isCountdown,
    displaySeconds,
    elapsedSeconds: elapsed,
    start,
    pause,
    reset,
  };
}
