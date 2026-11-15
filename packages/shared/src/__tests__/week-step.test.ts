import { describe, it, expect } from 'vitest';
import { unfinishedInEarlierWeeks, weekStep, WEEK_STEP_COPY, withEarlierCompletions } from '../workout-week-helpers';
import type { WorkoutWeek, WorkoutCompletion } from '../types';

const EXERCISE = { id: 'ex-1', name: 'Squat', sets: 3 };
const CLIENT = 'client-1';

const week = (n: number, dayCount = 2): WorkoutWeek => ({
  id: `week-${n}`,
  weekNumber: n,
  days: Array.from({ length: dayCount }, (_, i) => ({
    id: `w${n}-d${i + 1}`,
    orderIndex: i + 1,
    name: `Day ${i + 1}`,
    exercises: [EXERCISE],
  })),
});

const done = (weekNumber: number, dayNumber: number, status: 'COMPLETED' | 'IN_PROGRESS' = 'COMPLETED'): WorkoutCompletion => ({
  id: `c-${weekNumber}-${dayNumber}`,
  clientId: CLIENT,
  planId: 'plan-1',
  weekId: `week-${weekNumber}`,
  dayId: `w${weekNumber}-d${dayNumber}`,
  status,
  completedAt: status === 'COMPLETED' ? '2026-07-01T10:00:00Z' : undefined,
  completionPct: status === 'COMPLETED' ? 100 : 50,
  exercisesDone: 0,
  exercisesTotal: 0,
});

describe('weekStep', () => {
  it('starts on the current week with only a way back', () => {
    expect(weekStep(3, 3)).toEqual({ viewed: 3, isEarlier: false, canGoBack: true, canGoForward: false });
  });

  it('offers both ways from a week in the middle', () => {
    expect(weekStep(2, 3)).toEqual({ viewed: 2, isEarlier: true, canGoBack: true, canGoForward: true });
  });

  it('has nowhere to go in week 1 of a plan that just started', () => {
    expect(weekStep(1, 1)).toEqual({ viewed: 1, isEarlier: false, canGoBack: false, canGoForward: false });
  });

  it('never shows a week the plan has not reached, or one before week 1', () => {
    expect(weekStep(9, 3).viewed).toBe(3);
    expect(weekStep(0, 3).viewed).toBe(1);
    expect(weekStep(-4, 3).canGoBack).toBe(false);
  });

  it('stays on the current week with nowhere to step until the history has loaded', () => {
    expect(weekStep(1, 3, false)).toEqual({ viewed: 3, isEarlier: false, canGoBack: false, canGoForward: false });
  });
});

describe('withEarlierCompletions', () => {
  it("adds finished workouts from other weeks to this week's", () => {
    const merged = withEarlierCompletions([done(3, 1, 'IN_PROGRESS')], [done(1, 1), done(2, 2)]);
    expect(merged.map((c) => c.id)).toEqual(['c-3-1', 'c-1-1', 'c-2-2']);
  });

  it("keeps this week's version of a workout that is in both", () => {
    const merged = withEarlierCompletions([done(3, 1, 'IN_PROGRESS')], [{ ...done(3, 1), id: 'stale' }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('IN_PROGRESS');
  });
});

describe('unfinishedInEarlierWeeks', () => {
  const weeks = [week(1), week(2), week(3)];

  it('is null when every earlier workout was finished', () => {
    const completions = [done(1, 1), done(1, 2), done(2, 1), done(2, 2)];
    expect(unfinishedInEarlierWeeks(weeks, completions, CLIENT, 3)).toBeNull();
  });

  it('counts what was left behind and points at the earliest week with any', () => {
    // Week 1: one skipped. Week 2: one started and never finished, one skipped.
    const completions = [done(1, 1), done(2, 1, 'IN_PROGRESS')];
    expect(unfinishedInEarlierWeeks(weeks, completions, CLIENT, 3)).toEqual({ count: 3, weekNumber: 1 });
  });

  it('leaves the current week and later ones out', () => {
    expect(unfinishedInEarlierWeeks(weeks, [], CLIENT, 1)).toBeNull();
    expect(unfinishedInEarlierWeeks(weeks, [done(1, 1), done(1, 2)], CLIENT, 2)).toBeNull();
  });

  it("ignores another client's finished workouts", () => {
    const theirs = [{ ...done(1, 1), clientId: 'someone-else' }, { ...done(1, 2), clientId: 'someone-else' }];
    expect(unfinishedInEarlierWeeks(weeks, theirs, CLIENT, 2)).toEqual({ count: 2, weekNumber: 1 });
  });

  it('does not count days with no exercises', () => {
    const withEmptyDay: WorkoutWeek = { ...week(1, 1), days: [...week(1, 1).days, { id: 'empty', orderIndex: 2, name: 'Day 2', exercises: [] }] };
    expect(unfinishedInEarlierWeeks([withEmptyDay, week(2)], [done(1, 1)], CLIENT, 2)).toBeNull();
  });
});

describe('WEEK_STEP_COPY', () => {
  it('counts the unfinished workouts', () => {
    expect(WEEK_STEP_COPY.unfinished(1)).toBe('1 unfinished workout from an earlier week');
    expect(WEEK_STEP_COPY.unfinished(3)).toBe('3 unfinished workouts from earlier weeks');
  });
});
