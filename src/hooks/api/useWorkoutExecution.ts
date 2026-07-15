import { useCallback, useEffect, useRef } from 'react';
import useSWR, { mutate as mutateGlobal } from 'swr';
import { apiFetch } from '@/lib/api-client';
import type {
  WorkoutDayDetail,
  WorkoutExercise,
  WorkoutSetCompletion,
} from '@/types/api';

/**
 * The dashboard's today card and progress views read workout status from
 * their own SWR keys — revalidate them whenever a workout's status changes
 * so the client doesn't land back on a stale "Continue workout" card.
 */
export function refreshDashboardCaches() {
  mutateGlobal('/api/client/week-overview');
  mutateGlobal('/api/client/progress');
}

export function useWorkoutExecution(dayId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WorkoutDayDetail>(
    dayId ? `/api/client/workout/day/${dayId}` : null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSetsRef = useRef<
    Map<
      string,
      {
        workoutExerciseId: string;
        setNumber: number;
        completed: boolean;
        actualReps?: number;
        actualWeight?: number;
      }
    >
  >(new Map());

  const completionId = data?.completion?.id ?? null;
  const isReadOnly = data?.completion?.status === 'COMPLETED';

  // Single-flight guard so concurrent first interactions trigger one start call
  const startPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Create the WorkoutCompletion if it doesn't exist yet and return its id.
   * The workout only counts as started on the first real interaction (set
   * toggle, weight/reps edit, flag, finish) — never from merely viewing the
   * page, so the dashboard doesn't show "Continue workout" after a peek.
   */
  const ensureStarted = useCallback(async (): Promise<string> => {
    const existingId = data?.completion?.id;
    if (existingId) return existingId;
    if (!dayId) throw new Error('No workout day');

    if (!startPromiseRef.current) {
      startPromiseRef.current = (async () => {
        try {
          const result = await apiFetch<{
            id: string;
            status: string;
            startedAt?: string;
          }>('/api/client/workout/start', {
            method: 'POST',
            body: JSON.stringify({ dayId }),
          });
          // Patch the cache in place (no revalidate) so the optimistic set
          // state from the interaction that triggered the start survives.
          await mutate(
            (prev) =>
              prev
                ? {
                    ...prev,
                    completion: prev.completion ?? {
                      id: result.id,
                      status: result.status ?? 'IN_PROGRESS',
                      startedAt: result.startedAt ?? new Date().toISOString(),
                      completedAt: null,
                      completionPct: 0,
                      effortRating: null,
                      durationSec: null,
                    },
                  }
                : prev,
            { revalidate: false }
          );
          return result.id;
        } catch (err) {
          // Allow a retry on the next interaction; revalidate in case the
          // start actually landed server-side (race condition)
          startPromiseRef.current = null;
          await mutate();
          throw err;
        }
      })();
    }
    return startPromiseRef.current;
  }, [data, dayId, mutate]);

  /** Flush pending set changes to the API (starting the workout if needed) */
  const flushSets = useCallback(async () => {
    if (pendingSetsRef.current.size === 0) return;

    let id = completionId;
    if (!id) {
      try {
        id = await ensureStarted();
      } catch {
        // Keep the sets queued — the next interaction retries the start
        return;
      }
    }

    const sets = Array.from(pendingSetsRef.current.values());
    pendingSetsRef.current.clear();

    try {
      await apiFetch(`/api/client/workout/${id}/sets`, {
        method: 'PUT',
        body: JSON.stringify({ sets }),
      });
    } catch {
      // On failure, revalidate to get server truth
      mutate();
    }
  }, [completionId, ensureStarted, mutate]);

  // Best-effort flush when the tab is hidden or torn down, so the last
  // debounced set writes survive an abrupt exit (closed tab, app switch).
  // keepalive lets the request outlive the page; sendBeacon can't send PUT.
  // Skipped when the workout hasn't started yet — a start can't be awaited
  // during teardown, and that window only spans the first debounce tick.
  useEffect(() => {
    const flushPendingNow = () => {
      if (!completionId || pendingSetsRef.current.size === 0) return;
      const sets = Array.from(pendingSetsRef.current.values());
      pendingSetsRef.current.clear();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      fetch(`/api/client/workout/${completionId}/sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets }),
        keepalive: true,
      }).catch(() => {
        // Nothing to do — the next load revalidates from server truth
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingNow();
    };
    window.addEventListener('pagehide', flushPendingNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [completionId]);

  /**
   * Queue a set write, merging with any pending write for the same set so a
   * reps/weight edit and a completion toggle land in one request. Always carries
   * the latest known `completed` value (the API requires it on every set).
   */
  const enqueueSetWrite = useCallback(
    (
      workoutExerciseId: string,
      setNumber: number,
      patch: { completed?: boolean; actualReps?: number; actualWeight?: number }
    ) => {
      const key = `${workoutExerciseId}:${setNumber}`;
      const existing = pendingSetsRef.current.get(key);
      const current = data?.exercises
        .find((e) => e.workoutExerciseId === workoutExerciseId)
        ?.setCompletions.find((s) => s.setNumber === setNumber);

      pendingSetsRef.current.set(key, {
        workoutExerciseId,
        setNumber,
        completed:
          patch.completed ?? existing?.completed ?? current?.completed ?? false,
        actualReps:
          patch.actualReps ?? existing?.actualReps ?? current?.actualReps ?? undefined,
        actualWeight:
          patch.actualWeight ??
          existing?.actualWeight ??
          current?.actualWeight ??
          undefined,
      });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => flushSets(), 500);
    },
    [data, flushSets]
  );

  /** Toggle a set's completion — optimistic update + debounced API save */
  const toggleSet = useCallback(
    (workoutExerciseId: string, setNumber: number) => {
      if (isReadOnly || !data) return;

      const exercise = data.exercises.find(
        (e) => e.workoutExerciseId === workoutExerciseId
      );
      if (!exercise) return;

      const existingSet = exercise.setCompletions.find(
        (s) => s.setNumber === setNumber
      );
      const newCompleted = !(existingSet?.completed ?? false);

      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId) return ex;
              return {
                ...ex,
                setCompletions: upsertLocalSet(ex.setCompletions, setNumber, {
                  completed: newCompleted,
                }),
              };
            }),
          };
        },
        { revalidate: false }
      );

      enqueueSetWrite(workoutExerciseId, setNumber, { completed: newCompleted });
    },
    [isReadOnly, data, mutate, enqueueSetWrite]
  );

  /** Update a set's logged reps and/or weight — optimistic update + debounced save */
  const updateSet = useCallback(
    (
      workoutExerciseId: string,
      setNumber: number,
      patch: { actualReps?: number; actualWeight?: number }
    ) => {
      if (isReadOnly || !data) return;

      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((ex) => {
              if (ex.workoutExerciseId !== workoutExerciseId) return ex;
              return {
                ...ex,
                setCompletions: upsertLocalSet(ex.setCompletions, setNumber, patch),
              };
            }),
          };
        },
        { revalidate: false }
      );

      enqueueSetWrite(workoutExerciseId, setNumber, patch);
    },
    [isReadOnly, data, mutate, enqueueSetWrite]
  );

  /** Flag/update an exercise */
  const flagExercise = useCallback(
    async (workoutExerciseId: string, note?: string) => {
      if (isReadOnly) return;

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

      try {
        const id = completionId ?? (await ensureStarted());
        await apiFetch(`/api/client/workout/${id}/flag`, {
          method: 'POST',
          body: JSON.stringify({ workoutExerciseId, note }),
        });
      } catch {
        // Revert optimistic update on failure
      }
      mutate();
    },
    [completionId, isReadOnly, ensureStarted, mutate]
  );

  /** Unflag an exercise (optimistic only — no delete API, toggle by removing from local) */
  const unflagExercise = useCallback(
    (workoutExerciseId: string) => {
      if (isReadOnly) return;

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
    [isReadOnly, mutate]
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
      if (isReadOnly) return;

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
    [isReadOnly, mutate, flagExercise]
  );

  /** Restart the workout — resets all sets/flags and starts fresh */
  const restartWorkout = useCallback(async () => {
    if (!completionId) return null;

    const result = await apiFetch<{ id: string; status: string }>(
      `/api/client/workout/${completionId}/restart`,
      { method: 'POST' }
    );
    await mutate();
    refreshDashboardCaches();
    return result;
  }, [completionId, mutate]);

  /** Finish the workout — throws on failure so callers can handle */
  const finishWorkout = useCallback(
    async (effortRating?: string) => {
      if (isReadOnly) return null;

      // Flush any pending sets first
      await flushSets();

      try {
        const id = completionId ?? (await ensureStarted());
        const result = await apiFetch<{
          id: string;
          status: string;
          completedAt: string;
          completionPct: number;
          exercisesDone: number;
          exercisesTotal: number;
          durationSec: number | null;
        }>(`/api/client/workout/${id}/finish`, {
          method: 'POST',
          body: JSON.stringify(effortRating ? { effortRating } : {}),
        });
        mutate();
        refreshDashboardCaches();
        return result;
      } catch (err) {
        mutate(); // Revalidate to get server truth
        throw err;
      }
    },
    [completionId, isReadOnly, ensureStarted, flushSets, mutate]
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
    restartWorkout,
    toggleSet,
    updateSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
    flagExercise,
    refresh: mutate,
  };
}

/**
 * Update a set in the local cache, creating a placeholder row when the server
 * hasn't materialized one yet (the completion is only created on the first
 * interaction, so early toggles land before any rows exist).
 */
function upsertLocalSet(
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

/** Compute exercisesDone / exercisesTotal from the exercise list */
function getCompletionStats(exercises: WorkoutExercise[]) {
  const exercisesTotal = exercises.length;
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
