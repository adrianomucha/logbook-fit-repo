import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import useSWR from 'swr';
import type { WorkoutDayDetail } from '@logbook/shared/types/api';
import { getCompletionStats, upsertLocalSet } from '@logbook/shared/workout-execution';
import {
  flushSetWrites,
  setsNotSavedMessage,
  SETS_REJECTED_ON_FINISH,
  SETS_SAVE_RETRYING,
  SETS_UNSAVED_ON_FINISH,
  type SetWrite,
} from '@logbook/shared/set-writes';
import { apiFetch } from '@/lib/api';

type FlushOutcome = 'saved' | 'rejected' | 'pending';

/**
 * The live workout, ported from the web's hook of the same name with the
 * same guarantees: viewing never starts the workout (the first interaction
 * does), set writes are optimistic, debounced, merged per set and kept
 * queued until the server confirms them, and a flaky gym connection retries
 * instead of dropping logged sets. Backgrounding the app flushes at once:
 * "check the last set, pocket the phone" is the commonest gesture there is.
 */
export function useWorkoutExecution(dayId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WorkoutDayDetail>(
    dayId ? `/api/client/workout/day/${dayId}` : null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSetsRef = useRef<Map<string, SetWrite>>(new Map());
  /**
   * Set when a save keeps failing, or when the server refused sets and they
   * were unchecked. Cleared on the next save that goes through.
   */
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

  const flushPromiseRef = useRef<Promise<FlushOutcome> | null>(null);

  const flushSets = useCallback((): Promise<FlushOutcome> => {
    const run = async (): Promise<FlushOutcome> => {
      if (pendingSetsRef.current.size === 0) return 'saved';

      let id = completionId;
      if (!id) {
        try {
          id = await ensureStarted();
        } catch {
          return 'pending';
        }
      }

      // Goes out in requests no bigger than the server's cap. Writes queued
      // while a request is in flight survive for the next flush.
      const { rejected, failed } = await flushSetWrites(pendingSetsRef.current, (sets) =>
        apiFetch(`/api/client/workout/${id}/sets`, {
          method: 'PUT',
          body: JSON.stringify({ sets }),
        })
      );

      if (rejected > 0) {
        // The server said no (e.g. workout already completed), so retrying
        // can never succeed. Resync to what is saved, and say so: the
        // checkmarks are about to revert under the client's thumb.
        void mutate();
        setSaveError(setsNotSavedMessage(rejected));
      }

      if (failed) {
        // Transient: keep everything queued and retry, without revalidating
        // for this alone. That would visually revert checkmarks the queue
        // will still persist.
        if (rejected === 0) setSaveError(SETS_SAVE_RETRYING);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void flushSets(), 4000);
        return rejected > 0 ? 'rejected' : 'pending';
      }

      if (rejected > 0) return 'rejected';
      setSaveError(null);
      return pendingSetsRef.current.size === 0 ? 'saved' : 'pending';
    };

    const prev = flushPromiseRef.current ?? Promise.resolve('saved' as const);
    const next = prev.catch(() => 'pending' as const).then(run);
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

  /** Finish the workout: throws on failure so callers can handle */
  const finishWorkout = useCallback(
    async (effortRating?: string) => {
      if (isReadOnly) return null;
      const flushed = await flushSets();
      if (flushed === 'pending') throw new Error(SETS_UNSAVED_ON_FINISH);
      // Some sets were refused and have just been unchecked. Don't finish a
      // workout the client hasn't seen in its real state.
      if (flushed === 'rejected') throw new Error(SETS_REJECTED_ON_FINISH);
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
