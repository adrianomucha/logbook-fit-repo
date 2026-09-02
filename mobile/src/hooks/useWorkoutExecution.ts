import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import useSWR from 'swr';
import type { WorkoutDayDetail } from '@logbook/shared/types/api';
import { getCompletionStats, upsertLocalSet } from '@logbook/shared/workout-execution';
import { ApiError, apiFetch } from '@/lib/api';

type SetWrite = {
  workoutExerciseId: string;
  setNumber: number;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
};

/**
 * The live workout, ported from the web's hook of the same name with the
 * same guarantees: viewing never starts the workout (the first interaction
 * does), set writes are optimistic, debounced, merged per set and kept
 * queued until the server confirms them, and a flaky gym connection retries
 * instead of dropping logged sets. Backgrounding the app flushes at once —
 * "check the last set, pocket the phone" is the commonest gesture there is.
 */
export function useWorkoutExecution(dayId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WorkoutDayDetail>(
    dayId ? `/api/client/workout/day/${dayId}` : null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSetsRef = useRef<Map<string, SetWrite>>(new Map());
  /** Set when a save keeps failing; cleared on the next success. */
  const [saveError, setSaveError] = useState<string | null>(null);

  const completionId = data?.completion?.id ?? null;
  const isReadOnly = data?.completion?.status === 'COMPLETED';

  const startPromiseRef = useRef<Promise<string> | null>(null);
  const ensureStarted = useCallback(async (): Promise<string> => {
    const existingId = data?.completion?.id;
    if (existingId) return existingId;
    if (!dayId) throw new Error('No workout day');

    if (!startPromiseRef.current) {
      startPromiseRef.current = (async () => {
        try {
          const result = await apiFetch<{ id: string; status: string; startedAt?: string }>(
            '/api/client/workout/start',
            { method: 'POST', body: JSON.stringify({ dayId }) }
          );
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
          startPromiseRef.current = null;
          await mutate();
          throw err;
        }
      })();
    }
    return startPromiseRef.current;
  }, [data, dayId, mutate]);

  const flushPromiseRef = useRef<Promise<boolean> | null>(null);

  const flushSets = useCallback((): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      if (pendingSetsRef.current.size === 0) return true;

      let id = completionId;
      if (!id) {
        try {
          id = await ensureStarted();
        } catch {
          return false;
        }
      }

      const batch = new Map(pendingSetsRef.current);
      const sets = Array.from(batch.values());
      try {
        await apiFetch(`/api/client/workout/${id}/sets`, {
          method: 'PUT',
          body: JSON.stringify({ sets }),
        });
        for (const [key, value] of batch) {
          if (pendingSetsRef.current.get(key) === value) pendingSetsRef.current.delete(key);
        }
        setSaveError(null);
        return pendingSetsRef.current.size === 0;
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          // Deterministic rejection (e.g. workout already completed) —
          // retrying can never succeed. Drop the batch and resync.
          for (const [key, value] of batch) {
            if (pendingSetsRef.current.get(key) === value) pendingSetsRef.current.delete(key);
          }
          void mutate();
          return pendingSetsRef.current.size === 0;
        }
        // Transient: keep everything queued and retry, without revalidating —
        // that would visually revert checkmarks the queue will still persist.
        setSaveError("Couldn't save your sets — retrying. Check your connection.");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void flushSets(), 4000);
        return false;
      }
    };

    const prev = flushPromiseRef.current ?? Promise.resolve(true);
    const next = prev.catch(() => false).then(run);
    flushPromiseRef.current = next;
    next.finally(() => {
      if (flushPromiseRef.current === next) flushPromiseRef.current = null;
    });
    return next;
  }, [completionId, ensureStarted, mutate]);

  // Flush the moment the app leaves the foreground; the debounce timer may
  // not fire once iOS suspends the JS thread.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && pendingSetsRef.current.size > 0) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        void flushSets();
      }
    });
    return () => sub.remove();
  }, [flushSets]);

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
        completed: patch.completed ?? existing?.completed ?? current?.completed ?? false,
        actualReps: patch.actualReps ?? existing?.actualReps ?? current?.actualReps ?? undefined,
        actualWeight: patch.actualWeight ?? existing?.actualWeight ?? current?.actualWeight ?? undefined,
      });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void flushSets(), 500);
    },
    [data, flushSets]
  );

  const patchExercise = useCallback(
    (
      workoutExerciseId: string,
      fn: (ex: WorkoutDayDetail['exercises'][number]) => WorkoutDayDetail['exercises'][number]
    ) =>
      mutate(
        (prev) =>
          prev
            ? {
                ...prev,
                exercises: prev.exercises.map((ex) =>
                  ex.workoutExerciseId === workoutExerciseId ? fn(ex) : ex
                ),
              }
            : prev,
        { revalidate: false }
      ),
    [mutate]
  );

  const toggleSet = useCallback(
    (workoutExerciseId: string, setNumber: number) => {
      if (isReadOnly || !data) return;
      const exercise = data.exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
      if (!exercise) return;

      const pending = pendingSetsRef.current.get(`${workoutExerciseId}:${setNumber}`);
      const existingSet = exercise.setCompletions.find((s) => s.setNumber === setNumber);
      const newCompleted = !(pending?.completed ?? existingSet?.completed ?? false);

      void patchExercise(workoutExerciseId, (ex) => ({
        ...ex,
        setCompletions: upsertLocalSet(ex.setCompletions, setNumber, { completed: newCompleted }),
      }));
      enqueueSetWrite(workoutExerciseId, setNumber, { completed: newCompleted });
    },
    [isReadOnly, data, patchExercise, enqueueSetWrite]
  );

  const updateSet = useCallback(
    (workoutExerciseId: string, setNumber: number, patch: { actualReps?: number; actualWeight?: number }) => {
      if (isReadOnly || !data) return;
      void patchExercise(workoutExerciseId, (ex) => ({
        ...ex,
        setCompletions: upsertLocalSet(ex.setCompletions, setNumber, patch),
      }));
      enqueueSetWrite(workoutExerciseId, setNumber, patch);
    },
    [isReadOnly, data, patchExercise, enqueueSetWrite]
  );

  const flagExercise = useCallback(
    async (workoutExerciseId: string, note?: string): Promise<boolean> => {
      if (isReadOnly) return false;
      void patchExercise(workoutExerciseId, (ex) => ({
        ...ex,
        flag: ex.flag
          ? { ...ex.flag, note: note ?? ex.flag.note }
          : { id: 'temp', note: note ?? null, flaggedAt: new Date().toISOString() },
      }));
      try {
        const id = completionId ?? (await ensureStarted());
        const saved = await apiFetch<{ id: string }>(`/api/client/workout/${id}/flag`, {
          method: 'POST',
          body: JSON.stringify({ workoutExerciseId, note }),
        });
        void patchExercise(workoutExerciseId, (ex) =>
          ex.flag?.id === 'temp' ? { ...ex, flag: { ...ex.flag, id: saved.id } } : ex
        );
        return true;
      } catch {
        void mutate();
        return false;
      }
    },
    [completionId, isReadOnly, ensureStarted, patchExercise, mutate]
  );

  const unflagExercise = useCallback(
    async (workoutExerciseId: string): Promise<boolean> => {
      if (isReadOnly) return false;
      void patchExercise(workoutExerciseId, (ex) => ({ ...ex, flag: null }));
      if (!completionId) return true;
      try {
        await apiFetch(`/api/client/workout/${completionId}/flag`, {
          method: 'DELETE',
          body: JSON.stringify({ workoutExerciseId }),
        });
        return true;
      } catch {
        void mutate();
        return false;
      }
    },
    [completionId, isReadOnly, patchExercise, mutate]
  );

  const toggleFlag = useCallback(
    (workoutExerciseId: string): Promise<boolean> => {
      const exercise = data?.exercises.find((e) => e.workoutExerciseId === workoutExerciseId);
      if (!exercise) return Promise.resolve(false);
      return exercise.flag ? unflagExercise(workoutExerciseId) : flagExercise(workoutExerciseId);
    },
    [data, flagExercise, unflagExercise]
  );

  // Flag notes save after typing pauses; leaving mid-debounce still saves.
  const noteDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingNotesRef = useRef<Map<string, string>>(new Map());
  const flagExerciseRef = useRef(flagExercise);
  useEffect(() => {
    flagExerciseRef.current = flagExercise;
  }, [flagExercise]);
  useEffect(() => {
    const timers = noteDebounceRef.current;
    const pendingNotes = pendingNotesRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      for (const [exerciseId, note] of pendingNotes) void flagExerciseRef.current(exerciseId, note);
      pendingNotes.clear();
    };
  }, []);

  const updateFlagNote = useCallback(
    (workoutExerciseId: string, note: string) => {
      if (isReadOnly) return;
      void patchExercise(workoutExerciseId, (ex) => (ex.flag ? { ...ex, flag: { ...ex.flag, note } } : ex));
      pendingNotesRef.current.set(workoutExerciseId, note);
      const existing = noteDebounceRef.current.get(workoutExerciseId);
      if (existing) clearTimeout(existing);
      noteDebounceRef.current.set(
        workoutExerciseId,
        setTimeout(() => {
          noteDebounceRef.current.delete(workoutExerciseId);
          pendingNotesRef.current.delete(workoutExerciseId);
          void flagExercise(workoutExerciseId, note);
        }, 600)
      );
    },
    [isReadOnly, patchExercise, flagExercise]
  );

  const restartWorkout = useCallback(async () => {
    if (!completionId) return null;
    const result = await apiFetch<{ id: string; status: string }>(
      `/api/client/workout/${completionId}/restart`,
      { method: 'POST' }
    );
    await mutate();
    return result;
  }, [completionId, mutate]);

  /** Finish the workout — throws on failure so callers can handle */
  const finishWorkout = useCallback(
    async (effortRating?: string) => {
      if (isReadOnly) return null;
      const flushed = await flushSets();
      if (!flushed) {
        throw new Error("Couldn't save your logged sets. Check your connection and try again.");
      }
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
        void mutate();
        return result;
      } catch (err) {
        void mutate();
        throw err;
      }
    },
    [completionId, isReadOnly, ensureStarted, flushSets, mutate]
  );

  const exercises = data?.exercises ?? [];
  return {
    day: data ?? null,
    exercises,
    completion: data?.completion ?? null,
    completionId,
    isReadOnly,
    stats: getCompletionStats(exercises),
    saveError,
    error,
    isLoading,
    restartWorkout,
    toggleSet,
    updateSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
    refresh: mutate,
  };
}
