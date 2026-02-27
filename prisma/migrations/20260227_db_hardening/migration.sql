-- DB Hardening: partial unique indexes, workout completion trigger, check constraints
-- All statements are idempotent and safe to re-run.

-- ============================================================
-- 1. Partial unique indexes (soft-delete aware)
-- ============================================================

-- Users: case-insensitive email uniqueness for active rows only
DROP INDEX IF EXISTS "users_email_active_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_unique"
  ON "users" (LOWER("email"))
  WHERE "deletedAt" IS NULL;

-- Exercises: name uniqueness per coach for active rows only
CREATE UNIQUE INDEX IF NOT EXISTS "exercises_coach_name_active_unique"
  ON "exercises" ("coachId", "name")
  WHERE "deletedAt" IS NULL;

-- Plans: name uniqueness per coach for active plans only
CREATE UNIQUE INDEX IF NOT EXISTS "plans_coach_name_active_unique"
  ON "plans" ("coachId", "name")
  WHERE "deletedAt" IS NULL;

-- ============================================================
-- 2. Workout completion plan-consistency trigger
-- ============================================================

CREATE OR REPLACE FUNCTION validate_workout_completion_plan_consistency()
RETURNS TRIGGER AS $$
DECLARE
  day_plan_id UUID;
BEGIN
  SELECT w."planId" INTO day_plan_id
  FROM "days" d
  JOIN "weeks" w ON d."weekId" = w."id"
  WHERE d."id" = NEW."dayId";

  IF day_plan_id IS NULL THEN
    RAISE EXCEPTION 'Day % does not exist', NEW."dayId";
  END IF;

  IF day_plan_id != NEW."planId" THEN
    RAISE EXCEPTION 'Plan mismatch: dayId % belongs to plan %, not %',
      NEW."dayId", day_plan_id, NEW."planId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workout_completion_plan_check ON "workout_completions";
CREATE TRIGGER trg_workout_completion_plan_check
  BEFORE INSERT OR UPDATE ON "workout_completions"
  FOR EACH ROW
  EXECUTE FUNCTION validate_workout_completion_plan_consistency();

-- ============================================================
-- 3. Check constraints
-- ============================================================

DO $$
BEGIN
  ALTER TABLE "workout_exercises"
    ADD CONSTRAINT "workout_exercises_order_positive"
    CHECK ("orderIndex" >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
