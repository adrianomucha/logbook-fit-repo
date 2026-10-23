import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRawWeekNumber,
  getCurrentWeekNumber,
  getPlanProgressStatus,
  getPlanStartsOn,
  getPlanEndsOn,
  getWeekDays,
  getActiveWorkout,
  isWorkoutDay,
  workoutMark,
  WORKOUT_MARK_LABEL,
  type WeekDayInfo,
} from '../workout-week-helpers';
import type { WorkoutWeek, WorkoutCompletion } from '@/types';

const EXERCISE = { id: 'ex-1', name: 'Squat', sets: 3 };

// Instants are UTC; the timezone argument decides whose calendar they land on
const at = (iso: string) => new Date(iso);
// Wednesday, July 15 2026, noon UTC
const NOW = at('2026-07-15T12:00:00Z');

describe('week math (Monday-anchored, on the client\'s calendar)', () => {
  describe('getRawWeekNumber', () => {
    it('is week 1 during the week the plan starts', () => {
      expect(getRawWeekNumber(at('2026-07-13T09:00:00Z'), 'UTC', NOW)).toBe(1); // started Monday
    });

    it('anchors to the Monday of the start week for mid-week starts', () => {
      // Started Wednesday July 1 → anchor Monday June 29 → 16 days → week 3
      expect(getRawWeekNumber(at('2026-07-01T12:00:00Z'), 'UTC', NOW)).toBe(3);
      expect(getRawWeekNumber(at('2026-06-29T12:00:00Z'), 'UTC', NOW)).toBe(3);
    });

    it('keeps counting past the plan duration (unclamped)', () => {
      expect(getRawWeekNumber(at('2026-05-04T12:00:00Z'), 'UTC', NOW)).toBe(11);
    });

    it("keeps a Sunday-evening workout in Los Angeles in Sunday's week", () => {
      const start = at('2026-10-05T17:00:00Z'); // Monday 10:00 in LA
      const sundayEvening = at('2026-10-12T01:00:00Z'); // Sunday 18:00 in LA, Monday in UTC
      expect(getRawWeekNumber(start, 'America/Los_Angeles', sundayEvening)).toBe(1);
      // The same instant on a UTC calendar is already week 2
      expect(getRawWeekNumber(start, 'UTC', sundayEvening)).toBe(2);
    });

    it('turns the week on Monday morning in Sydney, not at 10am', () => {
      const start = at('2026-10-04T23:00:00Z'); // Monday 10:00 in Sydney
      const mondayMorning = at('2026-10-11T22:00:00Z'); // next Monday 09:00 in Sydney
      expect(getRawWeekNumber(start, 'Australia/Sydney', mondayMorning)).toBe(2);
    });

    it('places the start on the client\'s calendar too', () => {
      // Assigned Sunday 20:00 in LA (Monday 03:00 UTC): their week 1 began
      // the Monday before, so by their Monday it is week 2
      const start = at('2026-10-12T03:00:00Z');
      expect(getRawWeekNumber(start, 'America/Los_Angeles', at('2026-10-12T16:00:00Z'))).toBe(2);
    });

    it('falls back to UTC for an unknown or invalid timezone', () => {
      expect(getRawWeekNumber(at('2026-07-13T09:00:00Z'), null, NOW)).toBe(1);
      expect(getRawWeekNumber(at('2026-07-13T09:00:00Z'), 'Not/AZone', NOW)).toBe(1);
    });

    it('is 0 before a plan set to start next Monday', () => {
      expect(getRawWeekNumber(at('2026-07-20T00:00:00Z'), 'UTC', NOW)).toBe(0);
    });
  });

  describe('getCurrentWeekNumber', () => {
    it('clamps to the plan duration', () => {
      expect(getCurrentWeekNumber('2026-06-29T12:00:00Z', 2, 'UTC', NOW)).toBe(2);
      expect(getCurrentWeekNumber('2026-06-29T12:00:00Z', 4, 'UTC', NOW)).toBe(3);
    });

    it('shows week 1 before the plan starts', () => {
      expect(getCurrentWeekNumber('2026-07-20T00:00:00Z', 4, 'UTC', NOW)).toBe(1);
    });
  });

  describe('getPlanProgressStatus', () => {
    it('is UPCOMING before the start Monday', () => {
      expect(getPlanProgressStatus(at('2026-07-20T00:00:00Z'), 4, 'UTC', NOW)).toBe('UPCOMING');
    });

    it('is ACTIVE before the final week', () => {
      expect(getPlanProgressStatus(at('2026-06-29T12:00:00Z'), 4, 'UTC', NOW)).toBe('ACTIVE');
    });

    it('is FINAL_WEEK during the last week', () => {
      expect(getPlanProgressStatus(at('2026-06-29T12:00:00Z'), 3, 'UTC', NOW)).toBe('FINAL_WEEK');
      expect(getPlanProgressStatus(at('2026-07-13T12:00:00Z'), 1, 'UTC', NOW)).toBe('FINAL_WEEK');
    });

    it('is ENDED once the raw week passes the duration', () => {
      expect(getPlanProgressStatus(at('2026-06-29T12:00:00Z'), 2, 'UTC', NOW)).toBe('ENDED');
      expect(getPlanProgressStatus(at('2026-05-04T12:00:00Z'), 4, 'UTC', NOW)).toBe('ENDED');
    });
  });

  describe('getPlanStartsOn / getPlanEndsOn', () => {
    it('names the start day only while it is ahead', () => {
      // Local midnight of Monday July 20 in Warsaw is 22:00 UTC the day before
      const monday = at('2026-07-19T22:00:00Z');
      expect(getPlanStartsOn(monday, 'Europe/Warsaw', NOW)).toBe('2026-07-20');
      expect(getPlanStartsOn(monday, 'Europe/Warsaw', at('2026-07-20T06:00:00Z'))).toBeNull();
    });

    it('ends on the Sunday closing the final week', () => {
      expect(getPlanEndsOn(at('2026-07-15T12:00:00Z'), 4, 'UTC')).toBe('2026-08-09');
      expect(getPlanEndsOn(at('2026-07-19T22:00:00Z'), 1, 'Europe/Warsaw')).toBe('2026-07-26');
    });
  });
});

