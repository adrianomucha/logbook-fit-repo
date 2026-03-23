import { describe, it, expect } from "vitest";
import {
  apiPlanToWorkoutPlan,
  apiCheckInToCheckIn,
  apiMessagesToMessages,
  apiProgressToWorkoutCompletions,
  apiClientDetailToWorkoutCompletions,
  apiClientDetailToClient,
} from "../api";
import type { PlanDetail } from "@/hooks/api/usePlanDetail";

// ---------------------------------------------------------------------------
// apiPlanToWorkoutPlan
// ---------------------------------------------------------------------------

describe("apiPlanToWorkoutPlan", () => {
  const basePlan: PlanDetail = {
    id: "plan-1",
    name: "Strength 101",
    description: "A beginner plan",
    emoji: "💪",
    durationWeeks: 4,
    workoutsPerWeek: 3,
    coachId: "coach-1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    editedAt: null,
    deletedAt: null,
    assignedTo: [],
    weeks: [
      {
        id: "week-1",
        weekNumber: 1,
        days: [
          {
            id: "day-1",
            orderIndex: 1,
            name: "Push Day",
            description: "Chest and shoulders",
            exercises: [
              {
                id: "we-1",
                orderIndex: 0,
                sets: 3,
                reps: "8-10",
                weight: "135 lbs",
                restSeconds: 90,
                coachNotes: "Focus on form",
                exercise: {
                  id: "ex-1",
                  name: "Bench Press",
                  category: "UPPER_BODY",
                  instructions: null,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  it("maps all top-level plan fields", () => {
    const result = apiPlanToWorkoutPlan(basePlan);
    expect(result.id).toBe("plan-1");
    expect(result.name).toBe("Strength 101");
    expect(result.description).toBe("A beginner plan");
    expect(result.emoji).toBe("💪");
    expect(result.durationWeeks).toBe(4);
    expect(result.workoutsPerWeek).toBe(3);
    expect(result.createdAt).toBe("2025-01-01T00:00:00Z");
    expect(result.updatedAt).toBe("2025-01-02T00:00:00Z");
  });

  it("maps weeks, days, and exercises", () => {
    const result = apiPlanToWorkoutPlan(basePlan);
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].days).toHaveLength(1);
    expect(result.weeks[0].days[0].name).toBe("Push Day");
    expect(result.weeks[0].days[0].exercises).toHaveLength(1);
    expect(result.weeks[0].days[0].exercises[0].name).toBe("Bench Press");
    expect(result.weeks[0].days[0].exercises[0].sets).toBe(3);
    expect(result.weeks[0].days[0].exercises[0].reps).toBe("8-10");
  });

  it("handles null day name with fallback", () => {
    const plan = {
      ...basePlan,
      weeks: [
        {
          ...basePlan.weeks[0],
          days: [
            { ...basePlan.weeks[0].days[0], name: null, orderIndex: 3 },
          ],
        },
      ],
    };
    const result = apiPlanToWorkoutPlan(plan);
    expect(result.weeks[0].days[0].name).toBe("Day 3");
  });

  it("converts null description to undefined", () => {
    const plan = { ...basePlan, description: null };
    const result = apiPlanToWorkoutPlan(plan);
    expect(result.description).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// apiCheckInToCheckIn
// ---------------------------------------------------------------------------

describe("apiCheckInToCheckIn", () => {
  const baseCheckIn = {
    id: "ci-1",
    status: "PENDING",
    createdAt: "2025-03-01T12:00:00Z",
    effortRating: null,
    painBlockers: null,
    clientFeeling: null,
    clientRespondedAt: null,
    coachFeedback: null,
    planAdjustment: null,
    completedAt: null,
  };

  it("maps PENDING status to 'pending'", () => {
    const result = apiCheckInToCheckIn(baseCheckIn, "client-1", "coach-1");
    expect(result.status).toBe("pending");
    expect(result.clientId).toBe("client-1");
    expect(result.coachId).toBe("coach-1");
  });

  it("maps CLIENT_RESPONDED status to 'responded'", () => {
    const ci = { ...baseCheckIn, status: "CLIENT_RESPONDED" };
    const result = apiCheckInToCheckIn(ci, "c", "co");
    expect(result.status).toBe("responded");
  });

  it("maps COMPLETED status to 'completed'", () => {
    const ci = {
      ...baseCheckIn,
      status: "COMPLETED",
      completedAt: "2025-03-02T12:00:00Z",
      coachFeedback: "Great work!",
    };
    const result = apiCheckInToCheckIn(ci, "c", "co");
    expect(result.status).toBe("completed");
    expect(result.completedAt).toBe("2025-03-02T12:00:00Z");
    expect(result.coachResponse).toBe("Great work!");
  });

  it("maps optional fields from API", () => {
    const ci = {
      ...baseCheckIn,
      status: "CLIENT_RESPONDED",
      effortRating: "ABOUT_RIGHT",
      painBlockers: "Sore shoulder",
      clientFeeling: "NORMAL",
      clientRespondedAt: "2025-03-01T14:00:00Z",
    };
    const result = apiCheckInToCheckIn(ci, "c", "co");
    expect(result.workoutFeeling).toBe("ABOUT_RIGHT");
    expect(result.clientNotes).toBe("Sore shoulder");
    expect(result.bodyFeeling).toBe("NORMAL");
    expect(result.clientRespondedAt).toBe("2025-03-01T14:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// apiMessagesToMessages
// ---------------------------------------------------------------------------

describe("apiMessagesToMessages", () => {
  it("reverses order (newest-first API → oldest-first domain)", () => {
    const msgs = [
      {
        id: "m-2",
        content: "Second",
        createdAt: "2025-03-02T00:00:00Z",
        readAt: null,
        senderId: "u-1",
        recipientId: "u-2",
        sender: { name: "Alice" },
      },
      {
        id: "m-1",
        content: "First",
        createdAt: "2025-03-01T00:00:00Z",
        readAt: "2025-03-01T01:00:00Z",
        senderId: "u-2",
        recipientId: "u-1",
        sender: { name: "Bob" },
      },
    ];
    const result = apiMessagesToMessages(msgs, "client-1");
    expect(result[0].id).toBe("m-1");
    expect(result[1].id).toBe("m-2");
    expect(result[0].read).toBe(true);
    expect(result[1].read).toBe(false);
    expect(result[0].clientId).toBe("client-1");
  });

  it("handles null sender name", () => {
    const msgs = [
      {
        id: "m-1",
        content: "Hi",
        createdAt: "2025-03-01T00:00:00Z",
        readAt: null,
        senderId: "u-1",
        recipientId: "u-2",
        sender: { name: null },
      },
    ];
    const result = apiMessagesToMessages(msgs, "client-1");
    expect(result[0].senderName).toBe("Unknown");
  });

  it("handles empty array", () => {
    expect(apiMessagesToMessages([], "client-1")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// apiProgressToWorkoutCompletions
// ---------------------------------------------------------------------------

describe("apiProgressToWorkoutCompletions", () => {
  it("maps all fields from progress completions", () => {
    const completions = [
      {
        id: "wc-1",
        clientId: "client-1",
        planId: "plan-1",
        weekId: "week-1",
        dayId: "day-1",
        status: "COMPLETED",
        startedAt: "2025-03-01T10:00:00Z",
        completedAt: "2025-03-01T11:00:00Z",
        completionPct: 85,
        exercisesDone: 4,
        exercisesTotal: 5,
        durationSec: 3600,
        effortRating: "MEDIUM",
      },
    ];
    const result = apiProgressToWorkoutCompletions(completions);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("wc-1");
    expect(result[0].status).toBe("COMPLETED");
    expect(result[0].completionPct).toBe(85);
    expect(result[0].effortRating).toBe("MEDIUM");
  });
});

// ---------------------------------------------------------------------------
// apiClientDetailToWorkoutCompletions
// ---------------------------------------------------------------------------

describe("apiClientDetailToWorkoutCompletions", () => {
  it("maps coach client-detail completions", () => {
    const completions = [
      {
        id: "wc-1",
        dayId: "day-1",
        completedAt: "2025-03-01T11:00:00Z",
        completionPct: 100,
        exercisesDone: 5,
        exercisesTotal: 5,
        effortRating: "HARD",
        durationSec: 3000,
        day: { name: "Push", orderIndex: 1, week: { id: "week-1" } },
      },
    ];
    const result = apiClientDetailToWorkoutCompletions(
      completions,
      "client-1",
      "plan-1"
    );
    expect(result[0].clientId).toBe("client-1");
    expect(result[0].planId).toBe("plan-1");
    expect(result[0].weekId).toBe("week-1");
    expect(result[0].status).toBe("COMPLETED");
  });

  it("handles null week with fallback", () => {
    const completions = [
      {
        id: "wc-2",
        dayId: "day-2",
        completedAt: null,
        completionPct: null,
        exercisesDone: null,
        exercisesTotal: null,
        effortRating: null,
        durationSec: null,
        day: { name: null, orderIndex: 2, week: null },
      },
    ];
    const result = apiClientDetailToWorkoutCompletions(
      completions,
      "client-1",
      "plan-1"
    );
    expect(result[0].weekId).toBe("");
    expect(result[0].completionPct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// apiClientDetailToClient
// ---------------------------------------------------------------------------

describe("apiClientDetailToClient", () => {
  it("maps client detail to domain Client", () => {
    const detail = {
      id: "client-1",
      user: {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        avatarUrl: null,
        createdAt: "2025-01-01T00:00:00Z",
      },
      activePlan: { id: "plan-1", name: "Strength", description: null, durationWeeks: 4 },
      planStartDate: "2025-02-01T00:00:00Z",
      relationshipStatus: "ACTIVE",
      joinedAt: "2025-01-15T00:00:00Z",
      completions: [],
      checkIns: [
        { id: "ci-1", status: "COMPLETED", effortRating: null, createdAt: "2025-03-01T00:00:00Z", completedAt: "2025-03-02T00:00:00Z" },
      ],
    };
    const result = apiClientDetailToClient(detail);
    expect(result.id).toBe("client-1");
    expect(result.name).toBe("John Doe");
    expect(result.email).toBe("john@example.com");
    expect(result.currentPlanId).toBe("plan-1");
    expect(result.status).toBe("active");
    expect(result.planStartDate).toBe("2025-02-01T00:00:00Z");
    expect(result.lastCheckInDate).toBe("2025-03-02T00:00:00Z");
  });

  it("handles inactive client with no plan", () => {
    const detail = {
      id: "client-2",
      user: {
        id: "user-2",
        name: null,
        email: "nobody@example.com",
        avatarUrl: null,
        createdAt: "2025-01-01T00:00:00Z",
      },
      activePlan: null,
      planStartDate: null,
      relationshipStatus: "INACTIVE",
      joinedAt: "2025-01-15T00:00:00Z",
      completions: [],
      checkIns: [],
    };
    const result = apiClientDetailToClient(detail);
    expect(result.name).toBe("Unknown");
    expect(result.currentPlanId).toBeUndefined();
    expect(result.status).toBe("inactive");
    expect(result.planStartDate).toBeUndefined();
    expect(result.lastCheckInDate).toBeUndefined();
  });
});
