-- Validates that dayId belongs to the same plan as planId.
-- Prevents silent analytics corruption from mismatched inserts.

CREATE OR REPLACE FUNCTION validate_workout_completion_plan_consistency()
RETURNS TRIGGER AS $$
DECLARE
  day_plan_id UUID;
BEGIN
  -- Resolve the plan that owns this day: day -> week -> plan
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

-- Idempotent: drop then create (CREATE OR REPLACE not available for triggers)
DROP TRIGGER IF EXISTS trg_workout_completion_plan_check ON "workout_completions";
CREATE TRIGGER trg_workout_completion_plan_check
  BEFORE INSERT OR UPDATE ON "workout_completions"
  FOR EACH ROW
  EXECUTE FUNCTION validate_workout_completion_plan_consistency();
