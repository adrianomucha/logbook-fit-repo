import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AT_RISK_AFTER_DAYS, getClientUrgency, newPlanHint } from '../urgency';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('getClientUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday, July 15 2026, noon local — the plan-week math runs in local
    // time, so "now" and plan start dates are pinned as local wall-clock times
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
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
      planStartDate: new Date('2026-06-29T12:00:00'), // started 2+ weeks before "now"
      planDurationWeeks: 2,
      lastWorkoutAt: daysAgo(1),
    });
    expect(result).toEqual({ urgency: 'PLAN_ENDED', urgencyOrder: 1, planStatus: 'ENDED' });
  });

  it('AT_RISK with no workouts at all and no plan start on record', () => {
    const result = getClientUrgency({ hasPlan: true, lastWorkoutAt: null });
    expect(result.urgency).toBe('AT_RISK');
    expect(result.urgencyOrder).toBe(2);
  });

  it('not AT_RISK in the first week of a plan with no workouts yet', () => {
    const result = getClientUrgency({
      hasPlan: true,
      planStartDate: daysAgo(2),
      planDurationWeeks: 4,
      lastWorkoutAt: null,
    });
    expect(result.urgency).toBe('ON_TRACK');
  });

  it('AT_RISK once a new plan has gone untouched for 7+ days', () => {
    const result = getClientUrgency({
      hasPlan: true,
      planStartDate: daysAgo(8),
      planDurationWeeks: 4,
      lastWorkoutAt: daysAgo(30),
    });
    expect(result.urgency).toBe('AT_RISK');
  });

  describe('grace window after a plan starts', () => {
    it('ON_TRACK for a plan assigned seconds ago with no workouts', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: new Date(Date.now() - 5_000),
        planDurationWeeks: 8,
        lastWorkoutAt: null,
      });
      expect(result).toEqual({ urgency: 'ON_TRACK', urgencyOrder: 5, planStatus: 'ACTIVE' });
    });

    it('still ON_TRACK on the last day of the window', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(AT_RISK_AFTER_DAYS - 1),
        planDurationWeeks: 8,
        lastWorkoutAt: null,
      });
      expect(result.urgency).toBe('ON_TRACK');
    });

    it('AT_RISK once the window passes without a workout', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(AT_RISK_AFTER_DAYS + 1),
        planDurationWeeks: 8,
        lastWorkoutAt: null,
      });
      expect(result.urgency).toBe('AT_RISK');
    });

    it('a new plan resets the clock for a client silent on the old one', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(2),
        planDurationWeeks: 8,
        lastWorkoutAt: daysAgo(30),
      });
      expect(result.urgency).toBe('ON_TRACK');
    });

    it('a recent workout keeps the clock running past an old plan start', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(20),
        planDurationWeeks: 8,
        lastWorkoutAt: daysAgo(3),
      });
      expect(result.urgency).toBe('ON_TRACK');
    });

    it('AT_RISK when both the plan start and the last workout are old', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(20),
        planDurationWeeks: 8,
        lastWorkoutAt: daysAgo(10),
      });
      expect(result.urgency).toBe('AT_RISK');
    });

    it('CHECKIN_DUE when a check-in was sent inside the window', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: daysAgo(1),
        planDurationWeeks: 8,
        lastWorkoutAt: null,
        openCheckInStatus: 'PENDING',
      });
      expect(result.urgency).toBe('CHECKIN_DUE');
    });

    it('ignores an unparseable plan start instead of treating it as recent', () => {
      const result = getClientUrgency({
        hasPlan: true,
        planStartDate: 'not a date',
        lastWorkoutAt: null,
      });
      expect(result.urgency).toBe('AT_RISK');
    });
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
      planStartDate: new Date('2026-07-13T12:00:00'), // week 1 of a 1-week plan
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

describe('newPlanHint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts days since the plan started when they have not trained on it', () => {
    expect(newPlanHint(new Date(Date.now() - 5_000), null)).toBe('started today');
    expect(newPlanHint(daysAgo(1), null)).toBe('started yesterday');
    expect(newPlanHint(daysAgo(4), daysAgo(12))).toBe('started 4d ago');
  });

  it('is null once they have trained on the plan', () => {
    expect(newPlanHint(daysAgo(4), daysAgo(1))).toBeNull();
  });

  it('is null once the grace window has run out', () => {
    expect(newPlanHint(daysAgo(AT_RISK_AFTER_DAYS), null)).toBeNull();
  });

  it('is null without a plan start', () => {
    expect(newPlanHint(null, null)).toBeNull();
  });
});
