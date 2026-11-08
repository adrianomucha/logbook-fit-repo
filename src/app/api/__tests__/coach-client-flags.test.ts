import { describe, it, expect, vi } from "vitest";

const { clientFindUnique } = vi.hoisted(() => ({ clientFindUnique: vi.fn() }));

vi.mock("@/lib/session", () => ({
  getSession: async () => ({ user: { id: "u1", role: "COACH", email: "b@example.com" } }),
}));
vi.mock("@/lib/scoping", async (orig) => ({
  ...(await orig<typeof import("@/lib/scoping")>()),
  getCoachProfileId: async () => "coach-b",
}));
vi.mock("@/lib/checkin-schedule", async (orig) => ({
  ...(await orig<typeof import("@/lib/checkin-schedule")>()),
  ensureScheduledCheckIn: async () => undefined,
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    coachClientRelationship: { findFirst: async () => ({ id: "r1", coachId: "coach-b", clientId: "c1" }) },
    clientProfile: { findUnique: clientFindUnique },
  },
}));

import { GET } from "../coach/clients/[id]/route";

describe("GET /api/coach/clients/[id]", () => {
  it("only returns exercise flags from this coach's own plans", async () => {
    // Stop after the query under test; the rest of the handler isn't the point
    clientFindUnique.mockResolvedValue(null);
    await GET(new Request("http://x"), { params: Promise.resolve({ id: "c1" }) }).catch(() => undefined);

    const flags = clientFindUnique.mock.calls[0][0].include.completions.select.flags;
    expect(flags.where).toEqual({
      workoutExercise: { day: { week: { plan: { coachId: "coach-b" } } } },
    });
    // Workout history itself is not filtered by plan owner
    expect(clientFindUnique.mock.calls[0][0].include.completions.where).toEqual({
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
    });
  });
});
