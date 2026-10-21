import { describe, expect, it } from 'vitest';
import {
  findPersonalBests,
  formatBestGain,
  formatBestValue,
  type LoggedSet,
} from '../personal-bests';

function set(
  exerciseId: string,
  day: string,
  weight: number | null,
  reps: number,
  extra: Partial<LoggedSet> = {}
): LoggedSet {
  return {
    exerciseId,
    exerciseName: exerciseId,
    trackingType: 'REPS',
    weight,
    reps,
    completionId: `c-${day}`,
    planId: 'p1',
    completedAt: `${day}T18:00:00.000Z`,
    ...extra,
  };
}

describe('findPersonalBests', () => {
  it('treats the first session as a baseline, then catches heavier top sets', () => {
    const bests = findPersonalBests([
      set('squat', '2026-09-01', 80, 5),
      set('squat', '2026-09-01', 82.5, 3), // top set of the session
      set('squat', '2026-09-03', 82.5, 5), // same weight, more reps
      set('squat', '2026-09-05', 85, 5), // heavier
      set('squat', '2026-09-07', 80, 8), // lighter — not a best
    ]);
    expect(bests.map((b) => [b.completedAt.slice(0, 10), b.kind, b.delta])).toEqual([
      ['2026-09-05', 'weight', 2.5],
      ['2026-09-03', 'reps', 2],
    ]);
  });

  it('counts one best per exercise per session', () => {
    const bests = findPersonalBests([
      set('bench', '2026-09-01', 60, 5),
      set('bench', '2026-09-03', 62.5, 5),
      set('bench', '2026-09-03', 65, 3),
    ]);
    expect(bests).toHaveLength(1);
    expect(bests[0]).toMatchObject({ weight: 65, reps: 3, delta: 5 });
  });

  it('handles bodyweight and timed exercises', () => {
    const bests = findPersonalBests([
      set('pullup', '2026-09-01', null, 8),
      set('pullup', '2026-09-03', null, 10),
      set('plank', '2026-09-01', null, 45, { trackingType: 'TIME' }),
      set('plank', '2026-09-04', null, 60, { trackingType: 'TIME' }),
    ]);
    expect(bests.map((b) => [b.exerciseId, b.kind, b.delta])).toEqual([
      ['plank', 'time', 15],
      ['pullup', 'reps', 2],
    ]);
  });

  it('measures against the whole history, not just recent sessions', () => {
    // An old 100 stands: climbing back to 80 then 85 is not a new best
    const bests = findPersonalBests([
      set('deadlift', '2025-06-01', 100, 5),
      set('deadlift', '2026-09-01', 80, 5),
      set('deadlift', '2026-09-08', 85, 5),
    ]);
    expect(bests).toEqual([]);
  });

  it('ignores sets with no reps', () => {
    expect(findPersonalBests([set('row', '2026-09-01', 50, 0), set('row', '2026-09-02', 60, 0)])).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats values per kind', () => {
    expect(formatBestValue({ kind: 'weight', weight: 95, reps: 5 }, 'LB')).toBe('95 lb × 5');
    expect(formatBestValue({ kind: 'weight', weight: 132.5, reps: 5 }, 'KG')).toBe('60 kg × 5');
    expect(formatBestValue({ kind: 'reps', weight: null, reps: 15 }, 'KG')).toBe('15 reps');
    expect(formatBestValue({ kind: 'time', weight: null, reps: 90 }, 'LB')).toBe('1:30');
    expect(formatBestValue({ kind: 'time', weight: null, reps: 45 }, 'LB')).toBe('45s');
  });

  it('words the gain over the last best', () => {
    expect(formatBestGain({ kind: 'weight', delta: 5, weight: 185 }, 'LB')).toBe('up 5 lb');
    // 132.5 → 138 lb is 60 → 62.5 kg
    expect(formatBestGain({ kind: 'weight', delta: 5.5, weight: 138 }, 'KG')).toBe('up 2.5 kg');
    // Under half a kilo still reads as a gain, never "up 0"
    expect(formatBestGain({ kind: 'weight', delta: 0.5, weight: 135 }, 'KG')).toBe('up 0.5 kg');
    expect(formatBestGain({ kind: 'reps', delta: 1, weight: 95 }, 'LB')).toBe('one more rep');
    expect(formatBestGain({ kind: 'reps', delta: 3, weight: null }, 'LB')).toBe('3 more reps');
    expect(formatBestGain({ kind: 'time', delta: 15, weight: null }, 'LB')).toBe('15s longer');
  });
});
