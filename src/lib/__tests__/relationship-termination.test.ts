import { describe, it, expect, vi, beforeEach } from "vitest";

// Transaction client mock — hoisted so the prisma mock factory can close over it
const tx = vi.hoisted(() => ({
  coachClientRelationship: { update: vi.fn() },
  clientProfile: { update: vi.fn(), findUnique: vi.fn() },
  checkIn: { deleteMany: vi.fn() },
  plan: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

import {
  endCoachClientRelationship,
  restoreCoachClientRelationship,
} from "../relationship-termination";

const relationship = { id: "rel-1", coachId: "coach-1", clientId: "client-1" };

describe("endCoachClientRelationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.clientProfile.findUnique.mockResolvedValue({
      activePlanId: "plan-1",
      planStartDate: new Date("2026-07-01T00:00:00Z"),
    });
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

  it("snapshots the plan assignment onto the relationship, then clears it", async () => {
    await endCoachClientRelationship(relationship, "COACH");

    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endedPlanId: "plan-1",
          endedPlanStartDate: new Date("2026-07-01T00:00:00Z"),
        }),
      })
    );
    expect(tx.clientProfile.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { activePlanId: null, planStartDate: null },
    });
  });

  it("snapshots nulls when the client had no plan", async () => {
    tx.clientProfile.findUnique.mockResolvedValue({
      activePlanId: null,
      planStartDate: null,
    });

    await endCoachClientRelationship(relationship, "COACH");

    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endedPlanId: null,
          endedPlanStartDate: null,
        }),
      })
    );
  });

  it("removes only unanswered check-ins, keeping responses and history", async () => {
    await endCoachClientRelationship(relationship, "CLIENT");

    expect(tx.checkIn.deleteMany).toHaveBeenCalledWith({
      where: {
        coachId: "coach-1",
        clientId: "client-1",
        status: "PENDING",
      },
    });
  });

  it("returns the ended relationship", async () => {
    const ended = await endCoachClientRelationship(relationship, "COACH");
    expect(ended).toMatchObject({ id: "rel-1", status: "INACTIVE" });
  });
});

describe("restoreCoachClientRelationship", () => {
  const endedRelationship = {
    ...relationship,
    endedPlanId: "plan-1",
    endedPlanStartDate: new Date("2026-07-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tx.coachClientRelationship.update.mockResolvedValue({
      id: "rel-1",
      status: "ACTIVE",
    });
    tx.plan.findFirst.mockResolvedValue({ id: "plan-1" });
    tx.clientProfile.findUnique.mockResolvedValue({ activePlanId: null });
  });

  it("reactivates the relationship and clears the audit fields", async () => {
    await restoreCoachClientRelationship(endedRelationship);

    expect(tx.coachClientRelationship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rel-1" },
        data: {
          status: "ACTIVE",
          endedAt: null,
          endedBy: null,
          endedPlanId: null,
          endedPlanStartDate: null,
        },
      })
    );
  });

  it("re-assigns the snapshotted plan with its original start date", async () => {
    const result = await restoreCoachClientRelationship(endedRelationship);

    expect(tx.clientProfile.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: {
        activePlanId: "plan-1",
        planStartDate: new Date("2026-07-01T00:00:00Z"),
      },
    });
    expect(result.planRestored).toBe(true);
  });

  it("skips plan restore when the plan has since been deleted", async () => {
    tx.plan.findFirst.mockResolvedValue(null);

    const result = await restoreCoachClientRelationship(endedRelationship);

    expect(tx.clientProfile.update).not.toHaveBeenCalled();
    expect(result.planRestored).toBe(false);
  });

  it("skips plan restore when the client already has a plan", async () => {
    tx.clientProfile.findUnique.mockResolvedValue({ activePlanId: "plan-2" });

    const result = await restoreCoachClientRelationship(endedRelationship);

    expect(tx.clientProfile.update).not.toHaveBeenCalled();
    expect(result.planRestored).toBe(false);
  });

  it("skips the plan lookup entirely when nothing was snapshotted", async () => {
    const result = await restoreCoachClientRelationship({
      ...relationship,
      endedPlanId: null,
      endedPlanStartDate: null,
    });

    expect(tx.plan.findFirst).not.toHaveBeenCalled();
    expect(tx.clientProfile.update).not.toHaveBeenCalled();
    expect(result.planRestored).toBe(false);
  });
});
