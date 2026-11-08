import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  workoutCompletion: { findMany: vi.fn(), updateMany: vi.fn() },
  setCompletion: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));

const service = vi.hoisted(() => ({ autoFinish: vi.fn() }));
vi.mock("@/lib/services/workout", () => ({ workoutService: service }));

const push = vi.hoisted(() => ({
  notifyWorkoutIdle: vi.fn(),
  notifyWorkoutAutoFinished: vi.fn(),
  workoutUrl: (weekId: string, dayId: string) => `/client/workout/${weekId}/${dayId}`,
}));
vi.mock("@/lib/push", () => push);

import {
  AUTO_FINISH_AFTER_MS,
  IDLE_NUDGE_AFTER_MS,
  idleWorkoutDecision,
  isQuietHours,
  runIdleWorkoutSweep,
} from "../idle-workouts";

const MIN = 60_000;
const HOUR = 60 * MIN;
// 14:00 in UTC, so not quiet hours for a UTC client
const NOW = new Date("2026-11-08T14:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function session(overrides: Partial<Parameters<typeof idleWorkoutDecision>[0]> = {}) {
  return {
    lastActivityAt: ago(IDLE_NUDGE_AFTER_MS),
    setsLogged: 4,
    nudgedAt: null,
    timeZone: "UTC",
    ...overrides,
  };
}

describe("isQuietHours", () => {
  it("is quiet from 22:00 to 08:00 in the client's own timezone", () => {
    // 14:00Z is 09:00 in New York (EST) and 23:00 in Tokyo
    expect(isQuietHours(NOW, "America/New_York")).toBe(false);
    expect(isQuietHours(NOW, "Asia/Tokyo")).toBe(true);
    expect(isQuietHours(new Date("2026-11-08T07:59:00Z"), "UTC")).toBe(true);
    expect(isQuietHours(new Date("2026-11-08T08:00:00Z"), "UTC")).toBe(false);
  });

  it("falls back to UTC for a missing or broken timezone", () => {
    expect(isQuietHours(new Date("2026-11-08T23:00:00Z"), null)).toBe(true);
    expect(isQuietHours(NOW, "Not/AZone")).toBe(false);
  });
});

describe("idleWorkoutDecision", () => {
  it("leaves a session alone while the client is plausibly still training", () => {
    expect(idleWorkoutDecision(session({ lastActivityAt: ago(IDLE_NUDGE_AFTER_MS - MIN) }), NOW)).toEqual({ action: "none" });
  });

  it("nudges once nothing has changed for the idle window", () => {
    expect(idleWorkoutDecision(session(), NOW)).toEqual({ action: "nudge" });
  });

  it("nudges only once per session", () => {
    expect(idleWorkoutDecision(session({ nudgedAt: ago(10 * MIN) }), NOW)).toEqual({ action: "none" });
  });

  it("holds the nudge during the client's night", () => {
    expect(idleWorkoutDecision(session({ timeZone: "Asia/Tokyo" }), NOW)).toEqual({ action: "none" });
  });

  it("never touches a session with nothing logged", () => {
    expect(idleWorkoutDecision(session({ setsLogged: 0, lastActivityAt: ago(30 * 24 * HOUR) }), NOW)).toEqual({ action: "none" });
  });

  it("finishes a session left open overnight and says so", () => {
    expect(idleWorkoutDecision(session({ lastActivityAt: ago(AUTO_FINISH_AFTER_MS) }), NOW)).toEqual({
      action: "auto-finish",
      announce: true,
    });
  });

  it("finishes at night too, but quietly", () => {
    expect(
      idleWorkoutDecision(session({ lastActivityAt: ago(AUTO_FINISH_AFTER_MS), timeZone: "Asia/Tokyo" }), NOW)
    ).toEqual({ action: "auto-finish", announce: false });
  });

  it("closes long-forgotten sessions without a notice", () => {
    expect(idleWorkoutDecision(session({ lastActivityAt: ago(40 * 24 * HOUR) }), NOW)).toEqual({
      action: "auto-finish",
      announce: false,
    });
  });
});

