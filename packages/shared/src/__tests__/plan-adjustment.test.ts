import { describe, it, expect } from 'vitest';
import { planAdjustmentOwed, PLAN_ADJUSTMENT_REMINDER_DAYS } from '../plan-adjustment';

const NOW = new Date('2026-07-20T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const checkIn = (id: string, completedDaysAgo: number, planAdjustment: boolean, status = 'COMPLETED') => ({
  id,
  status,
  planAdjustment,
  completedAt: status === 'COMPLETED' ? daysAgo(completedDaysAgo) : null,
});

describe('planAdjustmentOwed', () => {
  it('is owed when the plan has not changed since the promise', () => {
    const owed = planAdjustmentOwed([checkIn('c1', 3, true)], daysAgo(10), NOW);
    expect(owed).toEqual({ checkInId: 'c1', promisedAt: daysAgo(3).toISOString() });
  });

  it('is settled once the plan is edited after the promise', () => {
    expect(planAdjustmentOwed([checkIn('c1', 3, true)], daysAgo(1), NOW)).toBeNull();
  });

  it('is never owed when the coach did not promise', () => {
    expect(planAdjustmentOwed([checkIn('c1', 3, false)], daysAgo(10), NOW)).toBeNull();
    expect(planAdjustmentOwed([], daysAgo(10), NOW)).toBeNull();
  });

  it('follows the most recent promise', () => {
    // Promised 14 days ago and edited 10 days ago, then promised again 2 days ago
    const owed = planAdjustmentOwed([checkIn('old', 14, true), checkIn('new', 2, true)], daysAgo(10), NOW);
    expect(owed?.checkInId).toBe('new');
  });

  it('ignores check-ins the coach has not completed', () => {
    expect(planAdjustmentOwed([checkIn('c1', 0, true, 'CLIENT_RESPONDED')], null, NOW)).toBeNull();
  });

  it('is owed when the client has no plan at all', () => {
    expect(planAdjustmentOwed([checkIn('c1', 3, true)], null, NOW)?.checkInId).toBe('c1');
  });

  it('stops reminding once the promise is old', () => {
    expect(planAdjustmentOwed([checkIn('c1', PLAN_ADJUSTMENT_REMINDER_DAYS + 1, true)], null, NOW)).toBeNull();
    expect(planAdjustmentOwed([checkIn('c1', PLAN_ADJUSTMENT_REMINDER_DAYS - 1, true)], null, NOW)).not.toBeNull();
  });

  it('reads dates that arrive as strings', () => {
    const owed = planAdjustmentOwed(
      [{ id: 'c1', status: 'COMPLETED', planAdjustment: true, completedAt: daysAgo(3).toISOString() }],
      daysAgo(1).toISOString(),
      NOW
    );
    expect(owed).toBeNull();
  });
});
