import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp, getClientIpFromHeaders } from "../rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", async () => {
    const limiter = rateLimit("test-allow", {
      windowMs: 60_000,
      maxRequests: 3,
    });

    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", async () => {
    const limiter = rateLimit("test-block", {
      windowMs: 60_000,
      maxRequests: 2,
    });

    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(false);
  });

  it("tracks remaining count correctly", async () => {
    const limiter = rateLimit("test-remaining", {
      windowMs: 60_000,
      maxRequests: 3,
    });

    expect((await limiter("user1")).remaining).toBe(2);
    expect((await limiter("user1")).remaining).toBe(1);
    expect((await limiter("user1")).remaining).toBe(0);
    // Exceeding: remaining stays at 0
    expect((await limiter("user1")).remaining).toBe(0);
  });

  it("isolates different keys", async () => {
    const limiter = rateLimit("test-isolate", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(false);
    // Different key — gets its own bucket
    expect((await limiter("user2")).allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const limiter = rateLimit("test-reset", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect((await limiter("user1")).allowed).toBe(true);
    expect((await limiter("user1")).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    expect((await limiter("user1")).allowed).toBe(true);
  });

  it("returns correct resetAt timestamp", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const limiter = rateLimit("test-resetAt", {
      windowMs: 60_000,
      maxRequests: 5,
    });

    const result = (await limiter("user1"));
    expect(result.resetAt).toBe(Date.now() + 60_000);
  });

  it("handles high volume without error", async () => {
    const limiter = rateLimit("test-volume", {
      windowMs: 1_000,
      maxRequests: 100,
    });

    let blockedCount = 0;
    for (let i = 0; i < 200; i++) {
      if (!(await limiter("user1")).allowed) blockedCount++;
    }

    expect(blockedCount).toBe(100);
  });

  it("isolates different limiter instances by name", async () => {
    const limiterA = rateLimit("test-name-a", {
      windowMs: 60_000,
      maxRequests: 1,
    });
    const limiterB = rateLimit("test-name-b", {
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect((await limiterA("user1")).allowed).toBe(true);
    expect((await limiterA("user1")).allowed).toBe(false);
    // Different limiter name — independent store
    expect((await limiterB("user1")).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses the LAST x-forwarded-for entry (the proxy-appended real client)", () => {
    // A client sends "1.2.3.4" hoping to spoof; the trusted proxy appends the
    // real IP. We must read 5.6.7.8, not the forgeable leading value.
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns single IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("prefers x-vercel-forwarded-for over a spoofed x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-vercel-forwarded-for": "9.9.9.9",
      },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("prefers x-real-ip over a spoofed x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "8.8.8.8",
      },
    });
    expect(getClientIp(req)).toBe("8.8.8.8");
  });

  it("returns 'unknown' when no header present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("getClientIpFromHeaders", () => {
  it("resolves the trusted platform header from a plain record", () => {
    expect(
      getClientIpFromHeaders({
        "x-forwarded-for": "1.2.3.4",
        "x-vercel-forwarded-for": "9.9.9.9",
      })
    ).toBe("9.9.9.9");
  });

  it("falls back to the last x-forwarded-for entry", () => {
    expect(
      getClientIpFromHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })
    ).toBe("5.6.7.8");
  });

  it("returns 'unknown' for missing/undefined headers", () => {
    expect(getClientIpFromHeaders(undefined)).toBe("unknown");
    expect(getClientIpFromHeaders({})).toBe("unknown");
  });
});
