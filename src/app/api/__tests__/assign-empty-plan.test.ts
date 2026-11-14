import { describe, it, expect, beforeEach, vi } from "vitest";
import { EMPTY_PLAN } from "@logbook/shared/coach-copy";

const {
  getSession,
  planFindFirst,
  relationshipFindFirst,
  clientFindUnique,
  clientUpdate,
  exerciseCount,
  coachFindUnique,
  clonePlanForClient,
  notifyPlanAssigned,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  planFindFirst: vi.fn(),
  relationshipFindFirst: vi.fn(),
  clientFindUnique: vi.fn(),
  clientUpdate: vi.fn(),
  exerciseCount: vi.fn(),
  coachFindUnique: vi.fn(),
  clonePlanForClient: vi.fn(),
  notifyPlanAssigned: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-a",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    plan: { findFirst: planFindFirst },
    coachClientRelationship: { findFirst: relationshipFindFirst },
    clientProfile: { findUnique: clientFindUnique, update: clientUpdate },
    workoutExercise: { count: exerciseCount },
    coachProfile: { findUnique: coachFindUnique },
  },
}));
vi.mock("@/lib/plan-clone", () => ({ clonePlanForClient }));
vi.mock("@/lib/push", () => ({ notifyPlanAssigned }));

import { POST as assign } from "../plans/[id]/assign/route";

const CLIENT_ID = "3f2b8c1e-7a4d-4e9b-9c55-0d6a1b2c3d4e";
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
  planFindFirst.mockResolvedValue({ id: "p1", name: "Plan" });
  relationshipFindFirst.mockResolvedValue({ id: "r1" });
  clientFindUnique.mockResolvedValue({
    id: CLIENT_ID,
    activePlanId: null,
    planStartDate: null,
    user: { name: "Sam", timezone: "UTC" },
    activePlan: null,
  });
  clonePlanForClient.mockResolvedValue({ id: "copy-1", name: "Plan" });
  clientUpdate.mockResolvedValue({ id: CLIENT_ID, userId: "u2", activePlanId: "copy-1", user: { name: "Sam" } });
  coachFindUnique.mockResolvedValue({ user: { name: "Coach" } });
});

describe("POST /api/plans/[id]/assign", () => {
  it("refuses a plan with no exercises, without cloning or notifying", async () => {
    exerciseCount.mockResolvedValue(0);
    const res = await assign(json({ clientProfileId: CLIENT_ID }), params("p1"));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: EMPTY_PLAN.error, code: "EMPTY_PLAN" });
    expect(clonePlanForClient).not.toHaveBeenCalled();
    expect(clientUpdate).not.toHaveBeenCalled();
    expect(notifyPlanAssigned).not.toHaveBeenCalled();
  });

  it("counts exercises across the whole plan", async () => {
    exerciseCount.mockResolvedValue(0);
    await assign(json({ clientProfileId: CLIENT_ID }), params("p1"));
    expect(exerciseCount).toHaveBeenCalledWith({ where: { day: { week: { planId: "p1" } } } });
  });

  it("assigns a plan that has exercises", async () => {
    exerciseCount.mockResolvedValue(12);
    const res = await assign(json({ clientProfileId: CLIENT_ID }), params("p1"));
    expect(res.status).toBe(200);
    expect(clonePlanForClient).toHaveBeenCalledWith("p1", "coach-a");
    expect(notifyPlanAssigned).toHaveBeenCalled();
  });

  it("lets the coach assign a plan they just created to build it for the client", async () => {
    exerciseCount.mockResolvedValue(0);
    const res = await assign(json({ clientProfileId: CLIENT_ID, allowEmpty: true }), params("p1"));
    expect(res.status).toBe(200);
    expect(exerciseCount).not.toHaveBeenCalled();
    expect(clonePlanForClient).toHaveBeenCalled();
  });

  it("stays a no-op for the plan the client is already on, even if empty", async () => {
    clientFindUnique.mockResolvedValue({
      id: CLIENT_ID,
      activePlanId: "copy-1",
      planStartDate: null,
      user: { name: "Sam", timezone: "UTC" },
      activePlan: { sourceTemplateId: "p1" },
    });
    exerciseCount.mockResolvedValue(0);
    const res = await assign(json({ clientProfileId: CLIENT_ID }), params("p1"));
    expect(res.status).toBe(200);
    expect(clonePlanForClient).not.toHaveBeenCalled();
  });
});
