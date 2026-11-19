import crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const db = vi.hoisted(() => ({
  entryFindUnique: vi.fn(),
  entryUpsert: vi.fn(),
  entryUpdate: vi.fn(),
  entryUpdateMany: vi.fn(),
  userFindFirst: vi.fn(),
  sendWaitlistInvite: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    waitlistEntry: {
      findUnique: db.entryFindUnique,
      upsert: db.entryUpsert,
      update: db.entryUpdate,
      updateMany: db.entryUpdateMany,
    },
    user: { findFirst: db.userFindFirst },
  },
}));
vi.mock("@/lib/services/email", () => ({ sendWaitlistInvite: db.sendWaitlistInvite }));

import { POST } from "../webhooks/cal/route";

const SECRET = "whsec_test";

function deliver(trigger: string, payload: Record<string, unknown> = {}, secret = SECRET) {
  const body = JSON.stringify({
    triggerEvent: trigger,
    payload: {
      uid: "bk_1",
      type: "setup-call",
      startTime: "2099-11-18T13:00:00Z",
      attendees: [{ email: "coach@example.com", timeZone: "Europe/Warsaw" }],
      ...payload,
    },
  });
  return POST(
    new Request("http://x/api/webhooks/cal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cal-signature-256": crypto.createHmac("sha256", secret).update(body).digest("hex"),
      },
      body,
    })
  );
}

/** The entry as each findUnique sees it: the booking lookup, then the invite's. */
function entryIs(entry: Record<string, unknown> | null) {
  db.entryFindUnique.mockImplementation(async ({ where }: { where: { id?: string } }) =>
    where.id
      ? {
          id: "e1",
          email: "coach@example.com",
          status: "PENDING",
          clientCount: null,
          callStatus: "BOOKED",
          callStartsAt: new Date("2099-11-18T13:00:00Z"),
          callTimeZone: "Europe/Warsaw",
          ...entry,
        }
      : entry
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CAL_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "adrian/setup-call");
  vi.stubEnv("NEXTAUTH_URL", "https://logbook.fit");
  db.entryUpdateMany.mockResolvedValue({ count: 1 });
  db.entryUpdate.mockResolvedValue({});
  db.sendWaitlistInvite.mockResolvedValue(true);
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/webhooks/cal", () => {
  it("rejects a delivery signed with the wrong secret", async () => {
    const res = await deliver("BOOKING_CREATED", {}, "wrong");
    expect(res.status).toBe(401);
    expect(db.entryUpdate).not.toHaveBeenCalled();
  });

  it("refuses everything while the secret is unset", async () => {
    vi.stubEnv("CAL_WEBHOOK_SECRET", "");
    const res = await deliver("BOOKING_CREATED");
    expect(res.status).toBe(503);
  });

  it("records the call and sends the invite to a coach still waiting", async () => {
    entryIs({ id: "e1", status: "PENDING", clientCount: "6-15" });

    const res = await deliver("BOOKING_CREATED");
    expect(await res.json()).toMatchObject({ outcome: "invited" });

    expect(db.entryUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({
        callStatus: "BOOKED",
        callStartsAt: new Date("2099-11-18T13:00:00Z"),
        callTimeZone: "Europe/Warsaw",
        callBookingUid: "bk_1",
      }),
      select: { id: true },
    });
    expect(db.entryUpdateMany).toHaveBeenCalledWith({
      where: { id: "e1", status: { not: "JOINED" } },
      data: expect.objectContaining({ status: "INVITED" }),
    });
    const [to, url, call] = db.sendWaitlistInvite.mock.calls[0];
    expect(to).toBe("coach@example.com");
    expect(url).toMatch(/^https:\/\/logbook\.fit\/signup\?beta=/);
    expect(call.booked.timeZone).toBe("Europe/Warsaw");
    expect(call.bookingUrl).toBeNull();
  });

  it("does not re-invite on a retried delivery or a reschedule", async () => {
    entryIs({ id: "e1", status: "INVITED", clientCount: "1-5" });

    await deliver("BOOKING_RESCHEDULED", { uid: "bk_2" });

    expect(db.entryUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ callBookingUid: "bk_2" }),
      select: { id: true },
    });
    expect(db.sendWaitlistInvite).not.toHaveBeenCalled();
  });

  it("records but does not invite someone who isn't coaching yet", async () => {
    entryIs({ id: "e1", status: "PENDING", clientCount: "not-coaching" });

    const res = await deliver("BOOKING_CREATED");
    expect(await res.json()).toMatchObject({ outcome: "recorded" });
    expect(db.entryUpdate).toHaveBeenCalled();
    expect(db.sendWaitlistInvite).not.toHaveBeenCalled();
  });

  it("adds someone who booked without joining the list, and invites them", async () => {
    entryIs(null);
    db.userFindFirst.mockResolvedValue(null);
    db.entryUpsert.mockResolvedValue({ id: "e9", status: "PENDING", clientCount: null });

    await deliver("BOOKING_CREATED");

    expect(db.entryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { email: "coach@example.com", source: "cal.com" } })
    );
    expect(db.sendWaitlistInvite).toHaveBeenCalledTimes(1);
  });

  it("ignores a booking from a client account", async () => {
    entryIs(null);
    db.userFindFirst.mockResolvedValue({ role: "CLIENT", createdAt: new Date() });

    const res = await deliver("BOOKING_CREATED");
    expect(await res.json()).toMatchObject({ outcome: "registered" });
    expect(db.entryUpsert).not.toHaveBeenCalled();
    expect(db.sendWaitlistInvite).not.toHaveBeenCalled();
  });

  it("records a call booked by a coach who already has an account, without an invite", async () => {
    entryIs(null);
    const signedUp = new Date("2026-11-10T09:00:00Z");
    db.userFindFirst.mockResolvedValue({ role: "COACH", createdAt: signedUp });
    db.entryUpsert.mockResolvedValue({ id: "e5", status: "JOINED", clientCount: null });

    const res = await deliver("BOOKING_CREATED");
    expect(await res.json()).toMatchObject({ outcome: "recorded" });
    expect(db.entryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          email: "coach@example.com",
          source: "cal.com",
          status: "JOINED",
          joinedAt: signedUp,
        },
      })
    );
    expect(db.entryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e5" } })
    );
    expect(db.sendWaitlistInvite).not.toHaveBeenCalled();
  });

  it("cancels by booking uid only", async () => {
    await deliver("BOOKING_CANCELLED", { uid: "bk_old" });
    expect(db.entryUpdateMany).toHaveBeenCalledWith({
      where: { callBookingUid: "bk_old" },
      data: { callStatus: "CANCELLED" },
    });
  });

  it("ignores bookings of other event types", async () => {
    const res = await deliver("BOOKING_CREATED", { type: "consulting-intro" });
    expect(await res.json()).toMatchObject({ ignored: true });
    expect(db.entryFindUnique).not.toHaveBeenCalled();
  });
});
