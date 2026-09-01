import { describe, it, expect } from "vitest";
import {
  signupSchema,
  passwordSchema,
  passwordResetConfirmSchema,
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
  addWorkoutExerciseSchema,
  updateWorkoutExerciseSchema,
  waitlistSchema,
  waitlistQualifySchema,
  waitlistInviteSchema,
  feedbackSchema,
  feedbackStatusSchema,
} from "../schemas";

// ──────────────────────────────────────
// passwordSchema
// ──────────────────────────────────────

describe("passwordSchema", () => {
  it("accepts a password with letters and numbers", () => {
    expect(passwordSchema.safeParse("securepass1").success).toBe(true);
  });

  it("rejects fewer than 8 characters", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(false);
  });

  it("rejects letters-only passwords", () => {
    expect(passwordSchema.safeParse("aaaaaaaa").success).toBe(false);
  });

  it("rejects digits-only passwords", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("rejects passwords over 72 bytes (bcrypt truncation limit)", () => {
    expect(passwordSchema.safeParse("a1" + "a".repeat(71)).success).toBe(false);
  });

  it("counts the limit in bytes, not characters", () => {
    // 25 emoji = 100 bytes but only 50 UTF-16 code units — chars alone
    // would pass, bytes must not
    expect(passwordSchema.safeParse("a1" + "💪".repeat(25)).success).toBe(
      false
    );
  });

  it("rejects common passwords regardless of case", () => {
    expect(passwordSchema.safeParse("password1").success).toBe(false);
    expect(passwordSchema.safeParse("PassWord1").success).toBe(false);
    expect(passwordSchema.safeParse("qwerty123").success).toBe(false);
  });

  it("reports the specific failed rule", () => {
    const result = passwordSchema.safeParse("aaaaaaaa");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("number");
    }
  });
});

// ──────────────────────────────────────
// passwordResetConfirmSchema
// ──────────────────────────────────────

