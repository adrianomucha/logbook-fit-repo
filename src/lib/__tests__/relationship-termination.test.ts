import { describe, it, expect, vi, beforeEach } from "vitest";

// Transaction client mock — hoisted so the prisma mock factory can close over it
const tx = vi.hoisted(() => ({
  coachClientRelationship: { update: vi.fn() },
  clientProfile: { update: vi.fn() },
  checkIn: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

import { endCoachClientRelationship } from "../relationship-termination";

const relationship = { id: "rel-1", coachId: "coach-1", clientId: "client-1" };

describe("endCoachClientRelationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.coachClientRelationship.update.mockResolvedValue({
      id: "rel-1",
      status: "INACTIVE",
      endedAt: new Date("2026-07-13T12:00:00Z"),
      endedBy: "COACH",
    });
  });

  it("marks the relationship INACTIVE with audit fields and disables the schedule", async () => {
    await endCoachClientRelationship(relationship, "COACH");

    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rel-1" },
        data: expect.objectContaining({
          status: "INACTIVE",
          endedBy: "COACH",
          endedAt: expect.any(Date),
          checkInScheduleEnabled: false,
        }),
      })
    );
  });

  it("records the client as the ending party on unsubscribe", async () => {
    await endCoachClientRelationship(relationship, "CLIENT");

    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endedBy: "CLIENT" }),
      })
    );
  });

  it("clears the client's assigned plan", async () => {
    await endCoachClientRelationship(relationship, "COACH");

    expect(tx.clientProfile.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { activePlanId: null, planStartDate: null },
    });
  });

  it("removes only check-ins still in flight, keeping completed history", async () => {
    await endCoachClientRelationship(relationship, "CLIENT");

    expect(tx.checkIn.deleteMany).toHaveBeenCalledWith({
      where: {
        coachId: "coach-1",
        clientId: "client-1",
        status: { in: ["PENDING", "CLIENT_RESPONDED"] },
      },
    });
  });

  it("returns the ended relationship", async () => {
    const ended = await endCoachClientRelationship(relationship, "COACH");
    expect(ended).toMatchObject({ id: "rel-1", status: "INACTIVE" });
  });
});
