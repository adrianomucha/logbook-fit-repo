import { ApiError } from './api-client';

/**
 * Saving logged sets, shared by the web's useWorkoutExecution and the app's:
 * how big one request may be, what counts as "the server said no", and what
 * the client is told when a save fails. One place, so the two apps can never
 * disagree about whether a set was kept.
 */

/**
 * The most sets one PUT /api/client/workout/[id]/sets may carry. The server's
 * schema (updateSetsSchema) enforces this same number, so a bigger queue has
 * to go out as several requests or the whole write is refused.
 */
export const MAX_SETS_PER_REQUEST = 100;

export type SetWrite = {
  workoutExerciseId: string;
  setNumber: number;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
};

/** Shown while a save keeps failing on the connection and is being retried. */
export const SETS_SAVE_RETRYING = "Couldn't save your sets. Retrying now, so check your connection.";

/** Finish refused because logged sets are still waiting on the connection. */
export const SETS_UNSAVED_ON_FINISH = "Couldn't save your logged sets. Check your connection and try again.";

/** Finish refused because sets were just refused and unchecked: look before finishing. */
export const SETS_REJECTED_ON_FINISH =
  "Some sets weren't saved and have been unchecked. Check your workout, then finish.";

/**
 * Shown when the server refused sets for good. The screen has just gone back
 * to what is actually saved, so say that, and say what to do about it.
 */
export function setsNotSavedMessage(count: number): string {
  return count === 1
    ? "1 set wasn't saved, so it has been unchecked. Check your workout and log it again."
    : `${count} sets weren't saved, so they have been unchecked. Check your workout and log them again.`;
}

/** Split a queue into requests the server will accept. */
export function chunkSetWrites<T>(sets: T[], size: number = MAX_SETS_PER_REQUEST): T[][] {
  if (size < 1) throw new Error('Chunk size must be at least 1');
  const chunks: T[][] = [];
  for (let i = 0; i < sets.length; i += size) chunks.push(sets.slice(i, i + size));
  return chunks;
}

/**
 * True when retrying the same write can never succeed (bad data, workout
 * already finished, signed out). A timeout (408) or rate limit (429) is a
 * "try again later", like a dropped connection or a 5xx.
 */
export function isSetWriteRejection(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.status !== 408 &&
    err.status !== 429
  );
}

export type SetFlushResult = {
  /** Sets the server refused. They are out of the queue and will not be retried. */
  rejected: number;
  /** A request failed in a way worth retrying. What was not confirmed is still queued. */
  failed: boolean;
};

/**
 * Send everything in the queue, at most MAX_SETS_PER_REQUEST per request.
 *
 * An entry only leaves the queue once the server has answered for it, and
 * only if it is still the same object: a write queued while its request was
 * in flight replaces the entry and stays for the next flush.
 */
export async function flushSetWrites(
  pending: Map<string, SetWrite>,
  send: (sets: SetWrite[]) => Promise<unknown>
): Promise<SetFlushResult> {
  const settle = (chunk: [string, SetWrite][]): number => {
    let settled = 0;
    for (const [key, value] of chunk) {
      if (pending.get(key) === value) {
        pending.delete(key);
        settled++;
      }
    }
    return settled;
  };

  let rejected = 0;
  // Snapshot first: the queue keeps changing while requests are in flight.
  for (const chunk of chunkSetWrites(Array.from(pending))) {
    try {
      await send(chunk.map(([, value]) => value));
      settle(chunk);
    } catch (err) {
      if (!isSetWriteRejection(err)) return { rejected, failed: true };
      // Only this request was refused. Later ones may still be fine.
      rejected += settle(chunk);
    }
  }
  return { rejected, failed: false };
}
