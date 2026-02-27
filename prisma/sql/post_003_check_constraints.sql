-- Ensure orderIndex values are non-negative.
-- The Prisma @@unique handles collision prevention, but this check
-- constraint guarantees orderIndex is non-negative.

DO $$
BEGIN
  ALTER TABLE "workout_exercises"
    ADD CONSTRAINT "workout_exercises_order_positive"
    CHECK ("orderIndex" >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
