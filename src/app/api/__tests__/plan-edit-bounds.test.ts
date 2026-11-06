import { describe, it, expect, beforeEach, vi } from "vitest";

const { getSession, planFindFirst, planUpdate, weekCreate, dayFindUnique, dayUpdate } = vi.hoisted(() => ({
  getSession: vi.fn(),
  planFindFirst: vi.fn(),
  planUpdate: vi.fn(),
  weekCreate: vi.fn(),
  dayFindUnique: vi.fn(),
  dayUpdate: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-a",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    plan: { findFirst: planFindFirst, update: planUpdate },
    week: { create: weekCreate },
    day: { findUnique: dayFindUnique, update: dayUpdate },
  },
}));

import { PUT as updatePlan } from "../plans/[id]/route";
import { POST as addWeek } from "../plans/[id]/weeks/route";
import { PUT as updateDay } from "../days/[id]/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown) =>
  new Request("http://x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "a@example.com" } });
});

describe("PUT /api/plans/[id]", () => {
  it("refuses an out-of-range plan size without writing", async () => {
    planFindFirst.mockResolvedValue({ id: "p1", name: "Plan", sourceTemplateId: null });
    const res = await updatePlan(json({ workoutsPerWeek: 1_000_000 }), params("p1"));
    expect(res.status).toBe(400);
    expect(planUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/plans/[id]/weeks", () => {
  it("refuses a 13th week", async () => {
    planFindFirst.mockResolvedValue({ id: "p1", workoutsPerWeek: 3, durationWeeks: 12, weeks: [{ weekNumber: 12 }] });
    const res = await addWeek(json({}), params("p1"));
    expect(res.status).toBe(400);
    expect(weekCreate).not.toHaveBeenCalled();
  });

  it("refuses an oversized list of days", async () => {
    planFindFirst.mockResolvedValue({ id: "p1", workoutsPerWeek: 3, durationWeeks: 4, weeks: [{ weekNumber: 2 }] });
    const res = await addWeek(json({ days: Array(5000).fill({ name: "x" }) }), params("p1"));
    expect(res.status).toBe(400);
    expect(weekCreate).not.toHaveBeenCalled();
  });

  it("still adds a normal week", async () => {
    planFindFirst.mockResolvedValue({ id: "p1", workoutsPerWeek: 3, durationWeeks: 4, weeks: [{ weekNumber: 2 }] });
    weekCreate.mockResolvedValue({ id: "w3", days: [] });
    const res = await addWeek(new Request("http://x", { method: "POST" }), params("p1"));
    expect(res.status).toBe(201);
    expect(weekCreate.mock.calls[0][0].data.days.create).toHaveLength(3);
  });
});

describe("PUT /api/days/[id]", () => {
  it("refuses an unbounded description without writing", async () => {
    dayFindUnique.mockResolvedValue({ id: "d1", week: { plan: { id: "p1", coachId: "coach-a", deletedAt: null } } });
    const res = await updateDay(json({ description: "x".repeat(5000) }), params("d1"));
    expect(res.status).toBe(400);
    expect(dayUpdate).not.toHaveBeenCalled();
  });
});
