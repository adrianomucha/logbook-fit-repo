import { describe, expect, it } from 'vitest';
import { buildProgressLog, describeThisWeek, formatWeekTitle, workoutTitle } from '../progress';
import type { PersonalBest } from '../personal-bests';
import { MAX_SESSION_SEC, finishedSessionSec, plausibleSessionSec } from '../session-duration';
import type { WorkoutCompletion, WorkoutPlan } from '../types';

let n = 0;
const done = (iso: string, extra: Partial<WorkoutCompletion> = {}): WorkoutCompletion => ({
  id: `c${n++}`, clientId: 'c', planId: 'p', weekId: '', dayId: `d${n}`, status: 'COMPLETED',
  completionPct: 100, exercisesDone: 5, exercisesTotal: 5, completedAt: iso, ...extra,
});

// Wednesday; weeks start Mon Sep 28, Sep 21, Sep 14, Sep 7
const now = new Date('2026-09-30T12:00:00');

// Every day has an exercise: an empty day isn't a workout
const ex = [{ id: 'sq', name: 'Squat', sets: 3 }];

const plan = {
  id: 'p', name: 'Block A',
  weeks: [
    { id: 'w1', weekNumber: 1, days: [{ id: 'up', name: 'Upper', orderIndex: 1, exercises: ex }, { id: 'lo', name: 'Lower', orderIndex: 2, exercises: ex }] },
    { id: 'w2', weekNumber: 2, days: [{ id: 'up2', name: 'Upper', orderIndex: 1, exercises: ex }, { id: 'lo2', name: 'Lower', orderIndex: 2, exercises: ex }] },
  ],
} as unknown as WorkoutPlan;

const best = (completionId: string, completedAt: string, exerciseName: string, extra: Partial<PersonalBest> = {}): PersonalBest => ({
  exerciseId: exerciseName, exerciseName, completionId, planId: 'p', completedAt, kind: 'weight', weight: 185, reps: 5, delta: 5, ...extra,
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

describe('describeThisWeek', () => {
  const week = (completions: WorkoutCompletion[], weekNumber: number | null = 1, target = 4) =>
    describeThisWeek({ plan, weekNumber, completions, target, now });

  it("leaves out a day the coach hasn't filled in, like the Today tab", () => {
    const withEmptyDay = {
      ...plan,
      weeks: [{ ...plan.weeks[0], days: [...plan.weeks[0].days, { id: 'empty', name: 'Day 3', orderIndex: 3, exercises: [] }] }],
    } as WorkoutPlan;
    const c = [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'up' }), done('2026-09-30T10:00:00', { weekId: 'w1', dayId: 'lo' })];
    const result = describeThisWeek({ plan: withEmptyDay, weekNumber: 1, completions: c, target: 4, now });
    expect(result.target).toBe(2);
    expect(result.rest).toBe('Week complete. Rest up.');
    expect(
      buildProgressLog({ completions: c.map((x) => ({ ...x, planId: 'p' })), plans: [withEmptyDay], weightUnit: 'LB', now })[0].badges
    ).toEqual([{ kind: 'week', text: 'Week 1 complete' }]);
  });

  it("counts the plan week's workouts, like the Today tab, and points at the next one", () => {
    const c = [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'up' })];
    expect(week(c)).toEqual({
      completed: 1,
      target: 2,
      slots: [
        { state: 'done', label: 'Tue' },
        { state: 'next', label: 'Next' },
      ],
      lead: '1 down.',
      rest: '1 to go. Next up, Lower.',
    });
  });

  it('counts a plan-week workout done before Monday, which a calendar count would miss', () => {
    // Upper finished last Sunday, still the plan's week 1
    const c = [done('2026-09-27T10:00:00', { weekId: 'w1', dayId: 'up' })];
    expect(week(c)).toMatchObject({ completed: 1, lead: '1 down.', rest: '1 to go. Next up, Lower.' });
  });

  it('fills circles in the order workouts were done, and names the first one left', () => {
    const c = [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'lo' })];
    expect(week(c)).toMatchObject({ lead: '1 down.', rest: '1 to go. Next up, Upper.' });
  });

  it('shows a started workout instead of the next one, and says to finish it', () => {
    const c = [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'up' })];
    const w = describeThisWeek({ plan, weekNumber: 1, completions: c, target: 4, startedDayId: 'lo', now });
    expect(w.slots).toEqual([
      { state: 'done', label: 'Tue' },
      { state: 'started', label: 'Started' },
    ]);
    expect(w.rest).toBe('1 to go. Finish Lower.');
  });

  it("names workouts the way the client reads them, without the coach's day prefix", () => {
    const named = {
      ...plan,
      weeks: [{ ...plan.weeks[0], days: [{ id: 'up', name: 'Day 5 \u2014 Lower B + Core (Backup)', orderIndex: 1, exercises: ex }] }],
    } as unknown as WorkoutPlan;
    expect(describeThisWeek({ plan: named, weekNumber: 1, completions: [], target: 4, now }).rest).toBe('First up, Lower B + Core.');
    expect(workoutTitle('Day 1: Chest + Lats (Posture Focus)')).toBe('Chest + Lats');
    expect(workoutTitle('Upper A')).toBe('Upper A');
  });

  it('calls a finished plan week done', () => {
    const c = [done('2026-09-28T10:00:00', { weekId: 'w1', dayId: 'up' }), done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'lo' })];
    expect(week(c)).toMatchObject({ lead: 'All 2 done.', rest: 'Week complete. Rest up.' });
    expect(week(c).slots.map((s) => s.state)).toEqual(['done', 'done']);
  });

  it('opens a week and a first week differently', () => {
    expect(week([done('2026-09-24T10:00:00')])).toMatchObject({ lead: 'New week.', rest: 'First up, Upper.' });
    expect(week([])).toMatchObject({ lead: 'Fresh start.', rest: 'First up, Upper.' });
  });

  it('without a plan week, counts sessions since Monday against the target', () => {
    const c = [done('2026-09-29T10:00:00'), done('2026-09-24T10:00:00')];
    expect(week(c, 9)).toMatchObject({ completed: 1, target: 4, lead: '1 down.', rest: '3 to go.' });
    expect(describeThisWeek({ plan: null, weekNumber: null, completions: [], target: 4, now })).toMatchObject({
      lead: 'Fresh start.',
      rest: 'Your first workout kicks things off.',
    });
    const three = ['2026-09-28T10:00:00', '2026-09-29T10:00:00', '2026-09-30T08:00:00'].map((d) => done(d));
    expect(week(three, 9, 2).lead).toBe('3 done.');
  });
});

