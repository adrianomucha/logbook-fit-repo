import { describe, expect, it } from 'vitest';
import { buildProgressStory, describeThisWeek, formatMomentWhen, nextWorkoutName } from '../progress';
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

describe('nextWorkoutName', () => {
  it("names the week's first workout not yet done", () => {
    expect(nextWorkoutName(plan, 1, [])).toBe('Upper');
    expect(nextWorkoutName(plan, 1, [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'up' })])).toBe('Lower');
  });

  it('is null when the week is done or unknown', () => {
    const c = [done('2026-09-29T10:00:00', { weekId: 'w1', dayId: 'up' }), done('2026-09-29T11:00:00', { weekId: 'w1', dayId: 'lo' })];
    expect(nextWorkoutName(plan, 1, c)).toBeNull();
    expect(nextWorkoutName(plan, 9, [])).toBeNull();
    expect(nextWorkoutName(null, 1, [])).toBeNull();
  });
});

describe('describeThisWeek', () => {
  it('counts this week and always points at the next workout', () => {
    const c = [done('2026-09-29T10:00:00'), done('2026-09-24T10:00:00')];
    expect(describeThisWeek(c, 4, 'Lower', now)).toEqual({
      completed: 1,
      target: 4,
      slots: [
        { state: 'done', label: 'Tue' },
        { state: 'next', label: 'Next' },
        { state: 'upcoming', label: '' },
        { state: 'upcoming', label: '' },
      ],
      lead: '1 down.',
      rest: '3 to go — next up, Lower.',
    });
    expect(describeThisWeek(c, 4, null, now).rest).toBe('3 to go.');
  });

  it('opens a week and a first week differently', () => {
    expect(describeThisWeek([done('2026-09-24T10:00:00')], 4, 'Upper', now)).toMatchObject({ lead: 'New week.', rest: 'First up, Upper.' });
    expect(describeThisWeek([], 4, null, now)).toMatchObject({ lead: 'Fresh start.', rest: 'Your first workout kicks things off.' });
  });

  it('calls a full week done', () => {
    const c = ['2026-09-28T10:00:00', '2026-09-29T10:00:00', '2026-09-30T08:00:00'].map((d) => done(d));
    expect(describeThisWeek(c, 3, null, now)).toMatchObject({ lead: 'All 3 done.', rest: 'Week complete. Rest up.' });
    expect(describeThisWeek(c, 3, null, now).slots.map((s) => s.state)).toEqual(['done', 'done', 'done']);
    expect(describeThisWeek(c, 2, null, now).lead).toBe('3 done.');
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

  it('names a single best with its gain, and groups several from one session', () => {
    const c = [done('2026-09-01T10:00:00'), done('2026-09-29T10:00:00', { id: 'x', weekId: 'w1', dayId: 'up' })];
    const one = story(c, { personalBests: [best('x', '2026-09-29T10:00:00', 'Bench Press')] });
    expect(one[0]).toMatchObject({ kind: 'best', when: 'Yesterday', title: 'New best on Bench Press', detail: '185 lb × 5 — up 5 lb' });
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
    expect(story(c)[0]).toMatchObject({ kind: 'week', title: 'Finished Week 2', detail: 'Block A · all 2 sessions', when: 'Yesterday' });
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