describe('days with no exercises', () => {
  const week: WorkoutWeek = {
    id: 'week-1',
    weekNumber: 1,
    days: [
      { id: 'day-1', orderIndex: 1, name: 'Push', exercises: [EXERCISE] },
      { id: 'day-2', orderIndex: 2, name: 'Day 2', exercises: [] },
      { id: 'day-3', orderIndex: 3, name: 'Legs', exercises: [EXERCISE] },
    ],
  };

  it("aren't workouts", () => {
    expect(isWorkoutDay(week.days[0])).toBe(true);
    expect(isWorkoutDay(week.days[1])).toBe(false);
  });

  it("are left out of the week, so they're never next up or counted", () => {
    const days = getWeekDays(week, [], 'client-1');
    expect(days.map((d) => d.workoutDay.id)).toEqual(['day-1', 'day-3']);
    // The plan's own numbering survives
    expect(days.map((d) => d.orderIndex)).toEqual([1, 3]);

    const afterPush = getWeekDays(
      week,
      [{
        id: 'wc-1', clientId: 'client-1', planId: 'plan-1', weekId: 'week-1', dayId: 'day-1',
        status: 'COMPLETED', completedAt: '2026-07-14T12:00:00Z', completionPct: 100,
        exercisesDone: 1, exercisesTotal: 1,
      }],
      'client-1'
    );
    expect(afterPush.find((d) => d.status === 'CURRENT')?.workoutDay.id).toBe('day-3');
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
      { id: 'day-1', orderIndex: 1, name: 'Push', exercises: [EXERCISE] },
      { id: 'day-2', orderIndex: 2, name: 'Pull', exercises: [EXERCISE] },
      { id: 'day-3', orderIndex: 3, name: 'Legs', exercises: [EXERCISE] },
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

describe('workoutMark', () => {
  const row = (status: WeekDayInfo['status'], completionStatus?: WorkoutCompletion['status']) =>
    ({ status, completion: completionStatus ? { status: completionStatus } : undefined }) as WeekDayInfo;

  it('reads a week-list row the way the Progress stepper draws it', () => {
    expect(workoutMark(row('COMPLETED', 'COMPLETED'))).toBe('done');
    expect(workoutMark(row('CURRENT', 'IN_PROGRESS'))).toBe('started');
    expect(workoutMark(row('UPCOMING', 'IN_PROGRESS'))).toBe('started');
    expect(workoutMark(row('CURRENT'))).toBe('next');
    expect(workoutMark(row('UPCOMING'))).toBe('upcoming');
    expect([WORKOUT_MARK_LABEL.next, WORKOUT_MARK_LABEL.started]).toEqual(['Next', 'Started']);
  });
});
