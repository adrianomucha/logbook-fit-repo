-- Support time-based exercises (planks, carries, cardio intervals).
-- When "trackingType" = 'TIME', the reps-shaped integer columns
-- (exercises.defaultReps, workout_exercises.reps/repsMax, set_completions.actualReps)
-- hold a duration in seconds instead of a rep count.
-- Additive with a REPS default: existing rows and already-deployed code are unaffected.
CREATE TYPE "TrackingType" AS ENUM ('REPS', 'TIME');
ALTER TABLE "exercises" ADD COLUMN "trackingType" "TrackingType" NOT NULL DEFAULT 'REPS';
ALTER TABLE "workout_exercises" ADD COLUMN "trackingType" "TrackingType" NOT NULL DEFAULT 'REPS';
