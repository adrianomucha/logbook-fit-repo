import { describe, it, expect, beforeEach, vi } from "vitest";

const { userFindFirst, createMany, entryFindUnique, sendWaitlistWelcome, waitlistLimiter, waitlistResendLimiter } =
  vi.hoisted(() => ({
    userFindFirst: vi.fn(),
    createMany: vi.fn(),
    entryFindUnique: vi.fn(),
    sendWaitlistWelcome: vi.fn(),
    waitlistLimiter: vi.fn(),
    waitlistResendLimiter: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findFirst: userFindFirst },
    waitlistEntry: { createMany, findUnique: entryFindUnique },
  },
}));
vi.mock("@/lib/services/email", () => ({ sendWaitlistWelcome }));
vi.mock("@/lib/rate-limit", () => ({
  waitlistLimiter,
  waitlistResendLimiter,
  getClientIp: () => "1.2.3.4",
}));

import { POST as joinWaitlist } from "../waitlist/route";

const signup = (email = "coach@example.com") =>
  joinWaitlist(
    new Request("http://x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  waitlistLimiter.mockResolvedValue({ allowed: true });
  waitlistResendLimiter.mockResolvedValue({ allowed: true });
  userFindFirst.mockResolvedValue(null);
  sendWaitlistWelcome.mockResolvedValue(true);
});

describe("POST /api/waitlist", () => {
  it("sends the confirmation on a first signup", async () => {
    createMany.mockResolvedValue({ count: 1 });
    const res = await signup();
    expect(res.status).toBe(201);
    expect(sendWaitlistWelcome).toHaveBeenCalledWith("coach@example.com");
    expect(waitlistResendLimiter).not.toHaveBeenCalled();
  });

  it("re-sends the confirmation on a repeat signup that is still waiting", async () => {
    createMany.mockResolvedValue({ count: 0 });
    entryFindUnique.mockResolvedValue({ status: "PENDING" });
    const res = await signup();
    expect(res.status).toBe(201);
    expect(waitlistResendLimiter).toHaveBeenCalledWith("coach@example.com");
    expect(sendWaitlistWelcome).toHaveBeenCalledTimes(1);
  });

  it("re-sends at most once a day per address, and answers the same", async () => {
    createMany.mockResolvedValue({ count: 0 });
    entryFindUnique.mockResolvedValue({ status: "PENDING" });
    waitlistResendLimiter.mockResolvedValue({ allowed: false });
    const res = await signup();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendWaitlistWelcome).not.toHaveBeenCalled();
  });

  it("does not send the waiting-list email to someone already invited", async () => {
    createMany.mockResolvedValue({ count: 0 });
    entryFindUnique.mockResolvedValue({ status: "INVITED" });
    const res = await signup();
    expect(res.status).toBe(201);
    expect(sendWaitlistWelcome).not.toHaveBeenCalled();
    expect(waitlistResendLimiter).not.toHaveBeenCalled();
  });
});
