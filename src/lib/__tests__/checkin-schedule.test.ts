import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  checkIn: {
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  coachClientRelationship: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  clientProfile: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

const push = vi.hoisted(() => ({ notifyCheckInSent: vi.fn() }));
vi.mock("@/lib/push", () => push);

import {
  ensureScheduledCheckIn,
  runScheduledCheckIns,
  unsendCheckIn,
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
// A plan that's been running well past any cadence
const LONG_RUNNING_PLAN_START = new Date(NOW - 60 * DAY_MS);

function clientProfile(planStartDate: Date | null, timezone = "UTC") {
  return { planStartDate, user: { timezone } };
}

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
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(LONG_RUNNING_PLAN_START)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates the first check-in once the plan has run a full cadence", async () => {
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

  it("evaluates the anchor weekday in the client's timezone", async () => {
    // 09:00 UTC Friday is 23:00 Thursday in Honolulu (UTC-10, no DST)
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(LONG_RUNNING_PLAN_START, "Pacific/Honolulu")
    );
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 10 * DAY_MS),
    });

    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: FRIDAY,
      })
    ).toBeNull();

    const THURSDAY = 4;
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: THURSDAY,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("falls back to UTC when the client's timezone is missing or invalid", async () => {
    db.checkIn.findFirst.mockResolvedValue({
      status: "COMPLETED",
      createdAt: new Date(NOW - 10 * DAY_MS),
    });

    db.clientProfile.findUnique.mockResolvedValue(null);
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: FRIDAY,
      })
    ).toMatchObject({ id: "checkin-new" });

    db.checkIn.create.mockClear();
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(LONG_RUNNING_PLAN_START, "Not/AZone")
    );
    expect(
      await ensureScheduledCheckIn({
        ...activeRelationship,
        checkInDayOfWeek: FRIDAY,
      })
    ).toMatchObject({ id: "checkin-new" });
  });

  it("reads the client profile once for both plan start and timezone", async () => {
    await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInDayOfWeek: FRIDAY,
    });
    expect(db.clientProfile.findUnique).toHaveBeenCalledTimes(1);
  });

  describe("first check-in after a plan starts", () => {
    it("does not send one the moment a plan is assigned", async () => {
      // The reported bug: a brand-new client got "Waiting · Sent 4 seconds
      // ago" right after the coach assigned their first plan.
      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - 4_000))
      );

      expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
      expect(db.checkIn.create).not.toHaveBeenCalled();
      expect(push.notifyCheckInSent).not.toHaveBeenCalled();
    });

    it("waits a full cadence after the plan start", async () => {
      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - SEVEN_DAYS_MS + 60_000))
      );
      expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();

      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - SEVEN_DAYS_MS - 60_000))
      );
      expect(await ensureScheduledCheckIn(activeRelationship)).toMatchObject({
        id: "checkin-new",
      });
    });

    it("uses the relationship's cadence, not a fixed week", async () => {
      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - 10 * DAY_MS))
      );
      expect(
        await ensureScheduledCheckIn({
          ...activeRelationship,
          checkInIntervalDays: 14,
        })
      ).toBeNull();

      expect(
        await ensureScheduledCheckIn({
          ...activeRelationship,
          checkInIntervalDays: 3,
        })
      ).toMatchObject({ id: "checkin-new" });
    });

    it("sends nothing to a client with no plan and no past check-ins", async () => {
      db.clientProfile.findUnique.mockResolvedValue(clientProfile(null));

      expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
      expect(db.checkIn.create).not.toHaveBeenCalled();
    });

    it("counts from a new plan that started after the last check-in", async () => {
      // Last check-in is well past due, but the coach just switched plans —
      // give the client a cadence on the new plan before asking about it.
      db.checkIn.findFirst.mockResolvedValue({
        status: "COMPLETED",
        createdAt: new Date(NOW - 20 * DAY_MS),
      });
      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - 2 * DAY_MS))
      );
      expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();

      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - SEVEN_DAYS_MS - 60_000))
      );
      expect(await ensureScheduledCheckIn(activeRelationship)).toMatchObject({
        id: "checkin-new",
      });
    });

    it("keeps counting from the last check-in when the plan started earlier", async () => {
      db.checkIn.findFirst.mockResolvedValue({
        status: "COMPLETED",
        createdAt: new Date(NOW - 3 * DAY_MS),
      });

      expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
    });

    it("gives an anchored first check-in the same one-day grace", async () => {
      // Plan assigned last Friday afternoon; today's Friday sweep runs in the
      // morning, 6 days 21 hours later. The anchor day must not be skipped.
      db.clientProfile.findUnique.mockResolvedValue(
        clientProfile(new Date(NOW - SEVEN_DAYS_MS + 3 * 60 * 60 * 1000))
      );

      expect(
        await ensureScheduledCheckIn({
          ...activeRelationship,
          checkInDayOfWeek: FRIDAY,
        })
      ).toMatchObject({ id: "checkin-new" });
    });
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

  it("gives anchored cadences a one-day grace on expiry too", async () => {
    await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInDayOfWeek: MONDAY,
    });
    expect(db.checkIn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: new Date(NOW - 13 * DAY_MS) },
        }),
      })
    );

    // Too short a cadence to be anchored: no grace
    await ensureScheduledCheckIn({
      ...activeRelationship,
      checkInIntervalDays: 3,
      checkInDayOfWeek: MONDAY,
    });
    expect(db.checkIn.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: new Date(NOW - 14 * DAY_MS) },
        }),
      })
    );
  });

  it("treats a check-in another request just created as nothing to do", async () => {
    db.checkIn.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
    // The request that won the race sent the push
    expect(push.notifyCheckInSent).not.toHaveBeenCalled();
  });

  it("still surfaces any other failure to create", async () => {
    db.checkIn.create.mockRejectedValue(new Error("db down"));

    await expect(ensureScheduledCheckIn(activeRelationship)).rejects.toThrow(
      "db down"
    );
  });
});

