-- Weekly check-in automation flag on the coach-client relationship.
-- When enabled, a new check-in is auto-created (lazily, on data access)
-- once 7 days have passed since the most recent one.
ALTER TABLE "coach_client_relationships"
  ADD COLUMN "checkInScheduleEnabled" BOOLEAN NOT NULL DEFAULT false;
