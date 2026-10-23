import { describe, expect, it } from 'vitest';
import { buildProgressStory, describeThisWeek, formatMomentWhen, workoutTitle } from '../progress';
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

const plan = {
  id: 'p', name: 'Block A',
  weeks: [
    { id: 'w1', weekNumber: 1, days: [{ id: 'up', name: 'Upper', orderIndex: 1, exercises: [] }, { id: 'lo', name: 'Lower', orderIndex: 2, exercises: [] }] },
    { id: 'w2', weekNumber: 2, days: [{ id: 'up2', name: 'Upper', orderIndex: 1, exercises: [] }, { id: 'lo2', name: 'Lower', orderIndex: 2, exercises: [] }] },
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
      weeks: [{ ...plan.weeks[0], days: [{ id: 'up', name: 'Day 5 \u2014 Lower B + Core (Backup)', orderIndex: 1, exercises: [] }] }],
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

describe('formatMomentWhen', () => {
  it('says when relative to now', () => {
    expect(formatMomentWhen('2026-09-30T08:00:00', now)).toBe('Today');
    expect(formatMomentWhen('2026-09-29T08:00:00', now)).toBe('Yesterday');
    expect(formatMomentWhen('2026-09-27T08:00:00', now)).toBe('Sunday');
    expect(formatMomentWhen('2026-09-11T08:00:00', now)).toBe('Sep 11');
    expect(formatMomentWhen('2025-12-11T08:00:00', now)).toBe('Dec 11, 2025');
  });
});

describe('buildProgressStory', () => {
  const story = (completions: WorkoutCompletion[], extra: Partial<Parameters<typeof buildProgressStory>[0]> = {}) =>
    buildProgressStory({ completions, plans: [plan], weightUnit: 'LB', now, ...extra });

  it('opens with the first workout and folds ordinary ones between moments', () => {
    const c = [
      done('2026-09-15T10:00:00', { id: 'a', weekId: 'w1', dayId: 'up' }),
      done('2026-09-22T10:00:00', { id: 'b', dayName: 'Arms' }),
      done('2026-09-23T10:00:00', { id: 'c', dayName: 'Legs' }),
    ];
    const s = story(c);
    expect(s.map((m) => [m.kind, m.title])).toEqual([
      ['quiet', '+ 2 workouts'],
      ['milestone', 'First workout logged'],
    ]);
    expect(s[0].sessions).toEqual(['Legs · Wed 23', 'Arms · Tue 22']);
    expect(s[1]).toMatchObject({ when: 'Sep 15', detail: 'Upper. This is where it starts.' });
  });

  it('counts milestones from the lifetime total when older history is cut off', () => {
    // 8 workouts before the year we were given, then 3 more: the 10th is the second here
    const c = ['2026-09-01T10:00:00', '2026-09-03T10:00:00', '2026-09-05T10:00:00'].map((d) => done(d));
    const s = story(c, { totalWorkouts: 11 });
    expect(s.filter((m) => m.kind === 'milestone')).toEqual([
      expect.objectContaining({ title: '10 workouts logged', when: 'Sep 3', detail: undefined }),
    ]);
  });

  it('names a single best with its gain, and groups several from one session', () => {
    const c = [done('2026-09-01T10:00:00'), done('2026-09-29T10:00:00', { id: 'x', weekId: 'w1', dayId: 'up' })];
    const one = story(c, { personalBests: [best('x', '2026-09-29T10:00:00', 'Bench Press')] });
    expect(one[0]).toMatchObject({ kind: 'best', when: 'Yesterday', title: 'New best on Bench Press', detail: '185 lb × 5, up 5 lb' });
    const many = story(c, {
      personalBests: ['Bench Press', 'Row', 'Squat', 'Dip'].map((e) => best('x', '2026-09-29T10:00:00', e)),
    });
    expect(many[0]).toMatchObject({ title: '4 new bests in Upper', detail: 'Bench Press, Row and 2 more' });
  });

  it('marks a comeback after two weeks off', () => {
    const s = story([done('2026-09-01T10:00:00'), done('2026-09-29T10:00:00', { dayName: 'Push' })]);
    expect(s[0]).toMatchObject({ kind: 'comeback', title: 'Back at it', detail: 'Push, after 4 weeks off' });
  });

  it('marks streak milestones on the week that reached them', () => {
    const c = ['2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00', '2026-09-29T10:00:00'].map((d) => done(d));
    const streak = story(c).find((m) => m.kind === 'streak');
    expect(streak).toMatchObject({ title: '3 weeks in a row', when: 'Monday', detail: 'Every week since Sep 14' });
  });

  it('gives no streak lines to a run that may have started before the history we have', () => {
    const c = ['2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00'].map((d) => done(d));
    expect(story(c, { totalWorkouts: 40 }).some((m) => m.kind === 'streak')).toBe(false);
  });

  it('says when a run beats every earlier one', () => {
    // Two weeks in August, a break, then three in a row
    const c = ['2026-08-03T10:00:00', '2026-08-10T10:00:00', '2026-09-14T10:00:00', '2026-09-21T10:00:00', '2026-09-28T10:00:00'].map((d) => done(d));
    expect(story(c).find((m) => m.kind === 'streak')?.detail).toBe('Your longest run yet.');
  });

  it('celebrates a finished plan week', () => {
    const c = [
      done('2026-09-28T10:00:00', { weekId: 'w2', dayId: 'up2' }),
      done('2026-09-29T10:00:00', { id: 'fin', weekId: 'w2', dayId: 'lo2' }),
    ];
    expect(story(c)[0]).toMatchObject({ kind: 'week', title: 'Finished Week 2', detail: 'Block A · all 2 workouts', when: 'Yesterday' });
  });

  it("brings in the coach's replies", () => {
    const checkIns = [
      { id: 'k1', status: 'completed' as const, coachResponse: 'Great depth on those squats.', completedAt: '2026-09-29T20:00:00' },
      { id: 'k2', status: 'responded' as const, coachResponse: undefined, completedAt: undefined },
    ];
    const s = story([], { checkIns, coachName: 'Sam Rivera' });
    expect(s).toEqual([
      expect.objectContaining({ kind: 'coach', title: 'Sam on your check-in', detail: 'Great depth on those squats.' }),
    ]);
  });

  it('skips sessions that were never finished', () => {
    expect(story([done('2026-09-29T10:00:00', { status: 'IN_PROGRESS' })])).toEqual([]);
  });
});
