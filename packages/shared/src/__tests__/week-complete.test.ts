import { describe, it, expect } from 'vitest';
import { CONFETTI, confettiPieces, weekCompletedBy, WEEK_COMPLETE_COPY } from '../week-complete';
import type { WeekOverviewDay } from '../types/api';

const day = (n: number, status: WeekOverviewDay['status'], exerciseCount = 5): WeekOverviewDay => ({
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
  durationSec: null,
  effortRating: null,
});

const overview = (...days: WeekOverviewDay[]) => ({ weekNumber: 3, days });

describe('weekCompletedBy', () => {
  it('is the week when the finished workout was the last one open', () => {
    const week = overview(day(1, 'COMPLETED'), day(2, 'COMPLETED'), day(3, 'IN_PROGRESS'));
    expect(weekCompletedBy(week, 'd3')).toEqual({ weekNumber: 3, total: 3 });
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
    expect(weekCompletedBy(week, 'd3')).toEqual({ weekNumber: 3, total: 2 });
    expect(weekCompletedBy(week, 'd2')).toBeNull();
  });

  it('is null for a workout outside the week, or with nothing to go on', () => {
    expect(weekCompletedBy(overview(day(1, 'COMPLETED')), 'earlier-week-day')).toBeNull();
    expect(weekCompletedBy(null, 'd1')).toBeNull();
    expect(weekCompletedBy(overview(day(1, 'COMPLETED')), null)).toBeNull();
  });

  it('counts a one-workout week', () => {
    expect(weekCompletedBy(overview(day(1, 'IN_PROGRESS')), 'd1')).toEqual({ weekNumber: 3, total: 1 });
  });
});

describe('WEEK_COMPLETE_COPY', () => {
  it('names the week and the tally', () => {
    expect(WEEK_COMPLETE_COPY.eyebrow(3)).toBe('Week 3 complete');
    expect(WEEK_COMPLETE_COPY.tally(4)).toBe('4 of 4 workouts this week');
    expect(WEEK_COMPLETE_COPY.tally(1)).toBe('1 of 1 workout this week');
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

  it('leads with volt', () => {
    const pieces = confettiPieces();
    const brand = pieces.filter((p) => p.color === 'brand').length;
    expect(brand).toBeGreaterThan(pieces.length - brand);
  });
});
