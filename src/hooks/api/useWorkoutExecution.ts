import { useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { WorkoutDayDetail } from '@/types/api';
import {
  getCompletionStats,
  upsertLocalSet,
  isSetCompleted,
  isExerciseComplete,
  getCompletedSetsCount,
  getNextIncompleteExerciseId,
} from '@logbook/shared/workout-execution';

// The pure parts live in @logbook/shared so the native app shares them;
// re-exported here for the components that always imported them from the hook.
export { isSetCompleted, isExerciseComplete, getCompletedSetsCount, getNextIncompleteExerciseId };

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

  // Serialize flushes so requests never interleave, and make the
  // "couldn't save" toast fire once per outage, not once per retry.
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const saveErrorToastShownRef = useRef(false);

  /**
   * Flush pending set changes to the API (starting the workout if needed).
   * Entries stay queued until the server confirms them — a failed request
   * must never silently drop logged sets. Resolves true once the queue is
   * fully persisted (waiting behind any flush already in flight).
   */
  const flushSets = useCallback((): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      if (pendingSetsRef.current.size === 0) return true;

      let id = completionId;
      if (!id) {
        try {
          id = await ensureStarted();
        } catch {
          // Keep the sets queued — the next interaction retries the start
          return false;
        }
      }

      // Snapshot without clearing: writes enqueued while the request is in
      // flight supersede their snapshot entry and survive for the next flush.
      const batch = new Map(pendingSetsRef.current);
      const sets = Array.from(batch.values());

      try {
        await apiFetch(`/api/client/workout/${id}/sets`, {
          method: 'PUT',
          body: JSON.stringify({ sets }),
        });
        for (const [key, value] of batch) {
          if (pendingSetsRef.current.get(key) === value) {
            pendingSetsRef.current.delete(key);
          }
        }
        saveErrorToastShownRef.current = false;
        return pendingSetsRef.current.size === 0;
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          // Deterministic rejection (e.g. workout already completed) —
          // retrying can never succeed. Drop the batch and resync.
          for (const [key, value] of batch) {
            if (pendingSetsRef.current.get(key) === value) {
              pendingSetsRef.current.delete(key);
            }
          }
          mutate();
          return pendingSetsRef.current.size === 0;
        }
        // Transient failure: keep everything queued and retry — don't
        // revalidate, that would visually revert checkmarks the queue is
        // still going to persist
        if (!saveErrorToastShownRef.current) {
          saveErrorToastShownRef.current = true;
          toast.error("Couldn't save your sets — retrying. Check your connection.");
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => flushSets(), 4000);
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

  // Last-chance flush when the tab is hidden or the page unloads — "check the
  // final set, lock the phone" is the most common gym gesture, and the 500ms
  // debounce timer dies with the page. keepalive lets the write outlive it.
  // Entries stay queued: if the page survives, the normal flush reconciles
  // (the sets PUT is an idempotent upsert, so a duplicate send is harmless).
  useEffect(() => {
    const flushBeforeHide = () => {
      if (pendingSetsRef.current.size === 0 || !completionId) return;
      const sets = Array.from(pendingSetsRef.current.values());
      fetch(`/api/client/workout/${completionId}/sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets }),
        keepalive: true,
      }).catch(() => {});
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushBeforeHide();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushBeforeHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushBeforeHide);
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

      // The pending queue holds the latest intended state, so rapid taps
      // toggle correctly even before the optimistic cache re-renders
      const pending = pendingSetsRef.current.get(
        `${workoutExerciseId}:${setNumber}`
      );
      const existingSet = exercise.setCompletions.find(
        (s) => s.setNumber === setNumber
      );
      const newCompleted = !(pending?.completed ?? existingSet?.completed ?? false);

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
        const saved = await apiFetch<{ id: string }>(
          `/api/client/workout/${id}/flag`,
          {
            method: 'POST',
            body: JSON.stringify({ workoutExerciseId, note }),
          }
        );
        // Patch only the placeholder id in place. A full revalidation here
        // would clobber un-flushed optimistic set toggles and race note typing.
        mutate(
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              exercises: prev.exercises.map((ex) => {
                if (ex.workoutExerciseId !== workoutExerciseId || !ex.flag) return ex;
                return ex.flag.id === 'temp'
                  ? { ...ex, flag: { ...ex.flag, id: saved.id } }
                  : ex;
              }),
            };
          },
          { revalidate: false }
        );
      } catch {
        // Revert the optimistic flag to server truth on failure
        mutate();
        toast.error("Couldn't save the flag. Please try again.");
      }
    },
    [completionId, isReadOnly, ensureStarted, mutate]
  );

  /** Unflag an exercise — optimistic removal plus a real delete on the server */
  const unflagExercise = useCallback(
    async (workoutExerciseId: string) => {
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

      // No completion yet means the flag never reached the server
      if (!completionId) return;
      try {
        await apiFetch(`/api/client/workout/${completionId}/flag`, {
          method: 'DELETE',
          body: JSON.stringify({ workoutExerciseId }),
        });
      } catch {
        // Restore server truth — otherwise the flag resurrects on the next
        // revalidation and the coach keeps seeing something the athlete removed
        mutate();
        toast.error("Couldn't remove the flag. Please try again.");
      }
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

  // Debounce timers and latest unsaved note text, one per exercise. Saving
  // per keystroke hammers the API and lets out-of-order responses persist a
  // truncated note; the text ref lets unmount flush what's still pending.
  const noteDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const pendingNotesRef = useRef<Map<string, string>>(new Map());
  const flagExerciseRef = useRef<(id: string, note?: string) => Promise<void>>();
  useEffect(() => {
    flagExerciseRef.current = flagExercise;
  }, [flagExercise]);

  useEffect(() => {
    const timers = noteDebounceRef.current;
    const pendingNotes = pendingNotesRef.current;
    return () => {
      // Leaving the page mid-debounce must not eat the note
      for (const timer of timers.values()) clearTimeout(timer);
      for (const [exerciseId, note] of pendingNotes) {
        flagExerciseRef.current?.(exerciseId, note);
      }
      pendingNotes.clear();
    };
  }, []);

  /** Update flag note — optimistic locally, saved after typing pauses */
  const updateFlagNote = useCallback(
    (workoutExerciseId: string, note: string) => {
      if (isReadOnly) return;

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

      pendingNotesRef.current.set(workoutExerciseId, note);
      const existing = noteDebounceRef.current.get(workoutExerciseId);
      if (existing) clearTimeout(existing);
      noteDebounceRef.current.set(
        workoutExerciseId,
        setTimeout(() => {
          noteDebounceRef.current.delete(workoutExerciseId);
          pendingNotesRef.current.delete(workoutExerciseId);
          flagExercise(workoutExerciseId, note);
        }, 600)
      );
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
    return result;
  }, [completionId, mutate]);

  /** Finish the workout — throws on failure so callers can handle */
  const finishWorkout = useCallback(
    async (effortRating?: string) => {
      if (isReadOnly) return null;

      // All logged sets must be on the server before finishing — otherwise
      // the workout completes at 0% while the UI celebrates a full session
      const flushed = await flushSets();
      if (!flushed) {
        throw new Error(
          "Couldn't save your logged sets. Check your connection and try again."
        );
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
        mutate();
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
