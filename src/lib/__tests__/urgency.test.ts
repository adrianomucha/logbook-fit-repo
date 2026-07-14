import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getClientUrgency } from '../urgency';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('getClientUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday, July 15 2026
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('NEEDS_PLAN when the client has no plan, regardless of anything else', () => {
    expect(
      getClientUrgency({ hasPlan: false, openCheckInStatus: 'CLIENT_RESPONDED' })
    ).toEqual({ urgency: 'NEEDS_PLAN', urgencyOrder: 0, planStatus: 'NONE' });
  });

  it('PLAN_ENDED once the plan has run its course, even for an active trainee', () => {
    const result = getClientUrgency({
      hasPlan: true,
      planStartDate: '2026-06-29', // started 2+ weeks before "now"
      planDurationWeeks: 2,
      lastWorkoutAt: daysAgo(1),
    });
    expect(result).toEqual({ urgency: 'PLAN_ENDED', urgencyOrder: 1, planStatus: 'ENDED' });
  });

  it('AT_RISK with no workouts at all', () => {
    const result = getClientUrgency({ hasPlan: true, lastWorkoutAt: null });
    expect(result.urgency).toBe('AT_RISK');
    expect(result.urgencyOrder).toBe(2);
  });

  it('AT_RISK after 7+ days of silence, even with a check-in waiting', () => {
    const result = getClientUrgency({
      hasPlan: true,
      lastWorkoutAt: daysAgo(8),
      openCheckInStatus: 'CLIENT_RESPONDED',
    });
    expect(result.urgency).toBe('AT_RISK');
  });

  it('not AT_RISK at 6 days of silence', () => {
    const result = getClientUrgency({ hasPlan: true, lastWorkoutAt: daysAgo(6) });
    expect(result.urgency).toBe('ON_TRACK');
  });

  it('AWAITING_RESPONSE outranks CHECKIN_DUE', () => {
    const responded = getClientUrgency({
      hasPlan: true,
      lastWorkoutAt: daysAgo(1),
      openCheckInStatus: 'CLIENT_RESPONDED',
    });
    const pending = getClientUrgency({
      hasPlan: true,
      lastWorkoutAt: daysAgo(1),
      openCheckInStatus: 'PENDING',
    });
    expect(responded.urgency).toBe('AWAITING_RESPONSE');
    expect(pending.urgency).toBe('CHECKIN_DUE');
    expect(responded.urgencyOrder).toBeLessThan(pending.urgencyOrder);
  });

  it('ON_TRACK when training recently with nothing open', () => {
    expect(getClientUrgency({ hasPlan: true, lastWorkoutAt: daysAgo(2) })).toEqual({
      urgency: 'ON_TRACK',
      urgencyOrder: 5,
      planStatus: 'ACTIVE',
    });
  });

  it('reports FINAL_WEEK planStatus without changing urgency', () => {
    const result = getClientUrgency({
      hasPlan: true,
      planStartDate: '2026-07-13', // week 1 of a 1-week plan
      planDurationWeeks: 1,
      lastWorkoutAt: daysAgo(1),
    });
    expect(result.planStatus).toBe('FINAL_WEEK');
    expect(result.urgency).toBe('ON_TRACK');
  });

  it('treats a plan with no start date as ACTIVE, never ENDED', () => {
    const result = getClientUrgency({
      hasPlan: true,
      planStartDate: null,
      planDurationWeeks: 4,
      lastWorkoutAt: daysAgo(1),
    });
    expect(result.planStatus).toBe('ACTIVE');
  });
});
