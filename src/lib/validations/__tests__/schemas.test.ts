import { describe, it, expect } from "vitest";
import {
  signupSchema,
  createExerciseSchema,
  updateExerciseSchema,
  createCheckInSchema,
  clientRespondSchema,
  coachRespondSchema,
  createPlanSchema,
  assignPlanSchema,
  sendMessageSchema,
  startWorkoutSchema,
  finishWorkoutSchema,
  updateSetsSchema,
  flagExerciseSchema,
  createInviteSchema,
} from "../schemas";

// ──────────────────────────────────────
// signupSchema
// ──────────────────────────────────────

describe("signupSchema", () => {
  it("accepts valid coach signup", () => {
    const result = signupSchema.safeParse({
      email: "  Coach@Example.COM  ",
      password: "securepass",
      name: "John",
      role: "COACH",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("coach@example.com");
    }
  });

  it("accepts valid client signup with invite token", () => {
    const result = signupSchema.safeParse({
      email: "client@test.com",
      password: "securepass",
      name: "Jane",
      inviteToken: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = signupSchema.safeParse({
      password: "securepass",
      name: "John",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "securepass",
      name: "John",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "short",
      name: "John",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass",
      name: "",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass",
      name: "a".repeat(101),
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass",
      name: "John",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when neither role nor inviteToken is provided", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass",
      name: "John",
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// createExerciseSchema
// ──────────────────────────────────────

describe("createExerciseSchema", () => {
  it("accepts valid exercise with all fields", () => {
    const result = createExerciseSchema.safeParse({
      name: "Bench Press",
      category: "CHEST",
      defaultSets: 3,
      defaultReps: 10,
      defaultWeight: 80,
      defaultRest: 90,
      instructions: "Keep your back flat",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal exercise (name only)", () => {
    const result = createExerciseSchema.safeParse({ name: "Squats" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("OTHER");
    }
  });

  it("rejects empty name", () => {
    const result = createExerciseSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = createExerciseSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
      category: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects sets over 20", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
      defaultSets: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
      defaultWeight: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects instructions over 1000 characters", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
      instructions: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// updateExerciseSchema
// ──────────────────────────────────────

describe("updateExerciseSchema", () => {
  it("accepts partial update with just name", () => {
    const result = updateExerciseSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    const result = updateExerciseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateExerciseSchema.safeParse({
      defaultWeight: null,
      instructions: null,
    });
    expect(result.success).toBe(true);
  });
});

// ──────────────────────────────────────
// createCheckInSchema
// ──────────────────────────────────────

describe("createCheckInSchema", () => {
  it("accepts valid UUID", () => {
    const result = createCheckInSchema.safeParse({
      clientProfileId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID string", () => {
    const result = createCheckInSchema.safeParse({
      clientProfileId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing clientProfileId", () => {
    const result = createCheckInSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// clientRespondSchema
// ──────────────────────────────────────

describe("clientRespondSchema", () => {
  it("accepts valid response with all fields", () => {
    const result = clientRespondSchema.safeParse({
      effortRating: "HARD",
      painBlockers: "Knee pain during squats",
      clientFeeling: "Good overall",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = clientRespondSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid effort rating", () => {
    const result = clientRespondSchema.safeParse({ effortRating: "EXTREME" });
    expect(result.success).toBe(false);
  });

  it("rejects painBlockers over 1000 characters", () => {
    const result = clientRespondSchema.safeParse({
      painBlockers: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// coachRespondSchema
// ──────────────────────────────────────

describe("coachRespondSchema", () => {
  it("accepts valid response", () => {
    const result = coachRespondSchema.safeParse({
      coachFeedback: "Great progress!",
      planAdjustment: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects feedback over 2000 characters", () => {
    const result = coachRespondSchema.safeParse({
      coachFeedback: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// createPlanSchema
// ──────────────────────────────────────

describe("createPlanSchema", () => {
  it("accepts valid plan with all fields", () => {
    const result = createPlanSchema.safeParse({
      name: "Push Pull Legs",
      description: "Classic PPL split",
      emoji: "💪",
      durationWeeks: 8,
      workoutsPerWeek: 6,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional numeric fields", () => {
    const result = createPlanSchema.safeParse({ name: "Basic Plan" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationWeeks).toBe(4);
      expect(result.data.workoutsPerWeek).toBe(4);
      expect(result.data.description).toBe("");
    }
  });

  it("rejects name shorter than 3 characters", () => {
    const result = createPlanSchema.safeParse({ name: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = createPlanSchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("rejects durationWeeks over 12", () => {
    const result = createPlanSchema.safeParse({
      name: "Test Plan",
      durationWeeks: 13,
    });
    expect(result.success).toBe(false);
  });

  it("rejects workoutsPerWeek over 7", () => {
    const result = createPlanSchema.safeParse({
      name: "Test Plan",
      workoutsPerWeek: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 200 characters", () => {
    const result = createPlanSchema.safeParse({
      name: "Test Plan",
      description: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// sendMessageSchema
// ──────────────────────────────────────

describe("sendMessageSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid message", () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: "Hello!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with reference IDs", () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: "Check this workout",
      workoutReferenceId: validUuid,
      exerciseReferenceId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID recipientId", () => {
    const result = sendMessageSchema.safeParse({
      recipientId: "not-a-uuid",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// updateSetsSchema
// ──────────────────────────────────────

describe("updateSetsSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid sets array", () => {
    const result = updateSetsSchema.safeParse({
      sets: [
        {
          workoutExerciseId: validUuid,
          setNumber: 1,
          completed: true,
          actualWeight: 80,
          actualReps: 10,
        },
        {
          workoutExerciseId: validUuid,
          setNumber: 2,
          completed: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty sets array", () => {
    const result = updateSetsSchema.safeParse({ sets: [] });
    expect(result.success).toBe(false);
  });

  it("rejects sets array over 100 items", () => {
    const sets = Array.from({ length: 101 }, (_, i) => ({
      workoutExerciseId: validUuid,
      setNumber: i + 1,
      completed: true,
    }));
    const result = updateSetsSchema.safeParse({ sets });
    expect(result.success).toBe(false);
  });

  it("rejects set with missing required fields", () => {
    const result = updateSetsSchema.safeParse({
      sets: [{ workoutExerciseId: validUuid }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative actualWeight", () => {
    const result = updateSetsSchema.safeParse({
      sets: [
        {
          workoutExerciseId: validUuid,
          setNumber: 1,
          completed: true,
          actualWeight: -5,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// flagExerciseSchema
// ──────────────────────────────────────

describe("flagExerciseSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid flag with note", () => {
    const result = flagExerciseSchema.safeParse({
      workoutExerciseId: validUuid,
      note: "Too heavy for me",
    });
    expect(result.success).toBe(true);
  });

  it("accepts flag without note", () => {
    const result = flagExerciseSchema.safeParse({
      workoutExerciseId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects note over 500 characters", () => {
    const result = flagExerciseSchema.safeParse({
      workoutExerciseId: validUuid,
      note: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// createInviteSchema
// ──────────────────────────────────────

describe("createInviteSchema", () => {
  it("accepts valid email", () => {
    const result = createInviteSchema.safeParse({ email: "client@test.com" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (email optional)", () => {
    const result = createInviteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createInviteSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// Other simple schemas
// ──────────────────────────────────────

describe("assignPlanSchema", () => {
  it("rejects non-UUID", () => {
    const result = assignPlanSchema.safeParse({ clientProfileId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("startWorkoutSchema", () => {
  it("rejects non-UUID dayId", () => {
    const result = startWorkoutSchema.safeParse({ dayId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("finishWorkoutSchema", () => {
  it("accepts empty object", () => {
    const result = finishWorkoutSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid effort rating", () => {
    const result = finishWorkoutSchema.safeParse({ effortRating: "MEDIUM" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid effort rating", () => {
    const result = finishWorkoutSchema.safeParse({ effortRating: "INSANE" });
    expect(result.success).toBe(false);
  });
});
