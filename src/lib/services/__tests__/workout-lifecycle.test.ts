import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({
  clientProfile: { findUnique: vi.fn() },
  day: { findUnique: vi.fn() },
  workoutCompletion: { findFirst: vi.fn(), update: vi.fn() },
  workoutExercise: { findMany: vi.fn() },
  setCompletion: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn((args: unknown) => args),
  },
  $transaction: vi.fn(async (ops: unknown) => ops),
}));
vi.mock("@/lib/prisma", () => ({ default: db }));

import { InvalidStateError, ValidationError, workoutService } from "../workout";

const client = { role: "client" as const, clientProfileId: "client-1" };
const NOW = new Date("2026-10-22T18:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("start", () => {
  it("refuses a day the coach hasn't put any exercises in", async () => {
    db.clientProfile.findUnique.mockResolvedValue({ activePlanId: "plan-1" });
    db.day.findUnique.mockResolvedValue({ week: { planId: "plan-1" }, exercises: [] });

    await expect(workoutService.start(client, { dayId: "day-1" })).rejects.toBeInstanceOf(ValidationError);
    expect(db.workoutCompletion.findFirst).not.toHaveBeenCalled();
  });
});

describe("finish", () => {
  const openSession = {
    id: "wc-1",
    clientId: "client-1",
    status: "IN_PROGRESS",
    startedAt: new Date(NOW.getTime() - 45 * 60 * 1000),
    day: { exercises: [{ id: "we-1", sets: 3 }, { id: "we-2", sets: 3 }] },
  };

  beforeEach(() => {
    db.workoutCompletion.findFirst.mockResolvedValue(openSession);
    db.setCompletion.aggregate.mockResolvedValue({ _min: { completedAt: null }, _max: { completedAt: null } });
    db.workoutCompletion.update.mockImplementation(async (args: unknown) => args);
  });

  it("won't count a session with nothing logged as a workout", async () => {
    db.setCompletion.groupBy.mockResolvedValue([]);

    await expect(workoutService.finish(client, { completionId: "wc-1" })).rejects.toBeInstanceOf(InvalidStateError);
    expect(db.workoutCompletion.update).not.toHaveBeenCalled();
  });

  it("still finishes a partial session", async () => {
    db.setCompletion.groupBy.mockResolvedValue([{ workoutExerciseId: "we-1", _count: { _all: 3 } }]);

    await workoutService.finish(client, { completionId: "wc-1" });
    expect(db.workoutCompletion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", completionPct: 50, exercisesDone: 1 }),
      })
    );
  });
});

describe("updateSets", () => {
  const TICKED = new Date("2026-10-22T17:20:00Z");

  beforeEach(() => {
    db.workoutCompletion.findFirst.mockResolvedValue({ id: "wc-1", clientId: "client-1", status: "IN_PROGRESS", dayId: "day-1" });
    db.workoutExercise.findMany.mockResolvedValue([{ id: "we-1" }]);
    db.setCompletion.findMany.mockResolvedValue([
      { workoutExerciseId: "we-1", setNumber: 1, completedAt: TICKED },
      { workoutExerciseId: "we-1", setNumber: 2, completedAt: null },
    ]);
  });

  it("keeps the time a set was first ticked when its weight is edited later", async () => {
    await workoutService.updateSets(client, {
      completionId: "wc-1",
      sets: [
        { workoutExerciseId: "we-1", setNumber: 1, completed: true, actualWeight: 225 }, // edit after ticking
        { workoutExerciseId: "we-1", setNumber: 2, completed: true }, // ticked just now
        { workoutExerciseId: "we-1", setNumber: 3, completed: false },
      ],
    });

    const completedAt = db.setCompletion.upsert.mock.calls.map(
      ([args]) => (args as { update: { completedAt: Date | null } }).update.completedAt
    );
    expect(completedAt).toEqual([TICKED, NOW, null]);
  });
});
