import { describe, it, expect, beforeEach, vi } from "vitest";

const { getSession, exerciseCount, exerciseUpdate, exerciseFindFirst, exerciseCreate } = vi.hoisted(() => ({
  getSession: vi.fn(),
  exerciseCount: vi.fn(),
  exerciseUpdate: vi.fn(),
  exerciseFindFirst: vi.fn(),
  exerciseCreate: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-a",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    exercise: { count: exerciseCount, update: exerciseUpdate, findFirst: exerciseFindFirst, create: exerciseCreate },
  },
}));

import { DELETE as deleteExercise } from "../exercises/[id]/route";
import { POST as createExercise } from "../exercises/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown, method = "POST") =>
  new Request("http://x", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "a@example.com" } });
});

describe("DELETE /api/exercises/[id]", () => {
  it("soft-deletes the coach's own exercise, so plans using it keep it", async () => {
    exerciseCount.mockResolvedValue(1);
    const res = await deleteExercise(new Request("http://x", { method: "DELETE" }), params("ex-1"));
    expect(res.status).toBe(200);
    expect(exerciseCount).toHaveBeenCalledWith({ where: { id: "ex-1", coachId: "coach-a", deletedAt: null } });
    expect(exerciseUpdate).toHaveBeenCalledWith({ where: { id: "ex-1" }, data: { deletedAt: expect.any(Date) } });
  });

  it("404s for another coach's exercise without touching it", async () => {
    exerciseCount.mockResolvedValue(0);
    const res = await deleteExercise(new Request("http://x", { method: "DELETE" }), params("ex-9"));
    expect(res.status).toBe(404);
    expect(exerciseUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/exercises", () => {
  it("treats a name that differs only by case as a duplicate", async () => {
    exerciseFindFirst.mockResolvedValue({ id: "ex-1", name: "Back Squat" });
    const res = await createExercise(json({ name: "back squat" }), params(""));
    expect(res.status).toBe(409);
    expect(exerciseFindFirst.mock.calls[0][0].where.name).toEqual({ equals: "back squat", mode: "insensitive" });
    expect(exerciseCreate).not.toHaveBeenCalled();
  });
});
