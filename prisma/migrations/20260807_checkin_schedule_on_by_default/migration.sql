-- Weekly check-ins are the product's core retention loop, but the schedule
-- shipped default-off behind a third-level tab, so in practice it was never
-- on. Now that a nightly cron actually sends them (/api/cron/check-ins),
-- default it on for new relationships.
ALTER TABLE "coach_client_relationships"
  ALTER COLUMN "checkInScheduleEnabled" SET DEFAULT true;

-- Existing live relationships opted into nothing — they were created under a
-- default they never saw. Bring them onto the schedule too, but only the
-- active ones: an archived relationship must stay dormant so restoring a past
-- client doesn't immediately fire a check-in at them.
UPDATE "coach_client_relationships"
SET "checkInScheduleEnabled" = true
WHERE "status" = 'ACTIVE' AND "checkInScheduleEnabled" = false;
