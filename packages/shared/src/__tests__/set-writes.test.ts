import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api-client';
import {
  MAX_SETS_PER_REQUEST,
  chunkSetWrites,
  flushSetWrites,
  isSetWriteRejection,
  setsNotSavedMessage,
  type SetWrite,
} from '../set-writes';
import { updateSetsSchema } from '../validations/schemas';

const EXERCISE_ID = '3f2b8c1e-7a4d-4e9b-9c55-0d6a1b2c3d4e';

function queueOf(count: number): Map<string, SetWrite> {
  const pending = new Map<string, SetWrite>();
  for (let i = 0; i < count; i++) {
    // Sets top out at 20 per exercise, so spread across exercises
    const exercise = `ex-${Math.floor(i / 20)}`;
    const setNumber = (i % 20) + 1;
    pending.set(`${exercise}:${setNumber}`, { workoutExerciseId: exercise, setNumber, completed: true });
  }
  return pending;
}

describe('the per-request cap', () => {
  it('is the number the server schema enforces', () => {
    const set = (n: number) => ({ workoutExerciseId: EXERCISE_ID, setNumber: (n % 20) + 1, completed: true });
    const atCap = Array.from({ length: MAX_SETS_PER_REQUEST }, (_, i) => set(i));
    expect(updateSetsSchema.safeParse({ sets: atCap }).success).toBe(true);
    expect(updateSetsSchema.safeParse({ sets: [...atCap, set(0)] }).success).toBe(false);
  });
});

describe('chunkSetWrites', () => {
  it('keeps a queue within the cap as one request', () => {
    expect(chunkSetWrites([1, 2, 3])).toEqual([[1, 2, 3]]);
    expect(chunkSetWrites(Array.from({ length: MAX_SETS_PER_REQUEST }))).toHaveLength(1);
  });

  it('splits a bigger queue without losing or repeating anything', () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkSetWrites(items);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunks.flat()).toEqual(items);
  });

  it('returns nothing for an empty queue', () => {
    expect(chunkSetWrites([])).toEqual([]);
  });
});

describe('isSetWriteRejection', () => {
  it('treats a 4xx as final', () => {
    expect(isSetWriteRejection(new ApiError(400, 'Workout is already completed'))).toBe(true);
    expect(isSetWriteRejection(new ApiError(404, 'Workout not found'))).toBe(true);
  });

  it('treats timeouts, rate limits, 5xx and network errors as retryable', () => {
    expect(isSetWriteRejection(new ApiError(408, 'Timeout'))).toBe(false);
    expect(isSetWriteRejection(new ApiError(429, 'Slow down'))).toBe(false);
    expect(isSetWriteRejection(new ApiError(503, 'Unavailable'))).toBe(false);
    expect(isSetWriteRejection(new TypeError('Network request failed'))).toBe(false);
  });
});

describe('flushSetWrites', () => {
  it('saves a small queue in one request and empties it', async () => {
    const pending = queueOf(3);
    const send = vi.fn().mockResolvedValue({ success: true });
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 0, failed: false });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(3);
    expect(pending.size).toBe(0);
  });

  it('never sends more than the cap in one request', async () => {
    const pending = queueOf(230);
    const send = vi.fn().mockResolvedValue({ success: true });
    await flushSetWrites(pending, send);
    expect(send.mock.calls.map(([sets]) => sets.length)).toEqual([100, 100, 30]);
    expect(pending.size).toBe(0);
  });

  it('reports refused sets, drops them, and does not retry them', async () => {
    const pending = queueOf(4);
    const send = vi.fn().mockRejectedValue(new ApiError(400, 'Workout is already completed'));
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 4, failed: false });
    expect(pending.size).toBe(0);
  });

  it('still saves the other requests when one is refused', async () => {
    const pending = queueOf(150);
    const send = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(400, 'Invalid set'))
      .mockResolvedValueOnce({ success: true });
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 100, failed: false });
    expect(send).toHaveBeenCalledTimes(2);
    expect(pending.size).toBe(0);
  });

  it('keeps everything unconfirmed queued on a network failure', async () => {
    const pending = queueOf(150);
    const send = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 0, failed: true });
    expect(pending.size).toBe(50);
  });

  it('stops at the first network failure instead of hammering a dead connection', async () => {
    const pending = queueOf(250);
    const send = vi.fn().mockRejectedValue(new ApiError(502, 'Bad gateway'));
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 0, failed: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(pending.size).toBe(250);
  });

  it('keeps a write that was queued while its request was in flight', async () => {
    const pending = queueOf(2);
    const newer: SetWrite = { workoutExerciseId: 'ex-0', setNumber: 1, completed: false };
    const send = vi.fn().mockImplementation(async () => {
      pending.set('ex-0:1', newer);
    });
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 0, failed: false });
    expect(Array.from(pending.values())).toEqual([newer]);
  });

  it('does not count a superseded write as refused: it gets its own answer next flush', async () => {
    const pending = queueOf(2);
    const newer: SetWrite = { workoutExerciseId: 'ex-0', setNumber: 1, completed: false };
    const send = vi.fn().mockImplementation(async () => {
      pending.set('ex-0:1', newer);
      throw new ApiError(400, 'Invalid set');
    });
    expect(await flushSetWrites(pending, send)).toEqual({ rejected: 1, failed: false });
    expect(Array.from(pending.values())).toEqual([newer]);
  });
});

describe('setsNotSavedMessage', () => {
  it('says how many sets were lost and what to do', () => {
    expect(setsNotSavedMessage(1)).toBe(
      "1 set wasn't saved, so it has been unchecked. Check your workout and log it again."
    );
    expect(setsNotSavedMessage(3)).toBe(
      "3 sets weren't saved, so they have been unchecked. Check your workout and log them again."
    );
  });
});
