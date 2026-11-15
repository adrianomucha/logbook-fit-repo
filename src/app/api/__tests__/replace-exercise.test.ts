import { describe, it, expect, beforeEach, vi } from "vitest";
import { REPLACE_EXERCISE } from "@logbook/shared/coach-copy";

const { getSession, weFindUnique, weUpdate, exerciseCount, setCount, flagCount, planUpdateMany } = vi.hoisted(() => ({
  getSession: vi.fn(),
  weFindUnique: vi.fn(),
  weUpdate: vi.fn(),
  exerciseCount: vi.fn(),
  setCount: vi.fn(),
  flagCount: vi.fn(),
  planUpdateMany: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-a",
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    workoutExercise: { findUnique: weFindUnique, update: weUpdate },
    exercise: { count: exerciseCount },
    setCompletion: { count: setCount },
    exerciseFlag: { count: flagCount },
    plan: { updateMany: planUpdateMany },
  },
}));

import { PUT as updateWorkoutExercise } from "../workout-exercises/[id]/route";

const NEW_EXERCISE = "3f2b8c1e-7a4d-4e9b-9c55-0d6a1b2c3d4e";
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const put = (body: unknown) =>
  new Request("http://x", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "u1", role: "COACH", email: "a@example.com" } });
  weFindUnique.mockResolvedValue({
    id: "we-1",
    exerciseId: "old-exercise",
    day: { week: { plan: { id: "plan-1", coachId: "coach-a", deletedAt: null } } },
  });
  weUpdate.mockResolvedValue({ id: "we-1" });
  exerciseCount.mockResolvedValue(1);
  setCount.mockResolvedValue(0);
  flagCount.mockResolvedValue(0);
});

describe("PUT /api/workout-exercises/[id]: replacing the exercise", () => {
  it("swaps in one of the coach's own exercises on a row nobody has trained", async () => {
    const res = await updateWorkoutExercise(put({ exerciseId: NEW_EXERCISE, sets: 4 }), params("we-1"));
    expect(res.status).toBe(200);
    expect(weUpdate.mock.calls[0][0].data).toMatchObject({ exerciseId: NEW_EXERCISE, sets: 4 });
    expect(exerciseCount).toHaveBeenCalledWith({ where: { id: NEW_EXERCISE, coachId: "coach-a", deletedAt: null } });
    // Counts as a plan edit
    expect(planUpdateMany).toHaveBeenCalledWith({ where: { id: "plan-1" }, data: { editedAt: expect.any(Date) } });
  });

  it("refuses once the client has logged sets on the row, and says why", async () => {
    setCount.mockResolvedValue(3);
    const res = await updateWorkoutExercise(put({ exerciseId: NEW_EXERCISE }), params("we-1"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: REPLACE_EXERCISE.logged, code: "EXERCISE_LOGGED" });
    expect(setCount).toHaveBeenCalledWith({ where: { workoutExerciseId: "we-1", completed: true } });
    expect(weUpdate).not.toHaveBeenCalled();
  });

  it("refuses when the client flagged the exercise, even with no sets ticked", async () => {
    flagCount.mockResolvedValue(1);
    const res = await updateWorkoutExercise(put({ exerciseId: NEW_EXERCISE }), params("we-1"));
    expect(res.status).toBe(409);
    expect(weUpdate).not.toHaveBeenCalled();
  });

  it("refuses an exercise from another coach's library", async () => {
    exerciseCount.mockResolvedValue(0);
    const res = await updateWorkoutExercise(put({ exerciseId: NEW_EXERCISE }), params("we-1"));
    expect(res.status).toBe(404);
    expect(weUpdate).not.toHaveBeenCalled();
  });

  it("still lets the coach edit sets and reps on a row that has been trained", async () => {
    setCount.mockResolvedValue(3);
    const res = await updateWorkoutExercise(put({ sets: 5 }), params("we-1"));
    expect(res.status).toBe(200);
    expect(weUpdate.mock.calls[0][0].data).toEqual({ sets: 5 });
    expect(setCount).not.toHaveBeenCalled();
  });

  it("rejects a malformed exerciseId before reading anything", async () => {
    const res = await updateWorkoutExercise(put({ exerciseId: "not-a-uuid", sets: 5 }), params("we-1"));
    expect(res.status).toBe(400);
    expect(exerciseCount).not.toHaveBeenCalled();
    expect(weUpdate).not.toHaveBeenCalled();
  });
});
