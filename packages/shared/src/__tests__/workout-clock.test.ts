import { describe, expect, it } from 'vitest';
import { MAX_SESSION_SEC } from '../session-duration';
import { formatWorkoutClock, workoutClockSec, workoutElapsedSec } from '../workout-clock';

const START = '2026-11-08T10:00:00.000Z';
const startMs = new Date(START).getTime();

describe('workoutElapsedSec', () => {
  it('is hidden until the workout has been started', () => {
    expect(workoutElapsedSec(null, startMs)).toBeUndefined();
    expect(workoutElapsedSec(undefined, startMs)).toBeUndefined();
    expect(workoutElapsedSec('not a date', startMs)).toBeUndefined();
  });

  it('counts whole seconds from the start on the wall clock', () => {
    expect(workoutElapsedSec(START, startMs)).toBe(0);
    expect(workoutElapsedSec(START, startMs + 999)).toBe(0);
    expect(workoutElapsedSec(START, startMs + 754_400)).toBe(754);
  });

  it('never goes negative when the device clock is behind the server', () => {
    expect(workoutElapsedSec(START, startMs - 5_000)).toBe(0);
  });

  it('hides once the session has been left open past any real workout', () => {
    expect(workoutElapsedSec(START, startMs + MAX_SESSION_SEC * 1000)).toBe(MAX_SESSION_SEC);
    expect(workoutElapsedSec(START, startMs + (MAX_SESSION_SEC + 1) * 1000)).toBeUndefined();
  });
});

describe('workoutClockSec', () => {
  it('ticks from the start while in progress', () => {
    expect(workoutClockSec({ startedAt: START, durationSec: null, isFinished: false }, startMs + 60_000)).toBe(60);
  });

  it('freezes at the stored duration once finished', () => {
    expect(workoutClockSec({ startedAt: START, durationSec: 2520, isFinished: true }, startMs + 9e9)).toBe(2520);
  });

  it('hides a finished workout with no believable duration', () => {
    expect(workoutClockSec({ startedAt: START, durationSec: null, isFinished: true }, startMs)).toBeUndefined();
    expect(workoutClockSec({ startedAt: START, durationSec: MAX_SESSION_SEC + 1, isFinished: true }, startMs)).toBeUndefined();
  });
});

describe('formatWorkoutClock', () => {
  it('reads m:ss under an hour and h:mm:ss after', () => {
    expect(formatWorkoutClock(0)).toBe('0:00');
    expect(formatWorkoutClock(65)).toBe('1:05');
    expect(formatWorkoutClock(754)).toBe('12:34');
    expect(formatWorkoutClock(3599)).toBe('59:59');
    expect(formatWorkoutClock(3600)).toBe('1:00:00');
    expect(formatWorkoutClock(3725)).toBe('1:02:05');
  });
});
