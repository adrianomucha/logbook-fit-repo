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
    expect(isPlanEnded(null, 4, 'UTC')).toBe(false);
  });

  it('is false in the first week', () => {
    expect(isPlanEnded(MONDAY, 4, 'UTC')).toBe(false);
  });

  it('is false in the final week — a plan is not done until it is past', () => {
    // Started three Mondays ago → week 4 of a 4-week plan
    expect(isPlanEnded(daysBefore(MONDAY, 21), 4, 'UTC')).toBe(false);
  });

  it('is true the day the plan runs past its last week', () => {
    // Started four Mondays ago → week 5 of a 4-week plan
    expect(isPlanEnded(daysBefore(MONDAY, 28), 4, 'UTC')).toBe(true);
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(isPlanEnded(daysBefore(MONDAY, 28).toISOString(), 4, 'UTC')).toBe(true);
  });

  it("ends on the client's calendar, not the server's", () => {
    // A 1-week plan from Monday Feb 23: Sunday Mar 1 at 17:00 in LA is
    // already Monday on a UTC calendar
    const sundayEveningLA = new Date('2026-03-02T01:00:00Z');
    vi.setSystemTime(sundayEveningLA);
    const start = new Date('2026-02-23T17:00:00Z');
    expect(isPlanEnded(start, 1, 'America/Los_Angeles')).toBe(false);
    expect(isPlanEnded(start, 1, 'UTC')).toBe(true);
  });

  it('handles a single-week plan', () => {
    expect(isPlanEnded(daysBefore(MONDAY, 7), 1, 'UTC')).toBe(true);
    expect(isPlanEnded(MONDAY, 1, 'UTC')).toBe(false);
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
