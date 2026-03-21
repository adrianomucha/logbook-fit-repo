import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const limiter = rateLimit("test-allow", {
      windowMs: 60_000,
      maxRequests: 3,
    });

    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = rateLimit("test-block", {
      windowMs: 60_000,
      maxRequests: 2,
    });

    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(false);
  });

  it("tracks remaining count correctly", () => {
    const limiter = rateLimit("test-remaining", {
      windowMs: 60_000,
      maxRequests: 3,
    });

    expect(limiter("user1").remaining).toBe(2);
    expect(limiter("user1").remaining).toBe(1);
    expect(limiter("user1").remaining).toBe(0);
    // Exceeding: remaining stays at 0
    expect(limiter("user1").remaining).toBe(0);
  });

  it("isolates different keys", () => {
    const limiter = rateLimit("test-isolate", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(false);
    // Different key — gets its own bucket
    expect(limiter("user2").allowed).toBe(true);
  });

  it("resets after the window expires", () => {
    const limiter = rateLimit("test-reset", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect(limiter("user1").allowed).toBe(true);
    expect(limiter("user1").allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    expect(limiter("user1").allowed).toBe(true);
  });

  it("returns correct resetAt timestamp", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const limiter = rateLimit("test-resetAt", {
      windowMs: 60_000,
      maxRequests: 5,
    });

    const result = limiter("user1");
    expect(result.resetAt).toBe(Date.now() + 60_000);
  });

  it("handles high volume without error", () => {
    const limiter = rateLimit("test-volume", {
      windowMs: 1_000,
      maxRequests: 100,
    });

    let blockedCount = 0;
    for (let i = 0; i < 200; i++) {
      if (!limiter("user1").allowed) blockedCount++;
    }

    expect(blockedCount).toBe(100);
  });

  it("isolates different limiter instances by name", () => {
    const limiterA = rateLimit("test-name-a", {
      windowMs: 60_000,
      maxRequests: 1,
    });
    const limiterB = rateLimit("test-name-b", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect(limiterA("user1").allowed).toBe(true);
    expect(limiterA("user1").allowed).toBe(false);
    // Different limiter name — independent store
    expect(limiterB("user1").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns single IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no header present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
