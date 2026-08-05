-- Clone-on-assign (20260714_plan_instances) gives every client their own copy
-- of a plan, and the copy deliberately keeps the template's name. The hardening
-- index still enforced name uniqueness across ALL of a coach's active plans,
-- so the very first clone collided with its own template and every assignment
-- failed on a duplicate key.
--
-- Narrow the index to templates — the same rule the API already applies, where
-- POST /api/plans scopes its duplicate-name check to sourceTemplateId: null.
-- Coaches still can't have two templates with the same name; their clients'
-- copies are simply no longer counted against it.
--
-- Note for future hardening re-asserts: 20260227_db_hardening and
-- 20260612_reassert_db_hardening both create this index with the older, wider
-- predicate under IF NOT EXISTS. Any new re-assert must copy the predicate
-- below, or it will silently reintroduce this bug.

DROP INDEX IF EXISTS "plans_coach_name_active_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "plans_coach_name_active_unique"
  ON "plans" ("coachId", "name")
  WHERE "deletedAt" IS NULL AND "sourceTemplateId" IS NULL;
