import { z } from "zod";

// ──────────────────────────────────────
// AUTH
// ──────────────────────────────────────

/**
 * Passwords that satisfy the letter+number rule yet still top every breach
 * corpus. Compared case-insensitively; purely alphabetic or numeric staples
 * ("password", "12345678") are already caught by the character rules.
 */
const COMMON_PASSWORDS = new Set([
  "password1",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "qwerty123",
  "qwerty12345",
  "abc12345",
  "abcd1234",
  "letmein1",
  "welcome1",
  "welcome123",
  "iloveyou1",
  "sunshine1",
  "monkey123",
  "dragon123",
  "football1",
  "baseball1",
  "superman1",
  "trustno1",
  "1q2w3e4r",
  "1qaz2wsx",
  "123456789a",
  "a1234567",
  "aa123456",
]);

/** Shared with the live password checklist in the auth forms. */
export const isCommonPassword = (password: string) =>
  COMMON_PASSWORDS.has(password.toLowerCase());

/** bcrypt reads BYTES, so multi-byte characters count more than once. */
export const passwordByteLength = (password: string) =>
  new TextEncoder().encode(password).length;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/**
 * The one rule set for every place a user picks a password (signup, reset).
 * The 72 limit is bcrypt's input size in BYTES — anything longer is silently
 * truncated at hash time, so two "different" passwords would compare equal.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .refine((password) => passwordByteLength(password) <= PASSWORD_MAX_BYTES, {
    message: "Password must be at most 72 characters",
  })
  .refine((password) => !isCommonPassword(password), {
    message: "This password is too common — pick something harder to guess",
  });

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(),
    password: passwordSchema,
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

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
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
// PUSH NOTIFICATIONS
// ──────────────────────────────────────

// Shape produced by PushSubscription.toJSON() in the browser. The endpoint is
// an https URL owned by the browser's push service (FCM, Mozilla, Apple).
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
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

/**
 * Attribution captured alongside a signup. Every field is optional and
 * attacker-controlled, so each is trimmed and hard-capped — these are only
 * ever read back by admins in a CSV, never rendered as HTML.
 */
const attributionValue = z.string().trim().max(120).optional();

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  source: attributionValue,
  medium: attributionValue,
  campaign: attributionValue,
  referrer: z.string().trim().max(300).optional(),
});

/** The buckets offered by the confirmation-screen qualifying question. */
export const WAITLIST_CLIENT_COUNTS = [
  '1-5',
  '6-15',
  '16-30',
  '30+',
  'not-coaching',
] as const;

export const waitlistQualifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  clientCount: z.enum(WAITLIST_CLIENT_COUNTS),
});

export const waitlistInviteSchema = z.object({
  id: z.string().uuid(),
});
