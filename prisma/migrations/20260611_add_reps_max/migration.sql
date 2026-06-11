-- Add an optional upper bound for prescribed rep ranges (e.g. 6-8 → reps=6, repsMax=8).
-- Additive and nullable: existing rows and already-deployed code are unaffected.
ALTER TABLE "workout_exercises" ADD COLUMN "repsMax" INTEGER;
