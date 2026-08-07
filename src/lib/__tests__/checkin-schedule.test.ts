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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-07T09:00:00Z").getTime();

const activeRelationship = {
  coachId: "coach-1",
  clientId: "client-1",
  status: "ACTIVE",
  checkInScheduleEnabled: true,
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
