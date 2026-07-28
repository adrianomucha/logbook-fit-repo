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
    // Waitlist beta invite — unlocks COACH signup while the beta is closed
    betaToken: z.string().optional(),
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

const trackingTypeEnum = z.enum(["REPS", "TIME"]);

export const createExerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required").max(100),
  category: exerciseCategoryEnum.optional().default("OTHER"),
  trackingType: trackingTypeEnum.optional().default("REPS"),
  defaultSets: z.number().int().min(1).max(20).optional(),
  // Rep count, or seconds when trackingType = TIME (up to 1 hour)
  defaultReps: z.number().int().min(1).max(3600).optional(),
  defaultWeight: z.number().min(0).max(1000).optional(),
  defaultRest: z.number().int().min(0).max(600).optional(),
  instructions: z.string().max(1000).optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: exerciseCategoryEnum.optional(),
  trackingType: trackingTypeEnum.optional(),
  defaultSets: z.number().int().min(1).max(20).optional(),
  defaultReps: z.number().int().min(1).max(3600).optional(),
  defaultWeight: z.number().min(0).max(1000).nullable().optional(),
  defaultRest: z.number().int().min(0).max(600).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
});

// ──────────────────────────────────────
// WORKOUT EXERCISES (coach plan editing)
// ──────────────────────────────────────

export const addWorkoutExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  trackingType: trackingTypeEnum.optional(),
  sets: z.number().int().min(1).max(20).optional(),
  // Rep count, or seconds when trackingType = TIME (up to 1 hour)
  reps: z.number().int().min(1).max(3600).optional(),
  repsMax: z.number().int().min(1).max(3600).nullable().optional(),
  weight: z.number().min(0).max(1000).nullable().optional(),
  restSeconds: z.number().int().min(0).max(600).nullable().optional(),
  coachNotes: z.string().max(1000).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
  supersetWithPrevious: z.boolean().optional(),
});

export const updateWorkoutExerciseSchema = addWorkoutExerciseSchema.omit({
  exerciseId: true,
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

export const checkInScheduleSchema = z.object({
  enabled: z.boolean(),
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
  // Optional for client senders — their only possible recipient is their
  // coach, which the server resolves. Coaches must always specify one.
  recipientId: z.string().uuid().optional(),
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

export const unflagExerciseSchema = z.object({
  workoutExerciseId: z.string().uuid(),
});

// ──────────────────────────────────────
// INVITES
// ──────────────────────────────────────

export const createInviteSchema = z.object({
  email: z.string().email().optional(),
  note: z.string().trim().max(280).optional(),
});

// ──────────────────────────────────────
// WAITLIST
// ──────────────────────────────────────

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const waitlistInviteSchema = z.object({
  id: z.string().uuid(),
});
