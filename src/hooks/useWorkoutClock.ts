'use client';

import { useEffect, useState } from 'react';
import { workoutClockSec, type WorkoutClockInput } from '@logbook/shared/workout-clock';

/**
 * Seconds for the workout header clock, or undefined to hide it. Repaints
 * once a second while the workout is in progress; the value itself comes
 * from Date.now(), so a tab iOS suspended comes back showing the right time.
 */
export function useWorkoutClock({ startedAt, durationSec, isFinished }: WorkoutClockInput): number | undefined {
  const [now, setNow] = useState(() => Date.now());
  const ticking = !isFinished && !!startedAt;

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ticking]);

  return workoutClockSec({ startedAt, durationSec, isFinished }, now);
}
