import type { LastPerformance, WorkoutExercise, WorkoutSetCompletion } from './types/api';
import { formatDuration, parseDurationInput } from './reps';

/**
 * Pure logic of the live workout screen, shared by the web's
 * useWorkoutExecution and the app's. Everything about what "done" means,
 * which set to log next, and how a prescription turns into a default value
 * lives here once, so the two apps can never disagree about a session.
 */

/** Check if a specific set is completed */
export function isSetCompleted(setCompletions: WorkoutSetCompletion[], setNumber: number): boolean {
  return setCompletions.some((s) => s.setNumber === setNumber && s.completed);
}

/** Check if all sets of an exercise are completed */
export function isExerciseComplete(exercise: WorkoutExercise): boolean {
  if (exercise.sets === 0) return true;
  return exercise.setCompletions.filter((s) => s.completed).length >= exercise.sets;
}

/** Count completed sets for an exercise */
export function getCompletedSetsCount(exercise: WorkoutExercise): number {
  return exercise.setCompletions.filter((s) => s.completed).length;
}

/** Get the first incomplete exercise's workoutExerciseId */
export function getNextIncompleteExerciseId(exercises: WorkoutExercise[]): string | null {
  for (const ex of exercises) {
    if (!isExerciseComplete(ex)) return ex.workoutExerciseId;
  }
  return null;
}

/** Compute exercisesDone / exercisesTotal from the exercise list */
export function getCompletionStats(exercises: WorkoutExercise[]) {
  const exercisesTotal = exercises.length;
  let exercisesDone = 0;
  for (const ex of exercises) {
    const allDone = ex.sets > 0 && ex.setCompletions.filter((s) => s.completed).length >= ex.sets;
    if (allDone) exercisesDone++;
  }
  return { exercisesDone, exercisesTotal };
}

/**
 * Update a set in the local cache, creating a placeholder row when the server
 * hasn't materialized one yet (the completion is only created on the first
 * interaction, so early toggles land before any rows exist).
 */
export function upsertLocalSet(
  sets: WorkoutSetCompletion[],
  setNumber: number,
  patch: Partial<Pick<WorkoutSetCompletion, 'completed' | 'actualReps' | 'actualWeight'>>
): WorkoutSetCompletion[] {
  if (sets.some((s) => s.setNumber === setNumber)) {
    return sets.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s));
  }
  return [
    ...sets,
    {
      id: `local-${setNumber}`,
      setNumber,
      completed: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
      ...patch,
    },
  ];
}

/** Highest number in the target ("6-8" → 8, 10 → 10) — the top of the prescribed range. */
export function parseTargetReps(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const nums = String(target).match(/\d+/g);
  if (!nums || nums.length === 0) return undefined;
  return Math.max(...nums.map(Number));
}

/** Top of a prescribed duration range in seconds ("30-60s" → 60, "1m 30s" → 90). */
export function parseTargetSeconds(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const { reps, repsMax } = parseDurationInput(target);
  return repsMax ?? reps ?? undefined;
}

/** First number in the target weight ("50 lbs" → 50, 50 → 50). */
export function parseTargetWeight(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const m = String(target).match(/[\d.]+/);
  return m ? Number(m[0]) : undefined;
}

/** Compact last-session cell for the set table: "52.5×8" / "12" / "60s" — empty if nothing logged. */
export function formatLastCompact(p: LastPerformance, isTime: boolean): string {
  const repsPart = p.reps != null ? (isTime ? formatDuration(p.reps) : String(p.reps)) : null;
  if (p.weight != null) {
    return repsPart != null ? `${p.weight}×${repsPart}` : String(p.weight);
  }
  return repsPart ?? '';
}

/** Prescription subtitle: "3×10-12 · 50" */
export function formatExercisePrescription(exercise: Pick<WorkoutExercise, 'sets' | 'reps' | 'weight'>): string {
  let text = exercise.reps ? `${exercise.sets}×${exercise.reps}` : `${exercise.sets} sets`;
  if (exercise.weight) text += ` · ${exercise.weight}`;
  return text;
}

/**
 * Drop a leading "Day N" prefix from the title — the day number already lives
 * in the eyebrow. Falls back to the original if stripping would leave nothing.
 */
export function stripDayPrefix(name: string): string {
  const stripped = name.replace(/^\s*day\s*\d+\s*(?:[—–\-:.]+\s*)?/i, '').trim();
  return stripped.length > 0 ? stripped : name;
}