describe('formatWeekTitle', () => {
  it('names recent weeks, and dates the rest', () => {
    expect(formatWeekTitle(new Date('2026-09-28T00:00:00'), now)).toBe('This week');
    expect(formatWeekTitle(new Date('2026-09-21T00:00:00'), now)).toBe('Last week');
    expect(formatWeekTitle(new Date('2026-09-14T00:00:00'), now)).toBe('Sep 14 – 20');
    expect(formatWeekTitle(new Date('2026-08-31T00:00:00'), now)).toBe('Aug 31 – Sep 6');
    expect(formatWeekTitle(new Date('2025-12-29T00:00:00'), now)).toBe('Dec 29 – Jan 4');
    expect(formatWeekTitle(new Date('2025-12-22T00:00:00'), now)).toBe('Dec 22 – 28, 2025');
  });
});

describe('buildProgressLog', () => {
  const log = (completions: WorkoutCompletion[], extra: Partial<Parameters<typeof buildProgressLog>[0]> = {}) =>
    buildProgressLog({ completions, plans: [plan], weightUnit: 'LB', now, ...extra });
  const entries = (weeks: ReturnType<typeof log>) => weeks.flatMap((w) => w.entries);

  it('lists every workout in its week, newest week first and each week in order', () => {
    const c = [
      done('2026-09-15T10:00:00', { id: 'a', weekId: 'w1', dayId: 'up' }),
      done('2026-09-24T10:00:00', { id: 'c', dayName: 'Day 3: Legs (Heavy)' }),
      done('2026-09-22T10:00:00', { id: 'b', dayName: 'Arms' }),
    ];
    const weeks = log(c);
    expect(weeks.map((w) => [w.title, w.summary])).toEqual([
      ['Last week', '2 workouts'],
      ['Sep 14 – 20', '1 workout'],
    ]);
    expect(weeks[0].entries.map((e) => [e.weekday, e.date, e.title])).toEqual([
      ['Tue', '22', 'Arms'],
      ['Thu', '24', 'Legs'],
    ]);
    expect(weeks[1].entries[0]).toMatchObject({ kind: 'workout', title: 'Upper', wins: [{ kind: 'milestone', label: 'First workout logged' }] });
  });

  it('leaves out weeks with nothing in them', () => {
    const weeks = log([done('2026-08-31T10:00:00'), done('2026-09-29T10:00:00')]);
    expect(weeks.map((w) => w.title)).toEqual(['This week', 'Aug 31 – Sep 6']);
  });

  it('counts milestones from the lifetime total when older history is cut off', () => {
    // 8 workouts before the year we were given, then 3 more: the 10th is the second here
    const c = ['2026-09-01T10:00:00', '2026-09-03T10:00:00', '2026-09-05T10:00:00'].map((d) => done(d));
    const wins = entries(log(c, { totalWorkouts: 11 })).map((e) => e.wins);
    expect(wins).toEqual([[], [{ kind: 'milestone', label: '10 workouts logged' }], []]);
  });

  it('puts each best, with its numbers, on the workout it came from', () => {
    const c = [done('2026-09-25T10:00:00'), done('2026-09-29T10:00:00', { id: 'x', weekId: 'w1', dayId: 'up' })];
    const weeks = log(c, {
      personalBests: [best('x', '2026-09-29T10:00:00', 'Bench Press'), best('x', '2026-09-29T10:00:00', 'Row', { kind: 'reps', weight: null, reps: 12, delta: 2 })],
    });
    expect(weeks[0].entries[0]).toMatchObject({
      title: 'Upper',
      wins: [
        { kind: 'best', label: 'Bench Press', detail: '185 lb × 5, up 5 lb' },
        { kind: 'best', label: 'Row', detail: '12 reps, 2 more reps' },
      ],
    });
  });

  it('marks a comeback after two weeks off', () => {
    const weeks = log([done('2026-09-01T10:00:00'), done('2026-09-29T10:00:00', { dayName: 'Push' })]);
    expect(weeks[0].entries[0]).toMatchObject({ title: 'Push', wins: [{ kind: 'comeback', label: 'Back after 4 weeks off' }] });
  });

  it('badges the week a run of weeks reaches a milestone', () => {
    const c = ['2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00', '2026-09-29T10:00:00'].map((d) => done(d));
    expect(log(c).map((w) => w.badges)).toEqual([[{ kind: 'streak', text: '3 weeks in a row' }], [], []]);
  });

  it('gives no streak badge to a run that may have started before the history we have', () => {
    const c = ['2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00'].map((d) => done(d));
    expect(log(c, { totalWorkouts: 40 }).flatMap((w) => w.badges)).toEqual([]);
  });

  it('says when a run beats every earlier one', () => {
    // Two weeks in August, a break, then three in a row
    const c = ['2026-08-03T10:00:00', '2026-08-10T10:00:00', '2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00'].map((d) => done(d));
    expect(log(c)[0].badges).toEqual([{ kind: 'streak', text: '3 weeks in a row, your longest yet' }]);
  });

  it('badges a finished plan week on the week its last workout fell in', () => {
    const c = [
      done('2026-09-25T10:00:00', { weekId: 'w2', dayId: 'up2' }),
      done('2026-09-29T10:00:00', { id: 'fin', weekId: 'w2', dayId: 'lo2' }),
    ];
    const weeks = log(c);
    expect(weeks[0].badges).toEqual([{ kind: 'week', text: 'Week 2 complete' }]);
    expect(weeks[1].badges).toEqual([]);
  });

  it("puts the coach's replies in the week they came, in order with the workouts", () => {
    const checkIns = [
      { id: 'k1', status: 'completed' as const, coachResponse: ' Great depth on those squats. ', completedAt: '2026-09-29T20:00:00' },
      { id: 'k2', status: 'responded' as const, coachResponse: undefined, completedAt: undefined },
    ];
    const weeks = log([done('2026-09-28T10:00:00', { dayName: 'Legs' }), done('2026-09-30T10:00:00', { dayName: 'Arms' })], { checkIns, coachName: 'Sam Rivera' });
    expect(weeks[0].summary).toBe('2 workouts');
    expect(weeks[0].entries.map((e) => [e.kind, e.title])).toEqual([
      ['workout', 'Legs'],
      ['coach', 'Sam on your check-in'],
      ['workout', 'Arms'],
    ]);
    expect(weeks[0].entries[1]).toMatchObject({ weekday: 'Tue', date: '29', note: 'Great depth on those squats.' });
    expect(weeks[0].entries.map((e) => e.firstOfDay)).toEqual([true, true, true]);
    const sameDay = log([done('2026-09-29T08:00:00', { dayName: 'Legs' })], { checkIns, coachName: 'Sam Rivera' });
    expect(sameDay[0].entries.map((e) => [e.title, e.firstOfDay])).toEqual([
      ['Legs', true],
      ['Sam on your check-in', false],
    ]);
    // A week with only the coach's note has no workout count
    expect(log([], { checkIns }).map((w) => [w.title, w.summary])).toEqual([['This week', '']]);
  });

  it('skips sessions that were never finished', () => {
    expect(log([done('2026-09-29T10:00:00', { status: 'IN_PROGRESS' })])).toEqual([]);
  });
});
