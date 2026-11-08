import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { workoutClockSec, type WorkoutClockInput } from '@logbook/shared/workout-clock';

/**
 * Seconds for the workout header clock, or undefined to hide it. The web's
 * useWorkoutClock: repaints once a second while the workout is in progress,
 * and the value comes from Date.now(), so coming back from the lock screen
 * shows the true time straight away.
 */
export function useWorkoutClock({ startedAt, durationSec, isFinished }: WorkoutClockInput): number | undefined {
  const [now, setNow] = useState(() => Date.now());
  const ticking = !isFinished && !!startedAt;

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [ticking]);

  return workoutClockSec({ startedAt, durationSec, isFinished }, now);
}
