import { describe, expect, it } from 'vitest';
import { buildWorkoutHistory, formatStreakLine, historyWeekLabel, weeksTrainedStreak } from '../progress';
import { MAX_SESSION_SEC, finishedSessionSec, plausibleSessionSec } from '../session-duration';
import type { WorkoutCompletion, WorkoutPlan } from '../types';

let n = 0;
const done = (iso: string, extra: Partial<WorkoutCompletion> = {}): WorkoutCompletion => ({
  id: `c${n++}`, clientId: 'c', planId: 'p', weekId: '', dayId: `d${n}`, status: 'COMPLETED',
  completionPct: 100, exercisesDone: 5, exercisesTotal: 5, completedAt: iso, ...extra,
});

// Wednesday; weeks start Mon Sep 28, Sep 21, Sep 14, Sep 7
const now = new Date('2026-09-30T12:00:00');

describe('weeksTrainedStreak', () => {
  it('counts back through weeks with any session, below target or not', () => {
    const c = ['2026-09-29T10:00:00', '2026-09-22T10:00:00', '2026-09-15T10:00:00', '2026-09-01T10:00:00'].map((d) => done(d));
    expect(weeksTrainedStreak(c, now)).toBe(3);
  });

  it("doesn't break on a week still in progress", () => {
    const c = ['2026-09-22T10:00:00', '2026-09-15T10:00:00'].map((d) => done(d));
    expect(weeksTrainedStreak(c, now)).toBe(2);
  });

  it('is zero once a whole week is missed', () => {
    expect(weeksTrainedStreak([done('2026-09-15T10:00:00')], now)).toBe(0);
  });

  it('only reads as a line from two weeks up', () => {
    expect(formatStreakLine(0)).toBeNull();
    expect(formatStreakLine(1)).toBeNull();
    expect(formatStreakLine(6)).toBe('6 weeks in a row');
  });
});

describe('session duration', () => {
  it('treats a session left open for days as unknown', () => {
    expect(plausibleSessionSec(40 * 60)).toBe(2400);
    expect(plausibleSessionSec((139 * 60 + 10) * 60)).toBeUndefined();
    expect(plausibleSessionSec(0)).toBeUndefined();
  });

  it('falls back to the span of logged sets when Start → Finish is implausible', () => {
    const start = new Date('2026-09-19T09:00:00');
    const finish = new Date('2026-09-25T08:00:00');
    expect(
      finishedSessionSec(start, finish, { first: new Date('2026-09-19T09:05:00'), last: new Date('2026-09-19T09:45:00') })
    ).toBe(40 * 60);
    expect(finishedSessionSec(start, finish)).toBeNull();
    expect(finishedSessionSec(start, new Date('2026-09-19T09:30:00'))).toBe(30 * 60);
    expect(finishedSessionSec(null, finish)).toBeNull();
    expect(MAX_SESSION_SEC).toBe(4 * 3600);
  });
});

describe('historyWeekLabel', () => {
  it('names the recent weeks and ranges the rest', () => {
    expect(historyWeekLabel(new Date('2026-09-28T00:00:00'), now)).toBe('This week');
    expect(historyWeekLabel(new Date('2026-09-21T00:00:00'), now)).toBe('Last week');
    expect(historyWeekLabel(new Date('2026-09-14T00:00:00'), now)).toBe('Sep 14 – 20');
    expect(historyWeekLabel(new Date('2026-08-31T00:00:00'), now)).toBe('Aug 31 – Sep 6');
    expect(historyWeekLabel(new Date('2025-12-29T00:00:00'), now)).toBe('Dec 29 – Jan 4, 2026');
    expect(historyWeekLabel(new Date('2025-12-15T00:00:00'), now)).toBe('Dec 15 – 21, 2025');
  });
});

describe('buildWorkoutHistory', () => {
  const plan = {
    id: 'p', name: 'Block A',
    weeks: [{ id: 'w1', weekNumber: 1, days: [{ id: 'day1', name: 'Chest + Lats', exercises: [] }] }],
  } as unknown as WorkoutPlan;

  it('groups by week, newest first', () => {
    const c = [
      done('2026-09-29T10:00:00', { id: 'a', planId: 'p', weekId: 'w1', dayId: 'day1', setsDone: 15, durationSec: 2400 }),
      done('2026-09-27T10:00:00', { id: 'b', planId: 'old', dayName: 'Lower', setsDone: 15 }),
      done('2026-09-26T10:00:00', { id: 'c', planId: 'old', dayName: 'Upper', setsDone: 12 }),
    ];
    const weeks = buildWorkoutHistory(c, [plan], [{ completionId: 'a' }], now);
    expect(weeks.map((w) => w.label)).toEqual(['This week', 'Last week']);
    expect(weeks[0].entries[0]).toMatchObject({ name: 'Chest + Lats', date: 'Tue 29', bests: 1 });
    // Older plans aren't loaded — the server's day name stands in
    expect(weeks[1].entries.map((e) => [e.name, e.date, e.bests])).toEqual([
      ['Lower', 'Sun 27', 0],
      ['Upper', 'Sat 26', 0],
    ]);
  });

  it('marks partial sessions', () => {
    const c = [done('2026-09-29T10:00:00'), done('2026-09-27T10:00:00', { exercisesDone: 2 })];
    const entries = buildWorkoutHistory(c, [], [], now).flatMap((w) => w.entries);
    expect(entries.map((e) => e.partial)).toEqual([false, true]);
    expect(entries.map((e) => e.partialLabel)).toEqual([undefined, '2 of 5 exercises']);
  });

  it('skips sessions that were never finished', () => {
    expect(buildWorkoutHistory([done('2026-09-29T10:00:00', { status: 'IN_PROGRESS' })], [], [], now)).toEqual([]);
  });
});
