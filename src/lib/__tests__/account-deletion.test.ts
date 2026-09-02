import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  clientInvite: { updateMany: vi.fn() },
  pushSubscription: { deleteMany: vi.fn() },
  // Used by endCoachClientRelationshipIn
  coachClientRelationship: { update: vi.fn() },
  clientProfile: { update: vi.fn(), findUnique: vi.fn() },
  checkIn: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    // deleteAccount reads avatarUrl outside the transaction (for the
    // post-commit storage cleanup); undefined here means "no photo"
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

import {
  AccountNotFoundError,
  DELETED_NAME,
  deleteAccount,
  deletedEmailFor,
} from "../account-deletion";

const rel = (n: number) => ({ id: `rel-${n}`, coachId: "coach-1", clientId: `client-${n}` });

beforeEach(() => {
  vi.clearAllMocks();
  tx.clientProfile.findUnique.mockResolvedValue({ activePlanId: null, planStartDate: null });
  tx.coachClientRelationship.update.mockResolvedValue({});
  tx.clientInvite.updateMany.mockResolvedValue({ count: 0 });
  tx.user.updateMany.mockResolvedValue({ count: 0 });
});

describe("deleteAccount", () => {
  it("retires a client: ends their coaching relationship as the client", async () => {
    tx.user.findFirst.mockResolvedValue({
      id: "u-client",
      role: "CLIENT",
      linkedUserId: null,
      coachProfile: null,
      clientProfile: {
        id: "client-1",
        coachRelationship: { ...rel(1), status: "ACTIVE" },
      },
    });

    const summary = await deleteAccount("u-client");

    expect(summary).toEqual({ role: "CLIENT", relationshipsEnded: 1, invitesRevoked: 0 });
    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rel-1" },
        data: expect.objectContaining({ status: "INACTIVE", endedBy: "CLIENT" }),
      })
    );
    expect(tx.clientInvite.updateMany).not.toHaveBeenCalled();
  });

  it("leaves an already-ended relationship alone", async () => {
    tx.user.findFirst.mockResolvedValue({
      id: "u-client",
      role: "CLIENT",
      linkedUserId: null,
      coachProfile: null,
      clientProfile: { id: "client-1", coachRelationship: { ...rel(1), status: "INACTIVE" } },
    });

    const summary = await deleteAccount("u-client");
    expect(summary.relationshipsEnded).toBe(0);
    expect(tx.coachClientRelationship.update).not.toHaveBeenCalled();
  });

  it("retires a coach: ends every active client and revokes open invites", async () => {
    tx.user.findFirst.mockResolvedValue({
      id: "u-coach",
      role: "COACH",
      linkedUserId: null,
      coachProfile: { id: "coach-1", clients: [rel(1), rel(2)] },
      clientProfile: null,
    });
    tx.clientInvite.updateMany.mockResolvedValue({ count: 3 });

    const summary = await deleteAccount("u-coach");

    expect(summary).toEqual({ role: "COACH", relationshipsEnded: 2, invitesRevoked: 3 });
    expect(tx.coachClientRelationship.update).toHaveBeenCalledTimes(2);
    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ endedBy: "COACH" }) })
    );
    // Each client loses the plan (plans belong to the coach)
    expect(tx.clientProfile.update).toHaveBeenCalledTimes(2);
    expect(tx.clientInvite.updateMany).toHaveBeenCalledWith({
      where: { coachId: "coach-1", status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  });

  it("scrubs the row, drops devices, and unlinks the paired account", async () => {
    tx.user.findFirst.mockResolvedValue({
      id: "u-1",
      role: "CLIENT",
      linkedUserId: "u-2",
      coachProfile: null,
      clientProfile: { id: "client-1", coachRelationship: null },
    });

    await deleteAccount("u-1");

    expect(tx.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-1" } });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u-2", linkedUserId: "u-1" },
      data: { linkedUserId: null },
    });
    const update = tx.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "u-1" });
    expect(update.data).toMatchObject({
      deletedAt: expect.any(Date),
      name: DELETED_NAME,
      email: deletedEmailFor("u-1"),
      avatarUrl: null,
      linkedUserId: null,
    });
    // Never a bcrypt hash again
    expect(update.data.passwordHash).toMatch(/^deleted:[0-9a-f]{64}$/);
  });

  it("refuses an account that is already gone", async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(deleteAccount("nope")).rejects.toBeInstanceOf(AccountNotFoundError);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
