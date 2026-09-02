import { describe, expect, it } from 'vitest';
import {
  IDLE_TIMER,
  elapsedSeconds,
  formatClock,
  pauseTimer,
  remainingSeconds,
  resetTimer,
  startTimer,
  tickTimer,
} from '../set-timer';

describe('set timer state machine', () => {
  it('starts idle with nothing elapsed', () => {
    expect(IDLE_TIMER.status).toBe('idle');
    expect(elapsedSeconds(IDLE_TIMER, 1000)).toBe(0);
    expect(remainingSeconds(60, IDLE_TIMER, 1000)).toBe(60);
  });

  it('computes elapsed time from wall-clock timestamps while running', () => {
    const running = startTimer(IDLE_TIMER, 10_000);
    expect(running.status).toBe('running');
    expect(elapsedSeconds(running, 10_000)).toBe(0);
    expect(elapsedSeconds(running, 22_400)).toBe(12);
    // Suspended tab: no ticks fired, but the wall clock moved on.
    expect(elapsedSeconds(running, 70_000)).toBe(60);
  });

  it('counts down with ceil so the display only reaches 0 at the buzzer', () => {
    const running = startTimer(IDLE_TIMER, 0);
    expect(remainingSeconds(60, running, 0)).toBe(60);
    expect(remainingSeconds(60, running, 1)).toBe(60);
    expect(remainingSeconds(60, running, 999)).toBe(60);
    expect(remainingSeconds(60, running, 1000)).toBe(59);
    expect(remainingSeconds(60, running, 59_500)).toBe(1);
    expect(remainingSeconds(60, running, 60_000)).toBe(0);
    expect(remainingSeconds(60, running, 99_000)).toBe(0);
  });

  it('pauses and resumes without losing accumulated time', () => {
    let s = startTimer(IDLE_TIMER, 0);
    s = pauseTimer(s, 15_000);
    expect(s.status).toBe('paused');
    expect(s.startedAt).toBeNull();
    expect(elapsedSeconds(s, 999_999)).toBe(15);

    s = startTimer(s, 100_000);
    expect(s.status).toBe('running');
    expect(elapsedSeconds(s, 110_000)).toBe(25);
    expect(remainingSeconds(60, s, 110_000)).toBe(35);
  });

  it('ignores pause when not running and start when already running', () => {
    expect(pauseTimer(IDLE_TIMER, 5)).toBe(IDLE_TIMER);
    const running = startTimer(IDLE_TIMER, 0);
    expect(startTimer(running, 500)).toBe(running);
  });

  it('finishes exactly at the target and freezes the elapsed time there', () => {
    const running = startTimer(IDLE_TIMER, 0);
    expect(tickTimer(running, 30, 29_999)).toBe(running);

    // A late tick (tab was asleep) still lands on the prescribed seconds.
    const done = tickTimer(running, 30, 47_000);
    expect(done.status).toBe('done');
    expect(elapsedSeconds(done, 47_000)).toBe(30);
    expect(remainingSeconds(30, done, 999_999)).toBe(0);

    // Done is terminal until reset.
    expect(startTimer(done, 50_000)).toBe(done);
    expect(resetTimer()).toBe(IDLE_TIMER);
  });

  it('never finishes a count-up timer on its own', () => {
    const running = startTimer(IDLE_TIMER, 0);
    expect(tickTimer(running, undefined, 1_000_000)).toBe(running);
    expect(tickTimer(running, 0, 1_000_000)).toBe(running);
  });
});

describe('formatClock', () => {
  it('renders m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(45)).toBe('0:45');
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3600)).toBe('60:00');
  });

  it('rounds and clamps odd inputs', () => {
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(59.6)).toBe('1:00');
  });
});
