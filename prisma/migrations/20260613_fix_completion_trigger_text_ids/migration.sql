-- Fix validate_workout_completion_plan_consistency (from 20260227_db_hardening,
-- re-asserted in 20260612_reassert_db_hardening): id columns are text, so the
-- `day_plan_id UUID` variable made the plan-mismatch comparison fail with
-- 42883 (operator does not exist: uuid <> text) on every workout_completions
-- INSERT/UPDATE in environments built from the migration files.
--
-- Prod already runs this TEXT variant (hot-patched 2026-06-12, verified via
-- pg_proc) — re-running it there is a no-op. This migration exists so fresh
-- databases get the working function.
CREATE OR REPLACE FUNCTION validate_workout_completion_plan_consistency()
RETURNS TRIGGER AS $$
DECLARE
  day_plan_id TEXT;
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
