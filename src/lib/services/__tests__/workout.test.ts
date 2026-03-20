import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock prisma before importing the service
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

// Now we can import the service module — the singleton won't try to connect
// We test calculateStreak directly since it's a pure function on the class
import { workoutService } from "../workout";

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
