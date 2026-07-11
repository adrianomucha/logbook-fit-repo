-- Pin the trigger function's search_path so table references always resolve
-- in public regardless of the calling role's search_path (closes the
-- function_search_path_mutable security lint). Idempotent.
ALTER FUNCTION validate_workout_completion_plan_consistency() SET search_path = public;
