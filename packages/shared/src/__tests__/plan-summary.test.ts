import { describe, expect, it } from 'vitest';
import type { WorkoutCompletion, WorkoutPlan } from '../types';
import { describeMisses, formatTrainingTime, summarizeCompletedPlan } from '../plan-summary';

function plan(weeks: number, perWeek: number, restDaysPerWeek = 0): WorkoutPlan {
  return {
    id: 'p1',
    name: 'Block',
    durationWeeks: weeks,
    createdAt: '',
    updatedAt: '',
    weeks: Array.from({ length: weeks }, (_, w) => ({
      id: `w${w + 1}`,
      weekNumber: w + 1,
      days: [
        ...Array.from({ length: perWeek }, (_, d) => ({
          id: `w${w + 1}d${d + 1}`,
          name: `Day ${d + 1}`,
          exercises: [{} as never],
        })),
        ...Array.from({ length: restDaysPerWeek }, (_, d) => ({
          id: `w${w + 1}rest${d + 1}`,
          name: 'Rest',
          exercises: [],
        })),
      ],
    })),
  };
}

function done(dayId: string, overrides: Partial<WorkoutCompletion> = {}): WorkoutCompletion {
  return {
    id: `c-${dayId}`,
    clientId: 'c1',
    planId: 'p1',
    weekId: '',
    dayId,
    status: 'COMPLETED',
    completionPct: 100,
    exercisesDone: 1,
    exercisesTotal: 1,
    durationSec: 3600,
    ...overrides,
  };
}

describe('describeMisses', () => {
  const w = (...nums: number[]) => nums.map((weekNumber) => ({ weekNumber }));

  it('celebrates a clean sweep', () => {
    expect(describeMisses([])).toBe('Didn’t miss a single session.');
  });

  it('names a single week', () => {
    expect(describeMisses(w(5))).toBe('Missed 1 session, in week 5.');
    expect(describeMisses(w(5, 5))).toBe('Missed 2 sessions, both in week 5.');
    expect(describeMisses(w(5, 5, 5))).toBe('Missed 3 sessions, all in week 5.');
  });

  it('calls out the week holding most of the misses', () => {
    expect(describeMisses(w(3, 5, 5, 5, 7))).toBe('Missed 5 sessions, 3 of them in week 5.');
  });

  it('lists up to three weeks, then just counts them', () => {
    expect(describeMisses(w(6, 10))).toBe('Missed 2 sessions across weeks 6 and 10.');
    expect(describeMisses(w(1, 4, 9))).toBe('Missed 3 sessions across weeks 1, 4 and 9.');
    expect(describeMisses(w(2, 4, 7, 9, 10))).toBe('Missed 5 sessions across 5 weeks.');
  });
});

describe('formatTrainingTime', () => {
  it('uses minutes under an hour and tenths of hours above', () => {
    expect(formatTrainingTime(45 * 60)).toEqual(['45', 'min']);
    expect(formatTrainingTime(49.2 * 3600)).toEqual(['49.2', 'h']);
    expect(formatTrainingTime(2 * 3600)).toEqual(['2', 'h']);
  });
});

describe('summarizeCompletedPlan', () => {
  it('counts training days only and ignores rest days', () => {
    const s = summarizeCompletedPlan(plan(2, 3, 2), ['w1d1', 'w1d2', 'w1d3', 'w2d1', 'w2d2'].map((id) => done(id)));
    expect(s).toMatchObject({ weekCount: 2, planned: 6, completed: 5, pct: 83 });
    expect(s.missNote).toBe('Missed 1 session, in week 2.');
  });

  it('ignores other plans and unfinished sessions', () => {
    const s = summarizeCompletedPlan(plan(1, 2), [
      done('w1d1'),
      done('w1d2', { planId: 'older-plan' }),
      done('w1d2', { status: 'IN_PROGRESS' }),
    ]);
    expect(s.completed).toBe(1);
  });

  it('averages duration over timed sessions only', () => {
    const s = summarizeCompletedPlan(plan(1, 3), [
      done('w1d1', { durationSec: 3000 }),
      done('w1d2', { durationSec: 3600 }),
      done('w1d3', { durationSec: undefined }),
    ]);
    expect(s.trainedSec).toBe(6600);
    expect(s.avgSessionMin).toBe(55);
  });

  it('counts only elapsed weeks for a plan in progress', () => {
    // Week 1: 2 of 3 · week 2 (current): 1 done so far · week 3: not reached
    const s = summarizeCompletedPlan(plan(3, 3), ['w1d1', 'w1d2', 'w2d1'].map((id) => done(id)), { throughWeek: 2 });
    expect(s).toMatchObject({ planned: 4, completed: 3, pct: 75 });
    expect(s.missNote).toBe('Missed 1 session, in week 1.');
  });

  it('handles a plan with nothing planned', () => {
    const s = summarizeCompletedPlan(plan(2, 0), []);
    expect(s).toMatchObject({ planned: 0, pct: 0, avgSessionMin: null });
  });
});