describe("passwordResetConfirmSchema", () => {
  it("accepts a token with a valid password", () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: "some-token",
      password: "securepass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a weak password", () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: "some-token",
      password: "aaaaaaaa",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing token", () => {
    const result = passwordResetConfirmSchema.safeParse({
      password: "securepass1",
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// signupSchema
// ──────────────────────────────────────

describe("signupSchema", () => {
  it("accepts valid coach signup", () => {
    const result = signupSchema.safeParse({
      email: "  Coach@Example.COM  ",
      password: "securepass1",
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
      password: "securepass1",
      name: "Jane",
      inviteToken: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = signupSchema.safeParse({
      password: "securepass1",
      name: "John",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "securepass1",
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
      password: "securepass1",
      name: "",
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass1",
      name: "a".repeat(101),
      role: "COACH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass1",
      name: "John",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when neither role nor inviteToken is provided", () => {
    const result = signupSchema.safeParse({
      email: "test@test.com",
      password: "securepass1",
      name: "John",
    });
    expect(result.success).toBe(false);
  });

  it("accepts coach signup with a waitlist beta token", () => {
    const result = signupSchema.safeParse({
      email: "coach@test.com",
      password: "securepass1",
      name: "John",
      role: "COACH",
      betaToken: "beta-abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.betaToken).toBe("beta-abc123");
    }
  });

  it("still requires role or inviteToken when only betaToken is given", () => {
    const result = signupSchema.safeParse({
      email: "coach@test.com",
      password: "securepass1",
      name: "John",
      betaToken: "beta-abc123",
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
// addWorkoutExerciseSchema
// ──────────────────────────────────────

describe("addWorkoutExerciseSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid workout exercise with all fields", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      trackingType: "REPS",
      sets: 4,
      reps: 6,
      repsMax: 8,
      weight: 80,
      restSeconds: 120,
      coachNotes: "Slow eccentric",
      orderIndex: 0,
      supersetWithPrevious: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal payload (exerciseId only)", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing exerciseId", () => {
    const result = addWorkoutExerciseSchema.safeParse({ sets: 3 });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID exerciseId", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid trackingType", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      trackingType: "DISTANCE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects sets over 20", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      sets: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero or negative sets", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      sets: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      weight: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer reps", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      reps: 8.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative orderIndex", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      orderIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects coachNotes over 1000 characters", () => {
    const result = addWorkoutExerciseSchema.safeParse({
      exerciseId: validUuid,
      coachNotes: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// updateWorkoutExerciseSchema
// ──────────────────────────────────────

describe("updateWorkoutExerciseSchema", () => {
  it("accepts empty object (no-op update)", () => {
    const result = updateWorkoutExerciseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateWorkoutExerciseSchema.safeParse({
      sets: 5,
      reps: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields set to null", () => {
    const result = updateWorkoutExerciseSchema.safeParse({
      repsMax: null,
      weight: null,
      restSeconds: null,
      coachNotes: null,
    });
    expect(result.success).toBe(true);
  });

  it("does not accept exerciseId (immutable after creation)", () => {
    const result = updateWorkoutExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("exerciseId" in result.data).toBe(false);
    }
  });

  it("rejects out-of-range values", () => {
    const result = updateWorkoutExerciseSchema.safeParse({ weight: 1e308 });
    expect(result.success).toBe(false);
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

  it("accepts and trims a personal note", () => {
    const result = createInviteSchema.safeParse({
      note: "  Can't wait to get you started!  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("Can't wait to get you started!");
    }
  });

  it("rejects a note over 280 characters", () => {
    const result = createInviteSchema.safeParse({ note: "x".repeat(281) });
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

describe("waitlistSchema", () => {
  it("accepts an email on its own", () => {
    const result = waitlistSchema.safeParse({ email: "coach@example.com" });
    expect(result.success).toBe(true);
  });

  it("normalizes the email", () => {
    const result = waitlistSchema.safeParse({ email: "  Coach@Example.COM " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("coach@example.com");
  });

  it("accepts attribution alongside the email", () => {
    const result = waitlistSchema.safeParse({
      email: "coach@example.com",
      source: "reddit",
      medium: "social",
      campaign: "retention-post",
      referrer: "https://www.reddit.com/r/personaltraining/",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.source).toBe("reddit");
  });

  it("rejects an over-long attribution value", () => {
    const result = waitlistSchema.safeParse({
      email: "coach@example.com",
      source: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = waitlistSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("waitlistQualifySchema", () => {
  it("accepts a known bucket", () => {
    const result = waitlistQualifySchema.safeParse({
      email: "coach@example.com",
      clientCount: "6-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown bucket", () => {
    const result = waitlistQualifySchema.safeParse({
      email: "coach@example.com",
      clientCount: "loads",
    });
    expect(result.success).toBe(false);
  });

  it("requires the email", () => {
    const result = waitlistQualifySchema.safeParse({ clientCount: "1-5" });
    expect(result.success).toBe(false);
  });
});

describe("waitlistInviteSchema", () => {
  it("accepts a UUID id", () => {
    const result = waitlistInviteSchema.safeParse({
      id: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    const result = waitlistInviteSchema.safeParse({ id: "42" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing id", () => {
    const result = waitlistInviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// feedbackSchema
// ──────────────────────────────────────

describe("feedbackSchema", () => {
  it("accepts a category and message", () => {
    const result = feedbackSchema.safeParse({
      category: "BUG",
      message: "The plan editor loses my superset on save",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional pageUrl", () => {
    const result = feedbackSchema.safeParse({
      category: "IDEA",
      message: "Let me duplicate a week",
      pageUrl: "/coach/plans/abc",
    });
    expect(result.success).toBe(true);
  });

  it("trims the message", () => {
    const result = feedbackSchema.safeParse({
      category: "OTHER",
      message: "  loving it  ",
    });
    expect(result.success && result.data.message).toBe("loving it");
  });

  it("rejects a whitespace-only message", () => {
    const result = feedbackSchema.safeParse({
      category: "OTHER",
      message: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a message over 2000 characters", () => {
    const result = feedbackSchema.safeParse({
      category: "BUG",
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = feedbackSchema.safeParse({
      category: "RANT",
      message: "hello",
    });
    expect(result.success).toBe(false);
  });
});

describe("feedbackStatusSchema", () => {
  it("accepts each lifecycle status", () => {
    for (const status of ["NEW", "REVIEWED", "RESOLVED"]) {
      expect(feedbackStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(feedbackStatusSchema.safeParse({ status: "DONE" }).success).toBe(
      false
    );
  });
});
