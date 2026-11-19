import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    waitlistEntry: { findMany: m.findMany, updateMany: m.updateMany, count: m.count },
  },
}));
vi.mock("@/lib/services/email", () => ({ sendSetupCallNudge: m.send }));

import { runSetupCallNudges, sendBacklogNudgeBatch } from "@/lib/setup-call-nudge";

const noPause = async () => {};

const NOW = new Date("2026-11-19T17:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "adrian-logbook.fit/setup-call");
  m.updateMany.mockResolvedValue({ count: 1 });
  m.send.mockResolvedValue(true);
});

afterEach(() => vi.unstubAllEnvs());

describe("runSetupCallNudges", () => {
  it("sends nothing while the setup call isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "");
    expect(await runSetupCallNudges(NOW, noPause)).toMatchObject({ sent: 0, skipped: "no-link" });
    expect(m.findMany).not.toHaveBeenCalled();
  });

  it("only looks at waiting coaches who never booked, joined 3 to 14 days ago", async () => {
    m.findMany.mockResolvedValue([]);
    await runSetupCallNudges(NOW, noPause);

    const { where } = m.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ status: "PENDING", callStatus: null, callNudgedAt: null });
    expect(where.OR).toEqual([
      { clientCount: null },
      { clientCount: { not: "not-coaching" } },
    ]);
    expect(where.createdAt.lte).toEqual(new Date(NOW.getTime() - 3 * DAY));
    expect(where.createdAt.gte).toEqual(new Date(NOW.getTime() - 14 * DAY));
  });

  it("claims each entry before sending, with the coach's email on the booking link", async () => {
    m.findMany.mockResolvedValue([{ id: "e1", email: "sam@example.com" }]);

    const result = await runSetupCallNudges(NOW, noPause);

    expect(result).toEqual({ candidates: 1, sent: 1, failures: 0, skipped: null });
    expect(m.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "e1", status: "PENDING", callNudgedAt: null }),
      data: { callNudgedAt: NOW },
    });
    expect(m.send).toHaveBeenCalledWith(
      "sam@example.com",
      "https://cal.com/adrian-logbook.fit/setup-call?email=sam%40example.com",
      "recent"
    );
  });

  it("skips an entry that booked or was claimed since the read", async () => {
    m.findMany.mockResolvedValue([{ id: "e1", email: "sam@example.com" }]);
    m.updateMany.mockResolvedValue({ count: 0 });

    expect(await runSetupCallNudges(NOW, noPause)).toMatchObject({ sent: 0, failures: 0 });
    expect(m.send).not.toHaveBeenCalled();
  });

  it("releases the claim when the email doesn't send, so tomorrow retries", async () => {
    m.findMany.mockResolvedValue([{ id: "e1", email: "sam@example.com" }]);
    m.send.mockResolvedValue(false);

    expect(await runSetupCallNudges(NOW, noPause)).toMatchObject({ sent: 0, failures: 1 });
    expect(m.updateMany).toHaveBeenLastCalledWith({
      where: { id: "e1", callNudgedAt: NOW },
      data: { callNudgedAt: null },
    });
  });
});

describe("sendBacklogNudgeBatch", () => {
  it("reaches only people who joined before the daily window, with the backlog wording", async () => {
    m.findMany.mockResolvedValue([{ id: "e1", email: "old@example.com" }]);
    m.count.mockResolvedValue(7);

    const result = await sendBacklogNudgeBatch(NOW, noPause);

    expect(result).toEqual({ candidates: 1, sent: 1, failures: 0, remaining: 7 });
    const { where, take } = m.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ status: "PENDING", callStatus: null, callNudgedAt: null });
    expect(where.createdAt).toEqual({ lt: new Date(NOW.getTime() - 14 * DAY) });
    expect(take).toBe(40);
    expect(m.send).toHaveBeenCalledWith(
      "old@example.com",
      "https://cal.com/adrian-logbook.fit/setup-call?email=old%40example.com",
      "backlog"
    );
    // The count of who's left uses the same filter
    expect(m.count).toHaveBeenCalledWith({ where });
  });

  it("paces sends to stay under the mailer's rate limit", async () => {
    m.findMany.mockResolvedValue([
      { id: "e1", email: "a@example.com" },
      { id: "e2", email: "b@example.com" },
      { id: "e3", email: "c@example.com" },
    ]);
    m.count.mockResolvedValue(0);
    const pause = vi.fn(async () => {});

    await sendBacklogNudgeBatch(NOW, pause);

    expect(m.send).toHaveBeenCalledTimes(3);
    expect(pause).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledWith(600);
  });

  it("refuses to run without a booking link", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "");
    await expect(sendBacklogNudgeBatch(NOW, noPause)).rejects.toThrow();
    expect(m.findMany).not.toHaveBeenCalled();
  });
});
