import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock prisma before importing the service
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

// Now we can import the service module — the singleton won't try to connect
// We test calculateStreak directly since it's a pure function on the class
import { workoutService, WorkoutServiceImpl } from "../workout";
import type { PrismaClient } from "@prisma/client";

describe("calculateStreak", () => {
  beforeEach(() => {
    // Fix "today" to 2025-03-15 for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty dates", () => {
    expect(workoutService.calculateStreak([])).toBe(0);
  });

  it("returns 1 for a workout today", () => {
    const dates = [new Date("2025-03-15T08:00:00Z")];
    expect(workoutService.calculateStreak(dates)).toBe(1);
  });

  it("returns streak of consecutive days ending today", () => {
    const dates = [
      new Date("2025-03-15T08:00:00Z"),
      new Date("2025-03-14T09:00:00Z"),
      new Date("2025-03-13T10:00:00Z"),
    ];
    expect(workoutService.calculateStreak(dates)).toBe(3);
  });

  it("returns streak of consecutive days ending yesterday (today skipped)", () => {
    const dates = [
      new Date("2025-03-14T08:00:00Z"),
      new Date("2025-03-13T09:00:00Z"),
      new Date("2025-03-12T10:00:00Z"),
    ];
    // Today (Mar 15) has no workout, but streak counts from yesterday
    expect(workoutService.calculateStreak(dates)).toBe(3);
  });

  it("breaks streak on a gap", () => {
    const dates = [
      new Date("2025-03-15T08:00:00Z"),
      new Date("2025-03-14T09:00:00Z"),
      // gap on Mar 13
      new Date("2025-03-12T10:00:00Z"),
      new Date("2025-03-11T10:00:00Z"),
    ];
    expect(workoutService.calculateStreak(dates)).toBe(2);
  });

  it("handles multiple workouts on the same day", () => {
    const dates = [
      new Date("2025-03-15T08:00:00Z"),
      new Date("2025-03-15T16:00:00Z"), // same day, different time
      new Date("2025-03-14T09:00:00Z"),
    ];
    expect(workoutService.calculateStreak(dates)).toBe(2);
  });

  it("returns 0 when last workout was 2+ days ago", () => {
    const dates = [
      new Date("2025-03-12T08:00:00Z"), // 3 days ago
    ];
    // Today (Mar 15) skipped, yesterday (Mar 14) skipped → streak broken
    expect(workoutService.calculateStreak(dates)).toBe(0);
  });

  it("handles a long streak", () => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date("2025-03-15T10:00:00Z");
      d.setDate(d.getDate() - i);
      return d;
    });
    expect(workoutService.calculateStreak(dates)).toBe(30);
  });
});

describe("finalizeStaleSessions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Two exercises, 2 sets each (4 sets total)
  const day = {
    exercises: [
      { id: "ex-1", sets: 2 },
      { id: "ex-2", sets: 2 },
    ],
  };

  function makeService(
    candidates: unknown[]
  ): { svc: WorkoutServiceImpl; db: Record<string, Record<string, ReturnType<typeof vi.fn>>> } {
    const db = {
      workoutCompletion: {
        findMany: vi.fn().mockResolvedValue(candidates),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    };
    return { svc: new WorkoutServiceImpl(db as unknown as PrismaClient), db };
  }

  function set(
    exerciseId: string,
    completed: boolean,
    completedAt: Date | null,
    updatedAt: Date
  ) {
    return { workoutExerciseId: exerciseId, completed, completedAt, updatedAt };
  }

  it("finalizes an idle partial session at its real percentage, backdated to the last set", async () => {
    const startedAt = new Date("2025-03-14T18:00:00Z"); // 18h ago
    const lastSetAt = new Date("2025-03-14T18:30:00Z");
    const { svc, db } = makeService([
      {
        id: "wc-1",
        startedAt,
        day,
        sets: [
          set("ex-1", true, new Date("2025-03-14T18:10:00Z"), new Date("2025-03-14T18:10:00Z")),
          set("ex-1", true, lastSetAt, lastSetAt),
          set("ex-2", false, null, startedAt),
          set("ex-2", false, null, startedAt),
        ],
      },
    ]);

    const count = await svc.finalizeStaleSessions("client-1");

    expect(count).toBe(1);
    expect(db.workoutCompletion.delete).not.toHaveBeenCalled();
    expect(db.workoutCompletion.update).toHaveBeenCalledWith({
      where: { id: "wc-1" },
      data: {
        status: "COMPLETED",
        completedAt: lastSetAt,
        completionPct: 50, // 2 of 4 sets
        exercisesDone: 1,
        exercisesTotal: 2,
        durationSec: 30 * 60, // start → last logged set
      },
    });
  });

  it("deletes an idle session with nothing logged instead of recording 0%", async () => {
    const startedAt = new Date("2025-03-14T18:00:00Z");
    const { svc, db } = makeService([
      {
        id: "wc-1",
        startedAt,
        day,
        sets: [
          set("ex-1", false, null, startedAt),
          set("ex-2", false, null, startedAt),
        ],
      },
    ]);

    const count = await svc.finalizeStaleSessions("client-1");

    expect(count).toBe(1);
    expect(db.workoutCompletion.delete).toHaveBeenCalledWith({
      where: { id: "wc-1" },
    });
    expect(db.workoutCompletion.update).not.toHaveBeenCalled();
  });

  it("leaves a session alone when a set was touched within the idle window", async () => {
    const startedAt = new Date("2025-03-14T18:00:00Z"); // old enough to be a candidate
    const { svc, db } = makeService([
      {
        id: "wc-1",
        startedAt,
        day,
        sets: [
          // Recent edit — the client is still (or again) working out
          set("ex-1", true, new Date("2025-03-15T11:00:00Z"), new Date("2025-03-15T11:00:00Z")),
          set("ex-2", false, null, startedAt),
        ],
      },
    ]);

    const count = await svc.finalizeStaleSessions("client-1");

    expect(count).toBe(0);
    expect(db.workoutCompletion.update).not.toHaveBeenCalled();
    expect(db.workoutCompletion.delete).not.toHaveBeenCalled();
  });

  it("only queries sessions started before the idle cutoff", async () => {
    const { svc, db } = makeService([]);

    await svc.finalizeStaleSessions("client-1");

    expect(db.workoutCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: "client-1",
          status: "IN_PROGRESS",
          startedAt: { lt: new Date("2025-03-15T00:00:00Z") }, // now − 12h
        },
      })
    );
  });
});
