import { describe, it, expect } from 'vitest';
import { CONFETTI, confettiPieces, medalRestAngle, weekCompletedBy, weekMinutes, WEEK_COMPLETE_COPY, WEEK_MOMENT } from '../week-complete';
import type { WeekOverviewDay } from '../types/api';

const day = (n: number, status: WeekOverviewDay['status'], exerciseCount = 5, durationSec: number | null = null): WeekOverviewDay => ({
  dayId: `d${n}`,
  orderIndex: n,
  name: `Day ${n}`,
  exerciseCount,
  status,
  completionPct: null,
  exercisesDone: null,
  completionId: null,
  startedAt: null,
  completedAt: null,
  durationSec,
  effortRating: null,
});

const overview = (...days: WeekOverviewDay[]) => ({ weekNumber: 3, days });

describe('weekCompletedBy', () => {
  it('is the week when the finished workout was the last one open', () => {
    const week = overview(day(1, 'COMPLETED'), day(2, 'COMPLETED'), day(3, 'IN_PROGRESS'));
    expect(weekCompletedBy(week, 'd3')).toEqual({ weekNumber: 3, total: 3, otherSec: 0 });
  });

  it('ignores the finished workout own status, stale or fresh', () => {
    expect(weekCompletedBy(overview(day(1, 'COMPLETED'), day(2, 'NOT_STARTED')), 'd2')).not.toBeNull();
    expect(weekCompletedBy(overview(day(1, 'COMPLETED'), day(2, 'COMPLETED')), 'd2')).not.toBeNull();
  });

  it('is null while another workout is still open', () => {
    expect(weekCompletedBy(overview(day(1, 'COMPLETED'), day(2, 'NOT_STARTED'), day(3, 'IN_PROGRESS')), 'd3')).toBeNull();
    expect(weekCompletedBy(overview(day(1, 'IN_PROGRESS'), day(2, 'IN_PROGRESS')), 'd2')).toBeNull();
  });

  it('does not count days with no exercises', () => {
    const week = overview(day(1, 'COMPLETED'), day(2, 'NOT_STARTED', 0), day(3, 'IN_PROGRESS'));
    expect(weekCompletedBy(week, 'd3')).toEqual({ weekNumber: 3, total: 2, otherSec: 0 });
    expect(weekCompletedBy(week, 'd2')).toBeNull();
  });

  it('is null for a workout outside the week, or with nothing to go on', () => {
    expect(weekCompletedBy(overview(day(1, 'COMPLETED')), 'earlier-week-day')).toBeNull();
    expect(weekCompletedBy(null, 'd1')).toBeNull();
    expect(weekCompletedBy(overview(day(1, 'COMPLETED')), null)).toBeNull();
  });

  it('counts a one-workout week', () => {
    expect(weekCompletedBy(overview(day(1, 'IN_PROGRESS')), 'd1')).toEqual({ weekNumber: 3, total: 1, otherSec: 0 });
  });

  it('adds up the time trained in the other workouts', () => {
    // The finished workout's own stale duration is left out: the screen adds the fresh one
    const week = weekCompletedBy(overview(day(1, 'COMPLETED', 5, 3000), day(2, 'COMPLETED', 5, 2400), day(3, 'IN_PROGRESS', 5, 999)), 'd3');
    expect(week?.otherSec).toBe(5400);
    expect(weekMinutes(week!, 52)).toBe(142);
  });
});

describe('WEEK_COMPLETE_COPY', () => {
  it('names the week and the tally', () => {
    expect(WEEK_COMPLETE_COPY.eyebrow(3)).toBe('Week 3 complete');
    expect(WEEK_COMPLETE_COPY.medalNumber(3)).toBe('03');
    expect(WEEK_COMPLETE_COPY.medalNumber(12)).toBe('12');
    expect(WEEK_COMPLETE_COPY.medalTally(4)).toBe('4 of 4');
    expect(WEEK_COMPLETE_COPY.medalA11y(3, 1)).toContain('1 of 1 workout done');
  });
});

describe('confettiPieces', () => {
  it('is the same burst every time', () => {
    expect(confettiPieces()).toEqual(confettiPieces());
    expect(confettiPieces()).toHaveLength(CONFETTI.count);
  });

  it('stays on screen and ends inside the total', () => {
    for (const piece of confettiPieces()) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x).toBeLessThanOrEqual(1);
      expect(piece.delay + piece.duration).toBeLessThanOrEqual(CONFETTI.totalMs);
    }
  });

  it('leads with ink', () => {
    const pieces = confettiPieces();
    const ink = pieces.filter((p) => p.color === 'ink').length;
    expect(ink).toBeGreaterThan(pieces.length - ink);
  });
});

describe('WEEK_MOMENT', () => {
  it('lands the medal face up', () => {
    expect(Number.isInteger(WEEK_MOMENT.medalTurns)).toBe(true);
  });
});

describe('medalRestAngle', () => {
  it('settles on the nearest face when let go still', () => {
    expect(medalRestAngle(50, 0)).toBe(0);
    expect(medalRestAngle(100, 0)).toBe(180);
    expect(medalRestAngle(-100, 0)).toBe(-180);
  });

  it('carries on with a flick, in its direction', () => {
    expect(medalRestAngle(20, 1)).toBe(180);
    expect(medalRestAngle(-20, -1)).toBe(-180);
  });

  it('never carries more than two turns', () => {
    expect(medalRestAngle(0, 50)).toBe(720);
    expect(medalRestAngle(0, -50)).toBe(-720);
  });
});
