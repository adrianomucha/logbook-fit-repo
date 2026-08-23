import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRawWeekNumber,
  getCurrentWeekNumber,
  getPlanProgressStatus,
  getWeekDays,
  getActiveWorkout,
} from '../workout-week-helpers';
import type { WorkoutWeek, WorkoutCompletion } from '@/types';

describe('week math (Monday-anchored)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday, July 15 2026
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRawWeekNumber', () => {
    it('is week 1 during the week the plan starts', () => {
      expect(getRawWeekNumber('2026-07-13')).toBe(1); // started Monday
    });

    it('anchors to the Monday of the start week for mid-week starts', () => {
      // Started Wednesday July 1 → anchor Monday June 29 → 16 days → week 3
      expect(getRawWeekNumber('2026-07-01')).toBe(3);
      expect(getRawWeekNumber('2026-06-29')).toBe(3);
    });

    it('keeps counting past the plan duration (unclamped)', () => {
      expect(getRawWeekNumber('2026-05-04')).toBe(11);
    });
  });

  describe('getCurrentWeekNumber', () => {
    it('clamps to the plan duration', () => {
      expect(getCurrentWeekNumber('2026-06-29', 2)).toBe(2);
      expect(getCurrentWeekNumber('2026-06-29', 4)).toBe(3);
    });
  });

  describe('getPlanProgressStatus', () => {
    it('is ACTIVE before the final week', () => {
      expect(getPlanProgressStatus('2026-06-29', 4)).toBe('ACTIVE');
    });

    it('is FINAL_WEEK during the last week', () => {
      expect(getPlanProgressStatus('2026-06-29', 3)).toBe('FINAL_WEEK');
      expect(getPlanProgressStatus('2026-07-13', 1)).toBe('FINAL_WEEK');
    });

    it('is ENDED once the raw week passes the duration', () => {
      expect(getPlanProgressStatus('2026-06-29', 2)).toBe('ENDED');
      expect(getPlanProgressStatus('2026-05-04', 4)).toBe('ENDED');
    });
  });
});

describe('getActiveWorkout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday, July 15 2026, noon local
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const CLIENT_ID = 'client-1';

  const week: WorkoutWeek = {
    id: 'week-1',
    weekNumber: 1,
    days: [
      { id: 'day-1', orderIndex: 1, name: 'Push', exercises: [] },
      { id: 'day-2', orderIndex: 2, name: 'Pull', exercises: [] },
      { id: 'day-3', orderIndex: 3, name: 'Legs', exercises: [] },
    ],
  };

  const completion = (
    dayId: string,
    status: WorkoutCompletion['status'],
    completedAt?: string
  ): WorkoutCompletion => ({
    id: `wc-${dayId}`,
    clientId: CLIENT_ID,
    planId: 'plan-1',
    weekId: 'week-1',
    dayId,
    status,
    completedAt,
    completionPct: status === 'COMPLETED' ? 100 : 50,
    exercisesDone: 0,
    exercisesTotal: 0,
  });

  const active = (completions: WorkoutCompletion[]) =>
    getActiveWorkout(getWeekDays(week, completions, CLIENT_ID));

  it('returns the first workout when nothing is started', () => {
    expect(active([])?.workoutDay.id).toBe('day-1');
  });

  it('stays on a workout completed today instead of advancing to the next one', () => {
    const result = active([
      completion('day-1', 'COMPLETED', '2026-07-15T10:00:00'),
    ]);
    expect(result?.workoutDay.id).toBe('day-1');
    expect(result?.completion?.status).toBe('COMPLETED');
  });

  it('advances to the next workout the day after a completion', () => {
    expect(
      active([completion('day-1', 'COMPLETED', '2026-07-14T18:00:00')])
        ?.workoutDay.id
    ).toBe('day-2');
  });

  it('prefers an in-progress workout over one completed today', () => {
    expect(
      active([
        completion('day-1', 'COMPLETED', '2026-07-15T10:00:00'),
        completion('day-2', 'IN_PROGRESS'),
      ])?.workoutDay.id
    ).toBe('day-2');
  });

  it('picks the most recent completion when several finished today', () => {
    expect(
      active([
        completion('day-1', 'COMPLETED', '2026-07-15T09:00:00'),
        completion('day-2', 'COMPLETED', '2026-07-15T11:00:00'),
      ])?.workoutDay.id
    ).toBe('day-2');
  });

  it('falls back to the last workout when the whole week is done', () => {
    expect(
      active([
        completion('day-1', 'COMPLETED', '2026-07-12T09:00:00'),
        completion('day-2', 'COMPLETED', '2026-07-13T09:00:00'),
        completion('day-3', 'COMPLETED', '2026-07-14T09:00:00'),
      ])?.workoutDay.id
    ).toBe('day-3');
  });
});
