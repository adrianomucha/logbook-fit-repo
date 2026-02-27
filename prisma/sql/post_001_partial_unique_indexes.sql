-- Partial unique indexes scoped to active (non-deleted) rows.
-- Without these, soft-deleted users can't re-register emails
-- and coaches can't recreate retired exercise names.

-- Users: email uniqueness only for active rows
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_unique"
  ON "users" ("email")
  WHERE "deletedAt" IS NULL;

-- Exercises: name uniqueness per coach only for active rows
CREATE UNIQUE INDEX IF NOT EXISTS "exercises_coach_name_active_unique"
  ON "exercises" ("coachId", "name")
  WHERE "deletedAt" IS NULL;

-- Plans: no duplicate plan names per coach for active plans
CREATE UNIQUE INDEX IF NOT EXISTS "plans_coach_name_active_unique"
  ON "plans" ("coachId", "name")
  WHERE "deletedAt" IS NULL;
