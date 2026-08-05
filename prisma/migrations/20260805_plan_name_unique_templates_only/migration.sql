-- Scope the plan-name uniqueness rule to TEMPLATES.
--
-- The index dates from before clone-on-assign (20260714_plan_instances). Since
-- that change every assignment creates a client's own copy carrying the
-- template's name, so `(coachId, name)` across all live plans is violated by
-- the second copy of any plan — assigning one plan to two clients, or running
-- a finished block again, fails with a unique-constraint error.
--
-- The application layer already treats this as a template-only rule (see
-- POST /api/plans: "client instances share their template's name by design").
-- This makes the database agree: duplicate names are still refused on the
-- Plans page, and are expected among client copies.
DROP INDEX IF EXISTS "plans_coach_name_active_unique";

CREATE UNIQUE INDEX "plans_coach_name_active_unique"
  ON "plans" ("coachId", "name")
  WHERE "deletedAt" IS NULL AND "sourceTemplateId" IS NULL;
