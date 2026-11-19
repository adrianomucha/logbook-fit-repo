import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({ getSession: vi.fn(), findUnique: vi.fn(), coachProfile: vi.fn() }));

vi.mock("@/lib/session", () => ({ getSession: m.getSession }));
vi.mock("@/lib/prisma", () => ({
  default: {
    waitlistEntry: { findUnique: m.findUnique },
    coachProfile: { findUnique: m.coachProfile, findFirst: m.coachProfile },
  },
}));

import { GET } from "../coach/setup-call/route";

const call = () => GET(new Request("http://x/api/coach/setup-call"), { params: Promise.resolve({}) });

beforeEach(() => {
  vi.clearAllMocks();
  m.coachProfile.mockResolvedValue({ id: "cp1" });
});

describe("GET /api/coach/setup-call", () => {
  it("refuses anyone who isn't a coach", async () => {
    m.getSession.mockResolvedValue({ user: { id: "u1", role: "CLIENT", email: "c@example.com" } });
    expect((await call()).status).toBe(403);
    expect(m.findUnique).not.toHaveBeenCalled();
  });

  it("returns the coach's booked call, looked up by email", async () => {
    m.getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "Coach@Example.com" } });
    m.findUnique.mockResolvedValue({
      callStatus: "BOOKED",
      callStartsAt: new Date("2026-11-25T18:00:00Z"),
    });

    const res = await call();
    expect(await res.json()).toEqual({
      call: { status: "BOOKED", startsAt: "2026-11-25T18:00:00.000Z" },
    });
    expect(m.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "coach@example.com" } })
    );
  });

  it("returns no call for a coach who never booked", async () => {
    m.getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "coach@example.com" } });
    m.findUnique.mockResolvedValue(null);
    expect(await (await call()).json()).toEqual({ call: null });
  });
});
