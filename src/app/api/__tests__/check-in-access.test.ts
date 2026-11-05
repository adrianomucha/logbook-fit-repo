import { describe, it, expect, beforeEach, vi } from "vitest";

const { getSession, checkInFindUnique, checkInFindFirst, checkInUpdate, relCount, notify } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    checkInFindUnique: vi.fn(),
    checkInFindFirst: vi.fn(),
    checkInUpdate: vi.fn(),
    relCount: vi.fn(),
    notify: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", () => ({
  getCoachProfileId: async () => "coach-a",
  getClientProfileId: async () => "client-1",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    checkIn: {
      findUnique: checkInFindUnique,
      findFirst: checkInFindFirst,
      update: checkInUpdate,
    },
    coachClientRelationship: { count: relCount },
  },
}));
vi.mock("@/lib/push", () => ({ notifyCheckInFeedback: notify }));
vi.mock("@/lib/checkin-schedule", () => ({ unsendCheckIn: vi.fn() }));

import { GET } from "../check-ins/[id]/route";
import { PUT as coachRespond } from "../check-ins/[id]/coach-respond/route";

const COACH_USER = { id: "u-coach-a", role: "COACH", email: "a@example.com", name: "A" };
const CLIENT_USER = { id: "u-client", role: "CLIENT", email: "c@example.com", name: "C" };

const CHECK_IN = {
  id: "ci-1",
  coachId: "coach-a",
  clientId: "client-1",
  coach: { user: { id: COACH_USER.id, name: "A" } },
  client: { user: { id: CLIENT_USER.id, name: "C" }, completions: [] },
};

const params = (id = "ci-1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  checkInFindUnique.mockResolvedValue(CHECK_IN);
});

describe("GET /api/check-ins/[id]", () => {
  it("serves the coach while the relationship is ACTIVE", async () => {
    getSession.mockResolvedValue({ user: COACH_USER });
    relCount.mockResolvedValue(1);
    const res = await GET(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect(relCount).toHaveBeenCalledWith({
      where: { coachId: "coach-a", clientId: "client-1", status: "ACTIVE" },
    });
  });

  it("hides the check-in from a former coach", async () => {
    getSession.mockResolvedValue({ user: COACH_USER });
    relCount.mockResolvedValue(0);
    const res = await GET(new Request("http://x"), params());
    expect(res.status).toBe(404);
  });

  it("always serves the client their own check-in", async () => {
    getSession.mockResolvedValue({ user: CLIENT_USER });
    const res = await GET(new Request("http://x"), params());
    expect(res.status).toBe(200);
    expect(relCount).not.toHaveBeenCalled();
  });

  it("hides the check-in from anyone else", async () => {
    getSession.mockResolvedValue({ user: { ...COACH_USER, id: "u-other" } });
    const res = await GET(new Request("http://x"), params());
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/check-ins/[id]/coach-respond", () => {
  const body = () =>
    new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ coachFeedback: "Nice week" }),
      headers: { "content-type": "application/json" },
    });

  it("only matches check-ins whose client the coach still actively coaches", async () => {
    getSession.mockResolvedValue({ user: COACH_USER });
    checkInFindFirst.mockResolvedValue(null);
    const res = await coachRespond(body(), params());
    expect(res.status).toBe(404);
    expect(checkInFindFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "ci-1",
        coachId: "coach-a",
        client: {
          coachRelationship: { is: { coachId: "coach-a", status: "ACTIVE" } },
        },
      }),
    });
    expect(checkInUpdate).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
