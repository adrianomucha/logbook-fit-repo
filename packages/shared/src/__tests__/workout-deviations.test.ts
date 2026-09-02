import { describe, it, expect } from 'vitest';
import { getWorkoutDeviations, formatDeviation } from '../workout-deviations';

type Set = Parameters<typeof getWorkoutDeviations>[0][number];

function makeSet(overrides: {
  name: string;
  workoutExerciseId?: string;
  setNumber?: number;
  actualWeight?: number | null;
  actualReps?: number | null;
  weight?: number | null;
  reps?: number;
  repsMax?: number | null;
  trackingType?: string;
}): Set {
  return {
    setNumber: overrides.setNumber ?? 1,
    workoutExerciseId: overrides.workoutExerciseId ?? `we-${overrides.name}`,
    actualWeight: overrides.actualWeight ?? null,
    actualReps: overrides.actualReps ?? null,
    workoutExercise: {
      trackingType: overrides.trackingType ?? 'REPS',
      weight: overrides.weight ?? null,
      reps: overrides.reps ?? 10,
      repsMax: overrides.repsMax ?? null,
      exercise: { name: overrides.name },
    },
  };
}

describe('getWorkoutDeviations', () => {
  it('returns nothing when actuals match the prescription', () => {
    const sets = [
      makeSet({ name: 'Squat', actualWeight: 100, weight: 100 }),
      makeSet({ name: 'Squat', actualReps: 10, reps: 10 }),
    ];
    expect(getWorkoutDeviations(sets)).toEqual([]);
  });

  it('reports a weight change', () => {
    const sets = [makeSet({ name: 'Deadlift', actualWeight: 155, weight: 185 })];
    expect(getWorkoutDeviations(sets)).toEqual([
      { exerciseName: 'Deadlift', weight: { prescribed: 185, actual: 155 } },
    ]);
  });

  it('keeps the largest weight change across sets of one exercise', () => {
    const sets = [
      makeSet({ name: 'Deadlift', setNumber: 2, actualWeight: 175, weight: 185 }),
      makeSet({ name: 'Deadlift', setNumber: 3, actualWeight: 155, weight: 185 }),
    ];
    const [dev] = getWorkoutDeviations(sets);
    expect(dev.weight).toEqual({ prescribed: 185, actual: 155 });
  });

  it('reports the worst rep shortfall but ignores reps above the range', () => {
    const sets = [
      makeSet({ name: 'Bench', actualReps: 6, reps: 8, repsMax: 10 }),
      makeSet({ name: 'Bench', actualReps: 12, reps: 8, repsMax: 10 }),
      makeSet({ name: 'Bench', actualReps: 5, reps: 8, repsMax: 10 }),
    ];
    const [dev] = getWorkoutDeviations(sets);
    expect(dev.repsShort).toEqual({ actual: 5, min: 8, max: 10 });
  });

  it('ignores rep counts on time-tracked exercises (seconds, not reps)', () => {
    const sets = [
      makeSet({ name: 'Plank', actualReps: 45, reps: 60, trackingType: 'TIME' }),
    ];
    expect(getWorkoutDeviations(sets)).toEqual([]);
  });

  it('groups weight and rep deviations per exercise', () => {
    const sets = [
      makeSet({ name: 'Squat', actualWeight: 80, weight: 100 }),
      makeSet({ name: 'Squat', actualReps: 4, reps: 6 }),
      makeSet({ name: 'Row', actualWeight: 60, weight: 50 }),
    ];
    const devs = getWorkoutDeviations(sets);
    expect(devs).toHaveLength(2);
    expect(devs[0]).toEqual({
      exerciseName: 'Squat',
      weight: { prescribed: 100, actual: 80 },
      repsShort: { actual: 4, min: 6, max: 6 },
    });
    expect(devs[1].weight).toEqual({ prescribed: 50, actual: 60 });
  });

  it('keeps two prescriptions of the same exercise separate (heavy + back-off)', () => {
    const sets = [
      makeSet({ name: 'Squat', workoutExerciseId: 'we-top', actualWeight: 130, weight: 140 }),
      makeSet({ name: 'Squat', workoutExerciseId: 'we-backoff', actualWeight: 90, weight: 100 }),
    ];
    const devs = getWorkoutDeviations(sets);
    expect(devs).toHaveLength(2);
    expect(devs[0].weight).toEqual({ prescribed: 140, actual: 130 });
    expect(devs[1].weight).toEqual({ prescribed: 100, actual: 90 });
  });
});

describe('formatDeviation', () => {
  it('formats a weight change', () => {
    expect(
      formatDeviation({ exerciseName: 'Deadlift', weight: { prescribed: 185, actual: 155 } })
    ).toBe('Deadlift 185→155');
  });

  it('formats a rep shortfall with a range target', () => {
    expect(
      formatDeviation({ exerciseName: 'Bench', repsShort: { actual: 5, min: 8, max: 10 } })
    ).toBe('Bench 5 reps (target 8–10)');
  });

  it('formats a combined deviation with an exact rep target', () => {
    expect(
      formatDeviation({
        exerciseName: 'Squat',
        weight: { prescribed: 100, actual: 80 },
        repsShort: { actual: 4, min: 6, max: 6 },
      })
    ).toBe('Squat 100→80, 4 reps (target 6)');
  });
});