describe("runIdleWorkoutSweep", () => {
  const row = (id: string, startedAt: Date, idleReminderSentAt: Date | null = null) => ({
    id,
    dayId: `day-${id}`,
    startedAt,
    idleReminderSentAt,
    day: { name: "Day 2: Lower Body", weekId: "week-1" },
    client: { user: { id: `user-${id}`, timezone: "UTC" } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    db.workoutCompletion.updateMany.mockResolvedValue({ count: 1 });
    service.autoFinish.mockResolvedValue(true);
  });

  it("measures idle from the last set change, not from Start", async () => {
    // Started three hours ago but a set changed 20 minutes ago: still training
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(3 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(20 * MIN) }, _count: { _all: 6 } },
      { workoutCompletionId: "a", completed: false, _max: { updatedAt: ago(3 * HOUR) }, _count: { _all: 6 } },
    ]);

    const result = await runIdleWorkoutSweep(NOW);
    expect(result).toEqual({ sessionsScanned: 1, nudged: 0, autoFinished: 0, failures: 0 });
    expect(push.notifyWorkoutIdle).not.toHaveBeenCalled();
  });

  it("claims the nudge before sending it, and links to the session", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(3 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(2 * HOUR) }, _count: { _all: 3 } },
    ]);

    const result = await runIdleWorkoutSweep(NOW);
    expect(db.workoutCompletion.updateMany).toHaveBeenCalledWith({
      where: { id: "a", status: "IN_PROGRESS", idleReminderSentAt: null },
      data: { idleReminderSentAt: NOW },
    });
    expect(push.notifyWorkoutIdle).toHaveBeenCalledWith({
      clientUserId: "user-a",
      completionId: "a",
      dayName: "Day 2: Lower Body",
      url: "/client/workout/week-1/day-a",
    });
    expect(result.nudged).toBe(1);
  });

  it("doesn't send a nudge another run already claimed", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(3 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(2 * HOUR) }, _count: { _all: 3 } },
    ]);
    db.workoutCompletion.updateMany.mockResolvedValue({ count: 0 });

    const result = await runIdleWorkoutSweep(NOW);
    expect(push.notifyWorkoutIdle).not.toHaveBeenCalled();
    expect(result.nudged).toBe(0);
  });

  it("auto-finishes and announces a session left open overnight", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(16 * HOUR), ago(13 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(15 * HOUR) }, _count: { _all: 3 } },
    ]);

    const result = await runIdleWorkoutSweep(NOW);
    expect(service.autoFinish).toHaveBeenCalledWith("a", NOW);
    expect(push.notifyWorkoutAutoFinished).toHaveBeenCalledTimes(1);
    expect(result.autoFinished).toBe(1);
  });

  it("says nothing when the session turned out to be closed already", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(16 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(15 * HOUR) }, _count: { _all: 3 } },
    ]);
    service.autoFinish.mockResolvedValue(false);

    const result = await runIdleWorkoutSweep(NOW);
    expect(push.notifyWorkoutAutoFinished).not.toHaveBeenCalled();
    expect(result.autoFinished).toBe(0);
  });

  it("keeps going past a session that fails", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([row("a", ago(16 * HOUR)), row("b", ago(16 * HOUR))]);
    db.setCompletion.groupBy.mockResolvedValue([
      { workoutCompletionId: "a", completed: true, _max: { updatedAt: ago(15 * HOUR) }, _count: { _all: 3 } },
      { workoutCompletionId: "b", completed: true, _max: { updatedAt: ago(15 * HOUR) }, _count: { _all: 3 } },
    ]);
    service.autoFinish.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(true);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runIdleWorkoutSweep(NOW);
    expect(result).toEqual({ sessionsScanned: 2, nudged: 0, autoFinished: 1, failures: 1 });
  });

  it("only scans sessions old enough to have gone idle", async () => {
    db.workoutCompletion.findMany.mockResolvedValue([]);

    await runIdleWorkoutSweep(NOW);
    expect(db.workoutCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "IN_PROGRESS", startedAt: { lte: ago(IDLE_NUDGE_AFTER_MS) } },
      })
    );
    expect(db.setCompletion.groupBy).not.toHaveBeenCalled();
  });
});
