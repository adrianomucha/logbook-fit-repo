import { describe, it, expect } from "vitest";
import { cronHealth, overallLevel, CRON_STALE_AFTER_MS } from "@/lib/health";

const NOW = new Date("2026-09-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

function run(overrides: Partial<Parameters<typeof cronHealth>[0] & object> = {}) {
  return {
    startedAt: hoursAgo(3),
    finishedAt: hoursAgo(3),
    ok: true,
    error: null,
    ...overrides,
  };
}

describe("cronHealth", () => {
  it("warns, not fails, when nothing has been recorded yet", () => {
    expect(cronHealth(null, NOW).level).toBe("warn");
    expect(cronHealth(undefined, NOW).level).toBe("warn");
  });

  it("is ok after a recent clean run", () => {
    const result = cronHealth(run(), NOW);
    expect(result.level).toBe("ok");
    expect(result.detail).toMatch(/3h ago/);
  });

  it("is down once the last run is older than the staleness window", () => {
    const stale = new Date(NOW.getTime() - CRON_STALE_AFTER_MS - 60_000);
    const result = cronHealth(run({ startedAt: stale, finishedAt: stale }), NOW);
    expect(result.level).toBe("down");
    expect(result.detail).toMatch(/missed at least one night/);
  });

  it("staleness wins over a clean outcome", () => {
    const stale = hoursAgo(48);
    expect(cronHealth(run({ startedAt: stale, finishedAt: stale, ok: true }), NOW).level).toBe(
      "down"
    );
  });

  it("treats a run started moments ago with no finish as in progress", () => {
    const result = cronHealth(
      run({ startedAt: hoursAgo(0.05), finishedAt: null, ok: null }),
      NOW
    );
    expect(result.level).toBe("ok");
    expect(result.detail).toMatch(/in progress/);
  });

  it("warns about a run that started long ago and never finished", () => {
    const result = cronHealth(
      run({ startedAt: hoursAgo(5), finishedAt: null, ok: null }),
      NOW
    );
    expect(result.level).toBe("warn");
    expect(result.detail).toMatch(/never finished/);
  });

  it("surfaces the error of a crashed run", () => {
    const result = cronHealth(run({ ok: false, error: "connection refused" }), NOW);
    expect(result.level).toBe("warn");
    expect(result.detail).toContain("connection refused");
  });

  it("warns when a run finished but some clients failed", () => {
    const result = cronHealth(run({ ok: false }), NOW);
    expect(result.level).toBe("warn");
    expect(result.detail).toMatch(/failures for at least one client/);
  });
});

describe("overallLevel", () => {
  const check = (level: "ok" | "warn" | "down") => ({
    id: level,
    label: level,
    level,
    detail: "",
  });

  it("is ok only when every check is ok", () => {
    expect(overallLevel([check("ok"), check("ok")])).toBe("ok");
  });

  it("is down when any check is down, regardless of order", () => {
    expect(overallLevel([check("ok"), check("warn"), check("down")])).toBe("down");
    expect(overallLevel([check("down"), check("ok")])).toBe("down");
  });

  it("is warn when the worst check is a warning", () => {
    expect(overallLevel([check("ok"), check("warn")])).toBe("warn");
  });

  it("is ok for an empty list", () => {
    expect(overallLevel([])).toBe("ok");
  });
});
