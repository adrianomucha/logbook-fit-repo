-- Relationship termination: either side can end the coaching relationship
-- (coach terminates the client, or the client unsubscribes). The row is kept
-- with status INACTIVE as history; these columns record when and by whom.
-- Additive and nullable: existing rows are unaffected.
-- IF NOT EXISTS: preview deployments run new code against the shared DB
-- before migrate deploy runs there, so this may be applied out-of-band first.
ALTER TABLE "coach_client_relationships"
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endedBy" "UserRole";

-- Snapshot of the plan assignment at termination time so Restore can put the
-- client back exactly where they left off. Deliberately no FK — the plan may
-- be soft- or hard-deleted while the relationship sits in the archive.
ALTER TABLE "coach_client_relationships"
  ADD COLUMN IF NOT EXISTS "endedPlanId" TEXT,
  ADD COLUMN IF NOT EXISTS "endedPlanStartDate" TIMESTAMP(3);
