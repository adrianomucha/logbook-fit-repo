import { useCallback, useRef } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import type {
  WorkoutDayDetail,
  WorkoutExercise,
  WorkoutSetCompletion,
} from '@/types/api';

export function useWorkoutExecution(dayId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WorkoutDayDetail>(
    dayId ? `/api/client/workout/day/${dayId}` : null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSetsRef = useRef<
    Map<string, { workoutExerciseId: string; setNumber: number; completed: boolean }>
  >(new Map());

  const completionId = data?.completion?.id ?? null;
  const isReadOnly = data?.completion?.status === 'COMPLETED';

  /** Start the workout (creates WorkoutCompletion + pre-creates SetCompletion rows) */
  const startWorkout = useCallback(async () => {
    if (!dayId || completionId) return;
    const result = await apiFetch<{ id: string; status: string }>(
      '/api/client/workout/start',
      { method: 'POST', body: JSON.stringify({ dayId }) }
    );
    // Refetch to get full day detail with new completion + set rows
    await mutate();
    return result;
  }, [dayId, completionId, mutate]);

  /** Toggle a set — optimistic update + debounced API save */
  const toggleSet = useCallback(
    (workoutExerciseId: string, setNumber: number) => {
      if (!completionId || isReadOnly || !data) return;

      // Compute the new completed state
      const exercise = data.exercises.find(
        (e) => e.workoutExerciseId === workoutExerciseId
      );
      if (!exercise) return;

      const existingSet = exercise.setCompletions.find(
        (s) => s.setNumber === setNumber
      );
      const newCompleted = !(existingSet?.completed ?? false);

      // Optimistic update
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId) return ex;
              return {
                ...ex,
                setCompletions: ex.setCompletions.map((sc) =>
                  sc.setNumber === setNumber
                    ? { ...sc, completed: newCompleted }
                    : sc
                ),
              };
            }),
          };
        },
        { revalidate: false }
      );

      // Queue for batch save
      const key = `${workoutExerciseId}:${setNumber}`;
      pendingSetsRef.current.set(key, {
        workoutExerciseId,
        setNumber,
        completed: newCompleted,
      });

      // Debounce the API call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        flushSets();
      }, 500);
    },
    [completionId, isReadOnly, data, mutate]
  );

  /** Flush pending set changes to the API */
  const flushSets = useCallback(async () => {
    if (!completionId || pendingSetsRef.current.size === 0) return;

    const sets = Array.from(pendingSetsRef.current.values());
    pendingSetsRef.current.clear();

    try {
      await apiFetch(`/api/client/workout/${completionId}/sets`, {
        method: 'PUT',
        body: JSON.stringify({ sets }),
      });
    } catch {
      // On failure, revalidate to get server truth
      mutate();
    }
  }, [completionId, mutate]);

  /** Flag/update an exercise */
  const flagExercise = useCallback(
    async (workoutExerciseId: string, note?: string) => {
      if (!completionId || isReadOnly) return;

      // Optimistic update
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId) return ex;
              return {
                ...ex,
                flag: ex.flag
                  ? { ...ex.flag, note: note ?? ex.flag.note }
                  : { id: 'temp', note: note ?? null, flaggedAt: new Date().toISOString() },
              };
            }),
          };
        },
        { revalidate: false }
      );

      await apiFetch(`/api/client/workout/${completionId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ workoutExerciseId, note }),
      });
      mutate();
    },
    [completionId, isReadOnly, mutate]
  );

  /** Unflag an exercise (optimistic only — no delete API, toggle by removing from local) */
  const unflagExercise = useCallback(
    (workoutExerciseId: string) => {
      if (!completionId || isReadOnly) return;

      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId) return ex;
              return { ...ex, flag: null };
            }),
          };
        },
        { revalidate: false }
      );
    },
    [completionId, isReadOnly, mutate]
  );

  /** Toggle flag on/off */
  const toggleFlag = useCallback(
    (workoutExerciseId: string) => {
      if (!data) return;
      const exercise = data.exercises.find(
        (e) => e.workoutExerciseId === workoutExerciseId
      );
      if (!exercise) return;

      if (exercise.flag) {
        unflagExercise(workoutExerciseId);
      } else {
        flagExercise(workoutExerciseId);
      }
    },
    [data, flagExercise, unflagExercise]
  );

  /** Update flag note */
  const updateFlagNote = useCallback(
    (workoutExerciseId: string, note: string) => {
      if (!completionId || isReadOnly) return;

      // Optimistic local update only — actual save happens on flag creation
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId || !ex.flag) return ex;
              return { ...ex, flag: { ...ex.flag, note } };
            }),
          };
        },
        { revalidate: false }
      );

      // Debounce save the note via the flag endpoint
      flagExercise(workoutExerciseId, note);
    },
    [completionId, isReadOnly, mutate, flagExercise]
  );

  /** Finish the workout */
  const finishWorkout = useCallback(
    async (effortRating?: string) => {
      if (!completionId || isReadOnly) return null;

      // Flush any pending sets first
      await flushSets();

      const result = await apiFetch<{
        id: string;
        status: string;
        completedAt: string;
        completionPct: number;
        exercisesDone: number;
        exercisesTotal: number;
        durationSec: number | null;
      }>(`/api/client/workout/${completionId}/finish`, {
        method: 'POST',
        body: JSON.stringify(effortRating ? { effortRating } : {}),
      });
      mutate();
      return result;
    },
    [completionId, isReadOnly, flushSets, mutate]
  );

  // Derived stats
  const exercises = data?.exercises ?? [];
  const stats = getCompletionStats(exercises);

  return {
    day: data ?? null,
    exercises,
    completion: data?.completion ?? null,
    completionId,
    isReadOnly,
    stats,
    error,
    isLoading,
    startWorkout,
    toggleSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
    flagExercise,
    refresh: mutate,
  };
}

/** Compute exercisesDone / exercisesTotal from the exercise list */
function getCompletionStats(exercises: WorkoutExercise[]) {
  let exercisesTotal = exercises.length;
  let exercisesDone = 0;

  for (const ex of exercises) {
    const allDone =
      ex.sets > 0 &&
      ex.setCompletions.filter((s) => s.completed).length >= ex.sets;
    if (allDone) exercisesDone++;
  }

  return { exercisesDone, exercisesTotal };
}

/** Check if a specific set is completed */
export function isSetCompleted(
  setCompletions: WorkoutSetCompletion[],
  setNumber: number
): boolean {
  return setCompletions.some((s) => s.setNumber === setNumber && s.completed);
}

/** Check if all sets of an exercise are completed */
export function isExerciseComplete(exercise: WorkoutExercise): boolean {
  if (exercise.sets === 0) return true;
  return (
    exercise.setCompletions.filter((s) => s.completed).length >= exercise.sets
  );
}

/** Count completed sets for an exercise */
export function getCompletedSetsCount(exercise: WorkoutExercise): number {
  return exercise.setCompletions.filter((s) => s.completed).length;
}

/** Get the first incomplete exercise's workoutExerciseId */
export function getNextIncompleteExerciseId(
  exercises: WorkoutExercise[]
): string | null {
  for (const ex of exercises) {
    if (!isExerciseComplete(ex)) return ex.workoutExerciseId;
  }
  return null;
}
