import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
} from '@logbook/shared/set-timer';

/** Repaint cadence while running; the value itself comes from Date.now(). */
const TICK_MS = 250;

/**
 * Only one set timer may run at a time across the whole workout: starting a
 * plank on set 2 while set 1 is still counting is always a mistake. Each
 * running hook registers a pause callback here; the next one to start pauses
 * it. Module-level is enough — there is one workout screen at a time.
 */
let activeTimerPause: (() => void) | null = null;

const KEEP_AWAKE_TAG = 'set-timer';

export interface UseSetTimerOptions {
  /** Seconds to count down from. Undefined or 0 turns the timer into a count-up stopwatch. */
  targetSeconds?: number;
  /** Fires once when a countdown reaches zero, with the prescribed seconds. */
  onFinish?: (seconds: number) => void;
}

export interface SetTimer {
  status: SetTimerStatus;
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
 * Drives the countdown for one TIME set — the web's useSetTimer on the
 * native clock. Wall-clock based: elapsed time is always `Date.now()` minus
 * the moment the current segment started, so a phone that locks its screen
 * mid-hold comes back showing the true remaining time, and a countdown that
 * ends while the app is backgrounded completes on the very next tick.
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

  // Tick while running. Coming back to the foreground forces a repaint the
  // instant the app is active again, so nobody sees a stale number.
  useEffect(() => {
    if (state.status !== 'running') return;

    const tick = () => {
      const now = Date.now();
      setNow(now);
      setState((s) => tickTimer(s, targetSeconds, now));
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [state.status, targetSeconds]);

  // Fire onFinish exactly once per run, after the state commit.
  useEffect(() => {
    if (state.status !== 'done' || finishedRef.current) return;
    finishedRef.current = true;
    if (activeTimerPause === pause) activeTimerPause = null;
    onFinishRef.current?.(targetSeconds ?? 0);
  }, [state.status, targetSeconds, pause]);

  // Keep the screen awake for the duration of a hold (the web's wake lock).
  useEffect(() => {
    if (state.status !== 'running') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [state.status]);

  // Free the exclusive slot if this set unmounts mid-run.
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
