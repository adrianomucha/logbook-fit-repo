import { describe, it, expect, beforeEach, vi } from "vitest";

const { inviteFindUnique, userFindFirst, tx, signupLimiter } = vi.hoisted(() => ({
  inviteFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  signupLimiter: vi.fn(),
  tx: {
    user: { create: vi.fn() },
    clientInvite: { updateMany: vi.fn() },
    coachClientRelationship: { create: vi.fn() },
    message: { create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    clientInvite: { findUnique: inviteFindUnique },
    user: { findFirst: userFindFirst },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));
vi.mock("@/lib/rate-limit", () => ({ signupLimiter, getClientIp: () => "1.2.3.4" }));
vi.mock("@/lib/push", () => ({ notifyClientJoined: vi.fn() }));

import { POST as signup } from "../auth/signup/route";

const request = () =>
  new Request("http://x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "new-client@example.com",
      password: "a-long-password-123",
      name: "New Client",
      inviteToken: "tok",
    }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  signupLimiter.mockResolvedValue({ allowed: true });
  inviteFindUnique.mockResolvedValue({
    id: "inv1",
    coachId: "coach-a",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 86_400_000),
    email: null,
    note: null,
    coach: { userId: "u-coach" },
  });
  userFindFirst.mockResolvedValue(null);
  tx.user.create.mockResolvedValue({
    id: "u-new",
    email: "new-client@example.com",
    name: "New Client",
    role: "CLIENT",
    createdAt: new Date(),
    clientProfile: { id: "client-new" },
  });
});

describe("POST /api/auth/signup with a client invite", () => {
  it("rolls back a signup that loses the race for the invite", async () => {
    // Another signup redeemed the invite between validation and commit
    tx.clientInvite.updateMany.mockResolvedValue({ count: 0 });
    const res = await signup(request());
    expect(res.status).toBe(400);
    expect(tx.clientInvite.updateMany).toHaveBeenCalledWith({
      where: { id: "inv1", status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    expect(tx.coachClientRelationship.create).not.toHaveBeenCalled();
  });

  it("attaches the client when the invite is still pending", async () => {
    tx.clientInvite.updateMany.mockResolvedValue({ count: 1 });
    const res = await signup(request());
    expect(res.status).toBeLessThan(300);
    expect(tx.coachClientRelationship.create).toHaveBeenCalledTimes(1);
  });
});