describe("unsendCheckIn", () => {
  const pending = { id: "checkin-pending", clientId: "client-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    db.coachClientRelationship.findUnique.mockResolvedValue(activeRelationship);
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(LONG_RUNNING_PLAN_START)
    );
    db.checkIn.updateMany.mockResolvedValue({ count: 1 });
    db.checkIn.deleteMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("finds nothing to unsend once the check-in is answered or gone", async () => {
    db.checkIn.findFirst.mockResolvedValueOnce(null);

    expect(await unsendCheckIn("coach-1", "checkin-pending")).toBeNull();
    expect(db.checkIn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "checkin-pending", coachId: "coach-1", status: "PENDING" },
      })
    );
    expect(db.checkIn.updateMany).not.toHaveBeenCalled();
    expect(db.checkIn.deleteMany).not.toHaveBeenCalled();
  });

  it("skips the check-in the schedule was owed instead of deleting it", async () => {
    // Without it, the last check-in is two weeks old: the schedule is due
    db.checkIn.findFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({
        status: "COMPLETED",
        createdAt: new Date(NOW - 14 * DAY_MS),
      });

    expect(await unsendCheckIn("coach-1", "checkin-pending")).toBe("skipped");
    expect(db.checkIn.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "checkin-pending" } }),
      })
    );
    expect(db.checkIn.updateMany).toHaveBeenCalledWith({
      where: { id: "checkin-pending", status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    expect(db.checkIn.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes an extra check-in sent ahead of schedule", async () => {
    db.checkIn.findFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({
        status: "COMPLETED",
        createdAt: new Date(NOW - 3 * DAY_MS),
      });

    expect(await unsendCheckIn("coach-1", "checkin-pending")).toBe("deleted");
    expect(db.checkIn.deleteMany).toHaveBeenCalledWith({
      where: { id: "checkin-pending", status: "PENDING" },
    });
    expect(db.checkIn.updateMany).not.toHaveBeenCalled();
  });

  it("deletes outright when the schedule is off", async () => {
    db.coachClientRelationship.findUnique.mockResolvedValue({
      ...activeRelationship,
      checkInScheduleEnabled: false,
    });
    db.checkIn.findFirst.mockResolvedValueOnce(pending);

    expect(await unsendCheckIn("coach-1", "checkin-pending")).toBe("deleted");
    expect(db.checkIn.updateMany).not.toHaveBeenCalled();
  });

  it("reports nothing unsent when the client answered in the meantime", async () => {
    db.checkIn.findFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(null);
    db.checkIn.updateMany.mockResolvedValue({ count: 0 });

    expect(await unsendCheckIn("coach-1", "checkin-pending")).toBeNull();
  });
});

/**
 * Week-by-week runs of the real scheduler against an in-memory check-in
 * table, for the behaviors that only show up across several calls.
 */
