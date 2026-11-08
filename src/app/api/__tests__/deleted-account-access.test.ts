import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { getSession, relFindFirst, restore, feedbackUpdate, userFindUnique } = vi.hoisted(() => ({
  getSession: vi.fn(),
  relFindFirst: vi.fn(),
  restore: vi.fn(),
  feedbackUpdate: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", () => ({
  getCoachProfileId: async () => "coach-a",
  getClientProfileId: async () => "client-1",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    coachClientRelationship: { findFirst: relFindFirst },
    feedback: { update: feedbackUpdate },
    user: { findUnique: userFindUnique },
  },
}));
vi.mock("@/lib/relationship-termination", () => ({
  restoreCoachClientRelationship: restore,
}));

import { POST as restoreClient } from "../coach/clients/[id]/restore/route";
import { PATCH as patchFeedback } from "../admin/feedback/[id]/route";
import { POST as switchAccount } from "../account/switch/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
let savedAdmins: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  savedAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com";
});

afterEach(() => {
  if (savedAdmins === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = savedAdmins;
});

describe("POST /api/coach/clients/[id]/restore", () => {
  it("only finds relationships whose client account still exists", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "a@example.com" } });
    relFindFirst.mockResolvedValue(null);
    const res = await restoreClient(new Request("http://x", { method: "POST" }), params("client-1"));
    expect(res.status).toBe(404);
    expect(relFindFirst).toHaveBeenCalledWith({
      where: {
        coachId: "coach-a",
        clientId: "client-1",
        client: { user: { deletedAt: null } },
      },
    });
    expect(restore).not.toHaveBeenCalled();
  });
});

// getSession() returns null for a deleted account's leftover session, which
// getServerSession() did not; these routes must go through it.
describe("routes that must refuse a deleted account's session", () => {
  it("admin feedback", async () => {
    getSession.mockResolvedValue(null);
    const req = new Request("http://x", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    const res = await patchFeedback(req, params("f1"));
    expect(res.status).toBe(401);
    expect(feedbackUpdate).not.toHaveBeenCalled();
  });

  it("account switch", async () => {
    getSession.mockResolvedValue(null);
    const res = await switchAccount();
    expect(res.status).toBe(401);
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});
