import { describe, it, expect, vi, beforeEach } from "vitest";

// Transaction client mock, hoisted so the prisma mock factory can close over it
const tx = vi.hoisted(() => ({
  clientInvite: { findUnique: vi.fn(), updateMany: vi.fn() },
  coachClientRelationship: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  checkIn: { updateMany: vi.fn() },
  message: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

import { Prisma } from "@prisma/client";
import { acceptInviteForClient, InviteAcceptError } from "../invite-acceptance";

const params = { token: "tok-1", clientProfileId: "client-1", clientUserId: "user-c1" };

const pendingInvite = {
  id: "inv-1",
  coachId: "coach-new",
  status: "PENDING",
  note: null as string | null,
  expiresAt: new Date(Date.now() + 86_400_000),
  coach: { userId: "user-coach-new" },
};

async function rejection(): Promise<InviteAcceptError> {
  try {
    await acceptInviteForClient(params);
  } catch (e) {
    return e as InviteAcceptError;
  }
  throw new Error("expected a rejection");
}

describe("acceptInviteForClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.clientInvite.findUnique.mockResolvedValue(pendingInvite);
    tx.clientInvite.updateMany.mockResolvedValue({ count: 1 });
    tx.coachClientRelationship.findUnique.mockResolvedValue(null);
    tx.coachClientRelationship.updateMany.mockResolvedValue({ count: 1 });
    tx.coachClientRelationship.create.mockResolvedValue({});
  });

  it("refuses a missing, used or expired invite", async () => {
    for (const invite of [
      null,
      { ...pendingInvite, status: "ACCEPTED" },
      { ...pendingInvite, expiresAt: new Date(Date.now() - 1000) },
    ]) {
      tx.clientInvite.findUnique.mockResolvedValueOnce(invite);
      const err = await rejection();
      expect(err).toBeInstanceOf(InviteAcceptError);
      expect(err.code).toBe("invite_invalid");
    }
    expect(tx.clientInvite.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a client who already has an active coach, naming which case", async () => {
    tx.coachClientRelationship.findUnique.mockResolvedValue({
      id: "rel-1",
      coachId: "coach-new",
      status: "ACTIVE",
    });
    const same = await rejection();
    expect(same.code).toBe("already_connected");
    expect(same.status).toBe(409);
    expect(same.message).toMatch(/already training with this coach/);

    tx.coachClientRelationship.findUnique.mockResolvedValue({
      id: "rel-1",
      coachId: "coach-old",
      status: "ACTIVE",
    });
    const other = await rejection();
    expect(other.message).toMatch(/Leave them in Settings/);
    expect(tx.clientInvite.updateMany).not.toHaveBeenCalled();
  });

  it("refuses when a concurrent accept spent the invite first", async () => {
    tx.clientInvite.updateMany.mockResolvedValue({ count: 0 });
    const err = await rejection();
    expect(err.code).toBe("invite_invalid");
    expect(tx.coachClientRelationship.create).not.toHaveBeenCalled();
    expect(tx.coachClientRelationship.updateMany).not.toHaveBeenCalled();
  });

  it("creates an active relationship for a client who never had a coach", async () => {
    const result = await acceptInviteForClient(params);

    expect(tx.clientInvite.updateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    expect(tx.coachClientRelationship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        coachId: "coach-new",
        clientId: "client-1",
        status: "ACTIVE",
        checkInScheduleEnabled: true,
      }),
    });
    expect(result).toEqual({ coachUserId: "user-coach-new" });
  });

  it("reactivates an ended relationship with the same coach, clearing the audit trail", async () => {
    tx.coachClientRelationship.findUnique.mockResolvedValue({
      id: "rel-1",
      coachId: "coach-new",
      status: "INACTIVE",
    });

    await acceptInviteForClient(params);

    const { where, data } = tx.coachClientRelationship.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: "rel-1", status: { not: "ACTIVE" } });
    expect(data).toMatchObject({
      coachId: "coach-new",
      status: "ACTIVE",
      endedAt: null,
      endedBy: null,
      endedPlanId: null,
      endedPlanStartDate: null,
      checkInScheduleEnabled: true,
    });
    expect(data.createdAt).toBeInstanceOf(Date);
    // Same coach keeps their cadence; nothing of theirs is closed out
    expect(data).not.toHaveProperty("checkInIntervalDays");
    expect(tx.checkIn.updateMany).not.toHaveBeenCalled();
  });

  it("moves an ended relationship to a new coach and closes the old coach's open check-ins", async () => {
    tx.coachClientRelationship.findUnique.mockResolvedValue({
      id: "rel-1",
      coachId: "coach-old",
      status: "INACTIVE",
    });

    await acceptInviteForClient(params);

    expect(tx.coachClientRelationship.updateMany).toHaveBeenCalledWith({
      where: { id: "rel-1", status: { not: "ACTIVE" } },
      data: expect.objectContaining({
        coachId: "coach-new",
        status: "ACTIVE",
        checkInIntervalDays: 7,
        checkInDayOfWeek: null,
      }),
    });
    expect(tx.checkIn.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: "client-1",
        coachId: "coach-old",
        status: { in: ["PENDING", "CLIENT_RESPONDED"] },
      },
      data: { status: "EXPIRED" },
    });
  });

  it("loses cleanly when a concurrent accept activated the ended relationship first", async () => {
    tx.coachClientRelationship.findUnique.mockResolvedValue({
      id: "rel-1",
      coachId: "coach-old",
      status: "INACTIVE",
    });
    tx.coachClientRelationship.updateMany.mockResolvedValue({ count: 0 });

    const err = await rejection();
    expect(err.code).toBe("already_connected");
    // Thrown inside the transaction, so the invite redemption rolls back too
    expect(tx.checkIn.updateMany).not.toHaveBeenCalled();
    expect(tx.message.create).not.toHaveBeenCalled();
  });

  it("loses cleanly when a concurrent accept created the first relationship first", async () => {
    tx.coachClientRelationship.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    const err = await rejection();
    expect(err).toBeInstanceOf(InviteAcceptError);
    expect(err.code).toBe("already_connected");
  });

  it("delivers the coach's note as their first message", async () => {
    tx.clientInvite.findUnique.mockResolvedValue({ ...pendingInvite, note: "Welcome back!" });

    await acceptInviteForClient(params);

    expect(tx.message.create).toHaveBeenCalledWith({
      data: { senderId: "user-coach-new", recipientId: "user-c1", content: "Welcome back!" },
    });
  });

  it("sends no message when the invite has no note", async () => {
    await acceptInviteForClient(params);
    expect(tx.message.create).not.toHaveBeenCalled();
  });
});
