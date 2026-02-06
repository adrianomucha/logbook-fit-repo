import { Exercise, WorkoutCompletion, SetCompletion } from '@/types';

/**
 * Create a new WorkoutCompletion when starting a workout
 */
export function startWorkout(
  clientId: string,
  planId: string,
  weekId: string,
  dayId: string,
  totalExercises: number
): WorkoutCompletion {
  return {
    id: `wc-${Date.now()}`,
    clientId,
    planId,
    weekId,
    dayId,
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
    completionPct: 0,
    exercisesDone: 0,
    exercisesTotal: totalExercises,
  };
}

/**
 * Toggle a set's completion status
 * Returns updated setCompletions array
 */
export function toggleSet(
  setCompletions: SetCompletion[],
  workoutCompletionId: string,
  exerciseId: string,
  setNumber: number,
  actualWeight?: string,
  actualReps?: string
): SetCompletion[] {
  // Find existing set completion
  const existingIndex = setCompletions.findIndex(
    (sc) =>
      sc.workoutCompletionId === workoutCompletionId &&
      sc.exerciseId === exerciseId &&
      sc.setNumber === setNumber
  );

  if (existingIndex >= 0) {
    // Toggle existing - if completed, uncomplete it; if uncompleted, complete it
    const existing = setCompletions[existingIndex];
    const updated = [...setCompletions];
    updated[existingIndex] = {
      ...existing,
      completed: !existing.completed,
      completedAt: !existing.completed ? new Date().toISOString() : undefined,
      actualWeight: !existing.completed ? actualWeight : undefined,
      actualReps: !existing.completed ? actualReps : undefined,
    };
    return updated;
  } else {
    // Create new set completion (completed = true)
    const newSetCompletion: SetCompletion = {
      id: `sc-${Date.now()}-${exerciseId}-${setNumber}`,
      workoutCompletionId,
      exerciseId,
      setNumber,
      completed: true,
      actualWeight,
      actualReps,
      completedAt: new Date().toISOString(),
    };
    return [...setCompletions, newSetCompletion];
  }
}

/**
 * Check if all sets for an exercise are completed
 */
export function isExerciseComplete(
  exercise: Exercise,
  setCompletions: SetCompletion[],
  workoutCompletionId: string
): boolean {
  const exerciseSetCompletions = setCompletions.filter(
    (sc) =>
      sc.workoutCompletionId === workoutCompletionId &&
      sc.exerciseId === exercise.id &&
      sc.completed
  );
  return exerciseSetCompletions.length >= exercise.sets;
}

/**
 * Get completed sets count for an exercise
 */
export function getCompletedSetsCount(
  exerciseId: string,
  setCompletions: SetCompletion[],
  workoutCompletionId: string
): number {
  return setCompletions.filter(
    (sc) =>
      sc.workoutCompletionId === workoutCompletionId &&
      sc.exerciseId === exerciseId &&
      sc.completed
  ).length;
}

/**
 * Calculate completion stats from exercises and set completions
 */
export function calculateCompletionStats(
  exercises: Exercise[],
  setCompletions: SetCompletion[],
  workoutCompletionId: string
): { completionPct: number; exercisesDone: number; exercisesTotal: number } {
  const exercisesTotal = exercises.length;

  // Count exercises where all sets are completed
  const exercisesDone = exercises.filter((ex) =>
    isExerciseComplete(ex, setCompletions, workoutCompletionId)
  ).length;

  // Calculate overall percentage based on individual sets
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = setCompletions.filter(
    (sc) => sc.workoutCompletionId === workoutCompletionId && sc.completed
  ).length;

  const completionPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return { completionPct, exercisesDone, exercisesTotal };
}

/**
 * Get the next incomplete exercise ID (for auto-expand)
 * Returns null if all exercises are complete
 */
export function getNextIncompleteExercise(
  exercises: Exercise[],
  setCompletions: SetCompletion[],
  workoutCompletionId: string
): string | null {
  for (const exercise of exercises) {
    if (!isExerciseComplete(exercise, setCompletions, workoutCompletionId)) {
      return exercise.id;
    }
  }
  return null;
}

/**
 * Finish a workout - update status and timestamps
 */
export function finishWorkout(
  completion: WorkoutCompletion,
  exercises: Exercise[],
  setCompletions: SetCompletion[]
): WorkoutCompletion {
  const stats = calculateCompletionStats(exercises, setCompletions, completion.id);

  // Calculate duration in seconds
  let durationSec: number | undefined;
  if (completion.startedAt) {
    const startTime = new Date(completion.startedAt).getTime();
    const endTime = Date.now();
    durationSec = Math.round((endTime - startTime) / 1000);
  }

  return {
    ...completion,
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    completionPct: stats.completionPct,
    exercisesDone: stats.exercisesDone,
    exercisesTotal: stats.exercisesTotal,
    durationSec,
  };
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check if a set is completed
 */
export function isSetCompleted(
  workoutCompletionId: string,
  exerciseId: string,
  setNumber: number,
  setCompletions: SetCompletion[]
): boolean {
  return setCompletions.some(
    (sc) =>
      sc.workoutCompletionId === workoutCompletionId &&
      sc.exerciseId === exerciseId &&
      sc.setNumber === setNumber &&
      sc.completed
  );
}
