import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({
  checkIn: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  coachClientRelationship: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

const push = vi.hoisted(() => ({ notifyCheckInSent: vi.fn() }));
vi.mock("@/lib/push", () => push);

import {
  ensureScheduledCheckIn,
  runScheduledCheckIns,
} from "../checkin-schedule";

/** What checkIn.create resolves to, including the relations the notify needs. */
function createdCheckIn(id: string) {
  return {
    id,
    client: { userId: "client-user-1" },
    coach: { user: { name: "Coach Casey" } },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * DAY_MS;
// A Friday — getUTCDay() === 5
const NOW = new Date("2026-08-07T09:00:00Z").getTime();
const FRIDAY = 5;
const MONDAY = 1;

const activeRelationship = {
  coachId: "coach-1",
  clientId: "client-1",
  status: "ACTIVE",
  checkInScheduleEnabled: true,
  checkInIntervalDays: 7,
  checkInDayOfWeek: null as number | null,
};

describe("ensureScheduledCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    db.checkIn.updateMany.mockResolvedValue({ count: 0 });
    db.checkIn.findFirst.mockResolvedValue(null);
    db.checkIn.create.mockResolvedValue(createdCheckIn("checkin-new"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates the first check-in when the client has never had one", async () => {
    const created = await ensureScheduledCheckIn(activeRelationship);

    expect(created).toMatchObject({ id: "checkin-new" });
    expect(db.checkIn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { coachId: "coach-1", clientId: "client-1" },
      })
    );
    // The client is told, otherwise an auto-sent check-in waits unseen.
    expect(push.notifyCheckInSent).toHaveBeenCalledWith({
      clientUserId: "client-user-1",
      coachName: "Coach Casey",
    });
  });

  it("does nothing for an inactive relationship, not even expiry", async () => {
    const created = await ensureScheduledCheckIn({
      ...activeRelationship,
      status: "INACTIVE",
    });

    expect(created).toBeNull();
    expect(db.checkIn.updateMany).not.toHaveBeenCalled();
    expect(db.checkIn.create).not.toHaveBeenCalled();
  });

  it("expires abandoned check-ins even when the schedule is off", async () => {
    const created = await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInScheduleEnabled: false,
    });

    // A manually sent check-in the client ignored must stop pinning the
    // workspace to "waiting" whether or not the weekly schedule is on.
    expect(created).toBeNull();
    expect(db.checkIn.updateMany).toHaveBeenCalledTimes(1);
    expect(db.checkIn.create).not.toHaveBeenCalled();
  });

  it("never stacks onto a check-in that is still open", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "PENDING",
      createdAt: new Date(NOW - 30 * 24 * 60 * 60 * 1000),
    });

    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
    expect(db.checkIn.create).not.toHaveBeenCalled();
  });

  it("waits for a client response before scheduling the next one", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "CLIENT_RESPONDED",
      createdAt: new Date(NOW - 30 * 24 * 60 * 60 * 1000),
    });

    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
  });

  it("holds off until a full cadence has passed since the last one", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - SEVEN_DAYS_MS + 60_000),
    });

    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
  });

  it("sends again once the cadence has elapsed", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - SEVEN_DAYS_MS - 60_000),
    });

    expect(await ensureScheduledCheckIn(activeRelationship)).toMatchObject({
      id: "checkin-new",
    });
  });

  it("defaults to weekly when the cadence fields are absent", async () => {
    const { checkInIntervalDays, checkInDayOfWeek, ...legacy } =
      activeRelationship;
    void checkInIntervalDays;
    void checkInDayOfWeek;
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - SEVEN_DAYS_MS - 60_000),
    });

    expect(await ensureScheduledCheckIn(legacy)).toMatchObject({
      id: "checkin-new",
    });
  });

  it("respects a longer cadence", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 8 * DAY_MS),
    });

    // 8 days since the last one: due weekly, not due every 2 weeks
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInIntervalDays: 14,
      })
    ).toBeNull();

    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 14 * DAY_MS - 60_000),
    });
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInIntervalDays: 14,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("only sends on the anchor weekday when one is set", async () => {
    // Due for over a week, but today (Friday) is not the anchor day
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 10 * DAY_MS),
    });

    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: MONDAY,
      })
    ).toBeNull();
    expect(db.checkIn.create).not.toHaveBeenCalled();

    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: FRIDAY,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("waits for the anchor weekday before the very first check-in", async () => {
    db.checkIn.findFirst.mockResolvedValue(null);

    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: MONDAY,
      })
    ).toBeNull();
  });

  it("gives anchored cadences a one-day grace so sweep-hour jitter can't skip a week", async () => {
    // Last check-in went out later in the day than today's sweep runs: only
    // 6 days 21 hours have elapsed. Without the grace, "every Friday" would
    // silently become "every other Friday".
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - SEVEN_DAYS_MS + 3 * 60 * 60 * 1000),
    });

    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: FRIDAY,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("ignores the anchor weekday for cadences shorter than a week", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 4 * DAY_MS),
    });

    // Today is Friday, anchor says Monday — a 3-day cadence sends anyway
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInIntervalDays: 3,
        checkInDayOfWeek: MONDAY,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("scales the stale-pending window with the cadence, floored at two weeks", async () => {
    await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInIntervalDays: 28,
    });
    expect(db.checkIn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: new Date(NOW - 56 * DAY_MS) },
        }),
      })
    );

    await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInIntervalDays: 3,
    });
    expect(db.checkIn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: new Date(NOW - 14 * DAY_MS) },
        }),
      })
    );
  });
});

describe("runScheduledCheckIns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    db.checkIn.updateMany.mockResolvedValue({ count: 0 });
    db.checkIn.findFirst.mockResolvedValue(null);
    db.checkIn.create.mockResolvedValue(createdCheckIn("checkin-new"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sweeps only active relationships and counts what it sent", async () => {
    db.coachClientRelationship.findMany.mockResolvedValue([
      activeRelationship,
      { ...activeRelationship, clientId: "client-2" },
    ]);

    const result = await runScheduledCheckIns();

    expect(db.coachClientRelationship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } })
    );
    expect(result).toEqual({
      relationshipsScanned: 2,
      checkInsCreated: 2,
      failures: 0,
    });
  });

  it("counts a relationship with nothing due as scanned but not created", async () => {
    db.coachClientRelationship.findMany.mockResolvedValue([
      { ...activeRelationship, checkInScheduleEnabled: false },
    ]);

    expect(await runScheduledCheckIns()).toEqual({
      relationshipsScanned: 1,
      checkInsCreated: 0,
      failures: 0,
    });
  });

  it("keeps sweeping after one client fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.coachClientRelationship.findMany.mockResolvedValue([
      activeRelationship,
      { ...activeRelationship, clientId: "client-2" },
      { ...activeRelationship, clientId: "client-3" },
    ]);
    db.checkIn.create
      .mockResolvedValueOnce(createdCheckIn("checkin-1"))
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(createdCheckIn("checkin-3"));

    // One client's failure must not silently truncate everyone behind them.
    expect(await runScheduledCheckIns()).toEqual({
      relationshipsScanned: 3,
      checkInsCreated: 2,
      failures: 1,
    });
  });

  it("handles an empty roster without touching the check-in table", async () => {
    db.coachClientRelationship.findMany.mockResolvedValue([]);

    expect(await runScheduledCheckIns()).toEqual({
      relationshipsScanned: 0,
      checkInsCreated: 0,
      failures: 0,
    });
    expect(db.checkIn.create).not.toHaveBeenCalled();
  });
});