describe("check-in schedule over time", () => {
  type Row = { id: string; coachId: string; clientId: string; status: string; createdAt: Date };
  let rows: Row[];

  // Monday 09:00 UTC, the hour the nightly sweep runs
  const MONDAY_9AM = new Date("2026-08-03T09:00:00Z").getTime();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    rows = [];
    let next = 0;
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(new Date(MONDAY_9AM - 60 * DAY_MS))
    );
    db.coachClientRelationship.findUnique.mockImplementation(async () => activeRelationship);
    db.checkIn.findFirst.mockImplementation(async ({ where }) => {
      const match = rows
        .filter(
          (r) =>
            (where.coachId === undefined || r.coachId === where.coachId) &&
            (where.clientId === undefined || r.clientId === where.clientId) &&
            (typeof where.id !== "string" || r.id === where.id) &&
            (where.id?.not === undefined || r.id !== where.id.not) &&
            (where.status === undefined || r.status === where.status)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return match[0] ?? null;
    });
    db.checkIn.updateMany.mockImplementation(async ({ where, data }) => {
      const hit = rows.filter(
        (r) =>
          (where.clientId === undefined || r.clientId === where.clientId) &&
          (where.id === undefined || r.id === where.id) &&
          r.status === where.status &&
          (where.createdAt === undefined || r.createdAt < where.createdAt.lt)
      );
      hit.forEach((r) => (r.status = data.status));
      return { count: hit.length };
    });
    db.checkIn.deleteMany.mockImplementation(async ({ where }) => {
      const before = rows.length;
      rows = rows.filter((r) => !(r.id === where.id && r.status === where.status));
      return { count: before - rows.length };
    });
    db.checkIn.create.mockImplementation(async ({ data }) => {
      const row = { id: `checkin-${++next}`, status: "PENDING", createdAt: new Date(), ...data };
      rows.push(row);
      return { ...row, ...createdCheckIn(row.id) };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-asks a client who never answers every two weeks on an anchored cadence", async () => {
    const anchored = { ...activeRelationship, checkInDayOfWeek: MONDAY };
    const sentOnDays: number[] = [];

    for (let day = 0; day < 10 * 7; day++) {
      // The sweep never starts at exactly the same second two nights running
      vi.setSystemTime(MONDAY_9AM + day * DAY_MS - ((day * 7919) % 30) * 1000);
      if (await ensureScheduledCheckIn(anchored)) sentOnDays.push(day);
    }

    expect(sentOnDays).toEqual([0, 14, 28, 42, 56]);
  });

  it("re-asks on the anchor day when the last one went out late in the day", async () => {
    const anchored = { ...activeRelationship, checkInDayOfWeek: MONDAY };
    // The coach opened the workspace Monday evening and it went out then
    vi.setSystemTime(MONDAY_9AM + 9 * 60 * 60 * 1000);
    expect(await ensureScheduledCheckIn(anchored)).not.toBeNull();

    // Two weeks on, the morning sweep is 13 days 15 hours later
    vi.setSystemTime(MONDAY_9AM + 14 * DAY_MS);
    expect(await ensureScheduledCheckIn(anchored)).not.toBeNull();
  });

  it("replaces an ignored manual check-in on the anchor day inside its last day", async () => {
    const anchored = { ...activeRelationship, checkInDayOfWeek: MONDAY };
    // Coach sends one by hand on a Tuesday morning, before the 09:00 sweep
    const tuesday8am = MONDAY_9AM + DAY_MS - 60 * 60 * 1000;
    rows.push({
      id: "manual",
      coachId: "coach-1",
      clientId: "client-1",
      status: "PENDING",
      createdAt: new Date(tuesday8am),
    });

    // 13 days 1 hour later is an anchor day: it expires a little early and
    // that day's scheduled check-in takes its place
    vi.setSystemTime(MONDAY_9AM + 14 * DAY_MS);
    expect(await ensureScheduledCheckIn(anchored)).not.toBeNull();
    expect(rows.find((r) => r.id === "manual")?.status).toBe("EXPIRED");
  });

  it("doesn't send an unsent scheduled check-in straight back", async () => {
    vi.setSystemTime(MONDAY_9AM);
    const sent = await ensureScheduledCheckIn(activeRelationship);
    expect(sent).not.toBeNull();

    // Coach unsends it; the workspace reloads a moment later
    vi.setSystemTime(MONDAY_9AM + 60_000);
    expect(await unsendCheckIn("coach-1", sent!.id)).toBe("skipped");
    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
    expect(push.notifyCheckInSent).toHaveBeenCalledTimes(1);

    // This cycle is skipped, not the schedule: the next one is a week on
    vi.setSystemTime(MONDAY_9AM + 6 * DAY_MS);
    expect(await ensureScheduledCheckIn(activeRelationship)).toBeNull();
    vi.setSystemTime(MONDAY_9AM + 7 * DAY_MS);
    expect(await ensureScheduledCheckIn(activeRelationship)).not.toBeNull();
  });

  it("leaves the cadence untouched when an early extra check-in is undone", async () => {
    vi.setSystemTime(MONDAY_9AM);
    await ensureScheduledCheckIn(activeRelationship);
    rows[0].status = "COMPLETED";

    // Coach sends one by hand on Thursday, then hits Undo
    vi.setSystemTime(MONDAY_9AM + 3 * DAY_MS);
    rows.push({
      id: "manual",
      coachId: "coach-1",
      clientId: "client-1",
      status: "PENDING",
      createdAt: new Date(),
    });
    expect(await unsendCheckIn("coach-1", "manual")).toBe("deleted");
    expect(rows.map((r) => r.id)).toEqual(["checkin-1"]);

    // The scheduled one still goes out on the original day
    vi.setSystemTime(MONDAY_9AM + 7 * DAY_MS);
    expect(await ensureScheduledCheckIn(activeRelationship)).not.toBeNull();
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
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(LONG_RUNNING_PLAN_START)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not send to a client whose plan was just assigned", async () => {
    db.coachClientRelationship.findMany.mockResolvedValue([activeRelationship]);
    db.clientProfile.findUnique.mockResolvedValue(
      clientProfile(new Date(NOW - 60 * 60 * 1000))
    );

    expect(await runScheduledCheckIns()).toEqual({
      relationshipsScanned: 1,
      checkInsCreated: 0,
      failures: 0,
    });
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
