import { z } from "zod";

// ──────────────────────────────────────
// AUTH
// ──────────────────────────────────────

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required").max(100),
    role: z.enum(["COACH", "CLIENT"]).optional(),
    inviteToken: z.string().optional(),
  })
  .refine((data) => data.role || data.inviteToken, {
    message: "Either role or inviteToken must be provided",
    path: ["role"],
  });

// ──────────────────────────────────────
// EXERCISES
// ──────────────────────────────────────

const exerciseCategoryEnum = z.enum([
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "GLUTES",
  "CORE",
  "CARDIO",
  "FULL_BODY",
  "OTHER",
]);

export const createExerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required").max(100),
  category: exerciseCategoryEnum.optional().default("OTHER"),
  defaultSets: z.number().int().min(1).max(20).optional(),
  defaultReps: z.number().int().min(1).max(100).optional(),
  defaultWeight: z.number().min(0).max(1000).optional(),
  defaultRest: z.number().int().min(0).max(600).optional(),
  instructions: z.string().max(1000).optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: exerciseCategoryEnum.optional(),
  defaultSets: z.number().int().min(1).max(20).optional(),
  defaultReps: z.number().int().min(1).max(100).optional(),
  defaultWeight: z.number().min(0).max(1000).nullable().optional(),
  defaultRest: z.number().int().min(0).max(600).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
});

// ──────────────────────────────────────
// CHECK-INS
// ──────────────────────────────────────

export const createCheckInSchema = z.object({
  clientProfileId: z.string().uuid(),
});

const effortRatingEnum = z.enum(["EASY", "MEDIUM", "HARD"]);

export const clientRespondSchema = z.object({
  effortRating: effortRatingEnum.optional(),
  painBlockers: z.string().max(1000).optional(),
  clientFeeling: z.string().max(1000).optional(),
});

export const coachRespondSchema = z.object({
  coachFeedback: z.string().max(2000).optional(),
  planAdjustment: z.boolean().optional(),
});

// ──────────────────────────────────────
// PLANS
// ──────────────────────────────────────

export const createPlanSchema = z.object({
  name: z.string().min(3, "Plan name must be at least 3 characters").max(50),
  description: z.string().max(200).optional().default(""),
  emoji: z.string().max(10).optional(),
  durationWeeks: z.number().int().min(1).max(12).optional().default(4),
  workoutsPerWeek: z.number().int().min(1).max(7).optional().default(4),
});

export const assignPlanSchema = z.object({
  clientProfileId: z.string().uuid(),
});

// ──────────────────────────────────────
// MESSAGES
// ──────────────────────────────────────

export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1, "Message cannot be empty").max(5000),
  workoutReferenceId: z.string().uuid().optional(),
  exerciseReferenceId: z.string().uuid().optional(),
});

// ──────────────────────────────────────
// WORKOUTS
// ──────────────────────────────────────

export const startWorkoutSchema = z.object({
  dayId: z.string().uuid(),
});

export const finishWorkoutSchema = z.object({
  effortRating: effortRatingEnum.optional(),
});

export const updateSetsSchema = z.object({
  sets: z
    .array(
      z.object({
        workoutExerciseId: z.string().uuid(),
        setNumber: z.number().int().min(1),
        completed: z.boolean(),
        actualWeight: z.number().min(0).optional(),
        actualReps: z.number().int().min(0).optional(),
      })
    )
    .min(1)
    .max(100),
});

export const flagExerciseSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// ──────────────────────────────────────
// INVITES
// ──────────────────────────────────────

export const createInviteSchema = z.object({
  email: z.string().email().optional(),
});
