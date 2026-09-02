import type { ClientDetail } from './types/api';

/**
 * What the client actually did vs. what was prescribed. A client quietly
 * taking weight off the bar or cutting reps is an early fade signal — the
 * coach should see it without opening set-by-set logs.
 */
export interface ExerciseDeviation {
  exerciseName: string;
  /** Largest weight change across the exercise's sets */
  weight?: { prescribed: number; actual: number };
  /** Worst rep shortfall vs. the prescribed range (rep-tracked only) */
  repsShort?: { actual: number; min: number; max: number };
}

type CompletionSet = ClientDetail['completions'][number]['sets'][number];

export function getWorkoutDeviations(sets: CompletionSet[]): ExerciseDeviation[] {
  const byExercise = new Map<string, ExerciseDeviation>();

  for (const set of sets) {
    const we = set.workoutExercise;
    const name = we.exercise.name;
    // Key by the prescription, not the exercise name — the same exercise can
    // be programmed twice in one day (heavy top set + back-off) with
    // different targets, and merging them mixes prescribed values.
    const key = set.workoutExerciseId ?? name;

    if (set.actualWeight != null && we.weight != null && set.actualWeight !== we.weight) {
      const dev = byExercise.get(key) ?? { exerciseName: name };
      const delta = Math.abs(set.actualWeight - we.weight);
      const prevDelta = dev.weight
        ? Math.abs(dev.weight.actual - dev.weight.prescribed)
        : -1;
      if (delta > prevDelta) {
        dev.weight = { prescribed: we.weight, actual: set.actualWeight };
      }
      byExercise.set(key, dev);
    }

    // Reps are only comparable for rep-tracked exercises (TIME stores
    // seconds), and only shortfalls are worth the coach's attention
    if (we.trackingType === 'REPS' && set.actualReps != null && set.actualReps < we.reps) {
      const dev = byExercise.get(key) ?? { exerciseName: name };
      if (!dev.repsShort || set.actualReps < dev.repsShort.actual) {
        dev.repsShort = { actual: set.actualReps, min: we.reps, max: we.repsMax ?? we.reps };
      }
      byExercise.set(key, dev);
    }
  }

  return [...byExercise.values()];
}

export function formatDeviation(dev: ExerciseDeviation): string {
  const parts: string[] = [];
  if (dev.weight) {
    parts.push(`${dev.weight.prescribed}→${dev.weight.actual}`);
  }
  if (dev.repsShort) {
    const target =
      dev.repsShort.max > dev.repsShort.min
        ? `${dev.repsShort.min}–${dev.repsShort.max}`
        : `${dev.repsShort.min}`;
    parts.push(`${dev.repsShort.actual} reps (target ${target})`);
  }
  return `${dev.exerciseName} ${parts.join(', ')}`;
}
