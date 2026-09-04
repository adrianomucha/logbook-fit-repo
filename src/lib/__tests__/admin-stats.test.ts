import { describe, it, expect } from "vitest";
import { bucketByWeek, startOfUtcWeek } from "@/lib/admin-stats";

// A Friday, so the current week has a few days in it already.
const NOW = new Date("2026-09-04T15:30:00Z");

describe("startOfUtcWeek", () => {
  it("returns the Monday 00:00 UTC of the week containing the date", () => {
    expect(startOfUtcWeek(NOW).toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("maps a Sunday to the preceding Monday, not the following one", () => {
    expect(startOfUtcWeek(new Date("2026-09-06T23:59:59Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z"
    );
  });

  it("is idempotent on a Monday midnight", () => {
    const monday = new Date("2026-08-31T00:00:00Z");
    expect(startOfUtcWeek(monday).getTime()).toBe(monday.getTime());
  });
});

describe("bucketByWeek", () => {
  it("returns exactly `weeks` buckets, oldest first, ending with the current week", () => {
    const buckets = bucketByWeek([], 8, NOW);
    expect(buckets).toHaveLength(8);
    expect(buckets[7].weekStart.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(buckets[0].weekStart.toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("counts dates into the right week", () => {
    const buckets = bucketByWeek(
      [
        new Date("2026-09-01T10:00:00Z"), // this week
        new Date("2026-09-03T10:00:00Z"), // this week
        new Date("2026-08-30T10:00:00Z"), // last week (Sunday)
        new Date("2026-07-13T00:00:00Z"), // first bucket, on the boundary
      ],
      8,
      NOW
    );
    expect(buckets[7].count).toBe(2);
    expect(buckets[6].count).toBe(1);
    expect(buckets[0].count).toBe(1);
  });

  it("ignores dates outside the window, on both ends", () => {
    const buckets = bucketByWeek(
      [
        new Date("2026-07-12T23:59:59Z"), // one second before the first bucket
        new Date("2026-09-05T00:00:00Z"), // in the future
      ],
      8,
      NOW
    );
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it("keeps empty weeks so a dead stretch stays visible", () => {
    const buckets = bucketByWeek([new Date("2026-08-01T00:00:00Z")], 8, NOW);
    expect(buckets.filter((b) => b.count === 0)).toHaveLength(7);
  });
});
