import { describe, it, expect } from 'vitest';
import { defaultPlanStart, planStartDateFor, planStartOptions, PLAN_STARTS_COPY } from '../plan-start';
import { getPlanStartsOn, getRawWeekNumber } from '../workout-week-helpers';

// Thursday, October 22 2026, 15:00 UTC
const THURSDAY = new Date('2026-10-22T15:00:00Z');

describe('plan start', () => {
  it('preselects today early in the week and next Monday from Thursday on', () => {
    expect(defaultPlanStart('UTC', new Date('2026-10-19T09:00:00Z'))).toBe('today'); // Monday
    expect(defaultPlanStart('UTC', new Date('2026-10-21T09:00:00Z'))).toBe('today'); // Wednesday
    expect(defaultPlanStart('UTC', THURSDAY)).toBe('monday');
    expect(defaultPlanStart('UTC', new Date('2026-10-25T09:00:00Z'))).toBe('monday'); // Sunday
  });

  it("reads the weekday on the client's calendar", () => {
    // Wednesday 23:00 UTC is already Thursday in Warsaw
    const lateWednesdayUtc = new Date('2026-10-21T23:00:00Z');
    expect(defaultPlanStart('UTC', lateWednesdayUtc)).toBe('today');
    expect(defaultPlanStart('Europe/Warsaw', lateWednesdayUtc)).toBe('monday');
  });

  it("starts today now, or next Monday on the client's calendar", () => {
    expect(planStartDateFor('today', 'Europe/Warsaw', THURSDAY).toISOString()).toBe('2026-10-22T12:00:00.000Z');
    expect(planStartDateFor('monday', 'Europe/Warsaw', THURSDAY).toISOString()).toBe('2026-10-26T12:00:00.000Z');
    // Sunday 20:00 in LA is already Monday in UTC: their next Monday is tomorrow
    expect(planStartDateFor('monday', 'America/Los_Angeles', new Date('2026-10-26T03:00:00Z')).toISOString()).toBe(
      '2026-10-26T12:00:00.000Z'
    );
  });

  it("starts on that Monday whatever timezone the client turns out to be in", () => {
    const start = planStartDateFor('monday', 'UTC', THURSDAY);
    for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Pago_Pago', 'Europe/Warsaw', 'Pacific/Kiritimati', 'Pacific/Auckland']) {
      expect(getPlanStartsOn(start, tz, THURSDAY), tz).toBe('2026-10-26');
      // Saturday everywhere is still before; Monday 20:00 UTC (their Monday
      // or Tuesday) is week 1
      expect(getRawWeekNumber(start, tz, new Date('2026-10-24T12:00:00Z')), tz).toBe(0);
      expect(getRawWeekNumber(start, tz, new Date('2026-10-26T20:00:00Z')), tz).toBe(1);
    }
  });

  it("makes a Monday start upcoming until that Monday, then week 1", () => {
    const start = planStartDateFor('monday', 'America/Los_Angeles', THURSDAY);
    const sundayNightLA = new Date('2026-10-26T06:30:00Z'); // Sunday 23:30 in LA
    const mondayMorningLA = new Date('2026-10-26T15:00:00Z');
    expect(getRawWeekNumber(start, 'America/Los_Angeles', sundayNightLA)).toBe(0);
    expect(getPlanStartsOn(start, 'America/Los_Angeles', sundayNightLA)).toBe('2026-10-26');
    expect(getRawWeekNumber(start, 'America/Los_Angeles', mondayMorningLA)).toBe(1);
    expect(getPlanStartsOn(start, 'America/Los_Angeles', mondayMorningLA)).toBeNull();
  });

  it('keeps a plan started today in this week when the client turns out to be elsewhere', () => {
    // Assigned Monday 08:00 in Warsaw (06:00 UTC); that instant is still
    // Sunday in Los Angeles, which used to put week 1 a week early there
    const start = planStartDateFor('today', 'Europe/Warsaw', new Date('2026-10-26T06:00:00Z'));
    const laMondayMorning = new Date('2026-10-26T16:00:00Z');
    expect(getRawWeekNumber(start, 'America/Los_Angeles', laMondayMorning)).toBe(1);
    expect(getRawWeekNumber(start, 'Pacific/Kiritimati', laMondayMorning)).toBe(1);
  });

  it("words the choices for the client's day", () => {
    const [today, monday] = planStartOptions('UTC', THURSDAY);
    expect(today).toMatchObject({ value: 'today', label: 'Today', detail: 'Week 1 is the 4 days left in this week.' });
    expect(monday).toMatchObject({ value: 'monday', label: 'Monday, Oct 26' });
    expect(planStartOptions('UTC', new Date('2026-10-19T09:00:00Z'))[0].detail).toBe('A full first week, starting now.');
    expect(planStartOptions('UTC', new Date('2026-10-25T09:00:00Z'))[0].detail).toBe('Week 1 is just today. Week 2 starts tomorrow.');
  });

  it('tells the client when their plan begins', () => {
    expect(PLAN_STARTS_COPY.title('2026-10-26', new Date('2026-10-25T12:00:00'))).toBe('Your plan starts tomorrow');
    expect(PLAN_STARTS_COPY.title('2026-10-26', new Date('2026-10-22T12:00:00'))).toBe('Your plan starts Monday');
    expect(PLAN_STARTS_COPY.body('Sam Coach', 3)).toBe('Sam has it ready. Week 1 has 3 workouts. Take a look through it before then.');
    expect(PLAN_STARTS_COPY.body(null, 0)).toBe('Your coach has it ready. Take a look through it before then.');
  });
});
