import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRawWeekNumber,
  getCurrentWeekNumber,
  getPlanProgressStatus,
} from '../workout-week-helpers';

describe('week math (Monday-anchored)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday, July 15 2026
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRawWeekNumber', () => {
    it('is week 1 during the week the plan starts', () => {
      expect(getRawWeekNumber('2026-07-13')).toBe(1); // started Monday
    });

    it('anchors to the Monday of the start week for mid-week starts', () => {
      // Started Wednesday July 1 → anchor Monday June 29 → 16 days → week 3
      expect(getRawWeekNumber('2026-07-01')).toBe(3);
      expect(getRawWeekNumber('2026-06-29')).toBe(3);
    });

    it('keeps counting past the plan duration (unclamped)', () => {
      expect(getRawWeekNumber('2026-05-04')).toBe(11);
    });
  });

  describe('getCurrentWeekNumber', () => {
    it('clamps to the plan duration', () => {
      expect(getCurrentWeekNumber('2026-06-29', 2)).toBe(2);
      expect(getCurrentWeekNumber('2026-06-29', 4)).toBe(3);
    });
  });

  describe('getPlanProgressStatus', () => {
    it('is ACTIVE before the final week', () => {
      expect(getPlanProgressStatus('2026-06-29', 4)).toBe('ACTIVE');
    });

    it('is FINAL_WEEK during the last week', () => {
      expect(getPlanProgressStatus('2026-06-29', 3)).toBe('FINAL_WEEK');
      expect(getPlanProgressStatus('2026-07-13', 1)).toBe('FINAL_WEEK');
    });

    it('is ENDED once the raw week passes the duration', () => {
      expect(getPlanProgressStatus('2026-06-29', 2)).toBe('ENDED');
      expect(getPlanProgressStatus('2026-05-04', 4)).toBe('ENDED');
    });
  });
});
