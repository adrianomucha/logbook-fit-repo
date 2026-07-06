-- Superset support: a workout exercise can be chained to the exercise directly
-- above it (by orderIndex) to form a superset group. Consecutive chained rows
-- collapse into one group; the first exercise of a day is always a chain start.
-- Additive with a default: existing rows and already-deployed code are unaffected.
ALTER TABLE "workout_exercises" ADD COLUMN "supersetWithPrevious" BOOLEAN NOT NULL DEFAULT false;
