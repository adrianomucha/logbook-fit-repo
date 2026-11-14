import { describe, it, expect, beforeEach, vi } from "vitest";

const { getSession, relationshipFindFirst, completionFindMany, checkInFindMany, messageFindMany } = vi.hoisted(() => ({
  getSession: vi.fn(),
  relationshipFindFirst: vi.fn(),
  completionFindMany: vi.fn(),
  checkInFindMany: vi.fn(),
  messageFindMany: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-a",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    coachClientRelationship: { findFirst: relationshipFindFirst },
    workoutCompletion: { findMany: completionFindMany },
    checkIn: { findMany: checkInFindMany },
    message: { findMany: messageFindMany },
  },
}));

import { GET as archive } from "../coach/clients/[id]/archive/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = () => new Request("http://x");

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "coach-user", role: "COACH", email: "a@example.com" } });
  relationshipFindFirst.mockResolvedValue({
    createdAt: new Date("2026-01-05"),
    endedAt: new Date("2026-06-01"),
    endedBy: "COACH",
    client: { id: "client-1", user: { id: "client-user", name: "Sam Lee", email: "sam@example.com", avatarUrl: null } },
  });
  completionFindMany.mockResolvedValue([]);
  checkInFindMany.mockResolvedValue([]);
  messageFindMany.mockResolvedValue([]);
});

describe("GET /api/coach/clients/[id]/archive", () => {
  it("only opens an ended relationship with this coach", async () => {
    await archive(get(), params("client-1"));
    expect(relationshipFindFirst.mock.calls[0][0].where).toEqual({
      coachId: "coach-a",
      clientId: "client-1",
      status: "INACTIVE",
    });
  });

  it("404s without reading anything when there is no such past client", async () => {
    relationshipFindFirst.mockResolvedValue(null);
    const res = await archive(get(), params("someone-elses-client"));
    expect(res.status).toBe(404);
    expect(completionFindMany).not.toHaveBeenCalled();
    expect(checkInFindMany).not.toHaveBeenCalled();
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it("limits the record to what was between this coach and the client", async () => {
    await archive(get(), params("client-1"));
    expect(completionFindMany.mock.calls[0][0].where).toEqual({
      clientId: "client-1",
      status: "COMPLETED",
      plan: { coachId: "coach-a" },
    });
    expect(checkInFindMany.mock.calls[0][0].where).toMatchObject({ clientId: "client-1", coachId: "coach-a" });
    expect(messageFindMany.mock.calls[0][0].where).toEqual({
      OR: [
        { senderId: "coach-user", recipientId: "client-user" },
        { senderId: "client-user", recipientId: "coach-user" },
      ],
    });
  });

  it("returns workouts, and the conversation oldest first with who said what", async () => {
    completionFindMany.mockResolvedValue([
      {
        id: "w1",
        completedAt: new Date("2026-05-20"),
        completionPct: 1,
        exercisesDone: 5,
        exercisesTotal: 5,
        durationSec: 3000,
        day: { name: "Push" },
        plan: { name: "Strength" },
      },
    ]);
    messageFindMany.mockResolvedValue([
      { id: "m2", senderId: "client-user", content: "Thanks!", createdAt: new Date("2026-05-21") },
      { id: "m1", senderId: "coach-user", content: "Nice work", createdAt: new Date("2026-05-20") },
    ]);
    const res = await archive(get(), params("client-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.endedBy).toBe("COACH");
    expect(body.workouts).toEqual([
      expect.objectContaining({ id: "w1", dayName: "Push", planName: "Strength", exercisesDone: 5 }),
    ]);
    expect(body.messages.map((m: { id: string; fromCoach: boolean }) => [m.id, m.fromCoach])).toEqual([
      ["m1", true],
      ["m2", false],
    ]);
  });

  it("is refused for a client account", async () => {
    getSession.mockResolvedValue({ user: { id: "u9", role: "CLIENT", email: "c@example.com" } });
    const res = await archive(get(), params("client-1"));
    expect([401, 403]).toContain(res.status);
    expect(relationshipFindFirst).not.toHaveBeenCalled();
  });
});
