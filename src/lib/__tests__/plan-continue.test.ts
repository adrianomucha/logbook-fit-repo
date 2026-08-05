import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Only the pure decision logic is under test — keep prisma out of the picture
vi.mock('@/lib/prisma', () => ({ default: {} }));

import {
  CONTINUE_PLAN_MESSAGES,
  continuePlanStatus,
  isPlanEnded,
} from '../plan-continue';

// Week 1 starts on the Monday of (or before) planStartDate, so pin "now" to a
// known weekday and count from there. 2026-03-02 is a Monday.
const MONDAY = new Date('2026-03-02T09:00:00Z');

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
}

describe('isPlanEnded', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MONDAY);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is false with no start date — nothing has run yet', () => {
    expect(isPlanEnded(null, 4)).toBe(false);
  });

  it('is false in the first week', () => {
    expect(isPlanEnded(MONDAY, 4)).toBe(false);
  });

  it('is false in the final week — a plan is not done until it is past', () => {
    // Started three Mondays ago → week 4 of a 4-week plan
    expect(isPlanEnded(daysBefore(MONDAY, 21), 4)).toBe(false);
  });

  it('is true the day the plan runs past its last week', () => {
    // Started four Mondays ago → week 5 of a 4-week plan
    expect(isPlanEnded(daysBefore(MONDAY, 28), 4)).toBe(true);
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(isPlanEnded(daysBefore(MONDAY, 28).toISOString(), 4)).toBe(true);
  });

  it('handles a single-week plan', () => {
    expect(isPlanEnded(daysBefore(MONDAY, 7), 1)).toBe(true);
    expect(isPlanEnded(MONDAY, 1)).toBe(false);
  });
});

describe('continuePlanStatus', () => {
  it('409s a plan that is still running — the request is premature, not wrong', () => {
    expect(continuePlanStatus('NOT_ENDED')).toBe(409);
  });

  it('404s when there is nothing to continue', () => {
    expect(continuePlanStatus('NO_PLAN')).toBe(404);
    expect(continuePlanStatus('PLAN_MISSING')).toBe(404);
  });

  it('has a message for every failure reason', () => {
    for (const reason of ['NO_PLAN', 'NOT_ENDED', 'PLAN_MISSING'] as const) {
      expect(CONTINUE_PLAN_MESSAGES[reason]).toBeTruthy();
    }
  });
});
