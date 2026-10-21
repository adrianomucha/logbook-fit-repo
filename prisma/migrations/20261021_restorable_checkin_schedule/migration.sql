-- Ending a relationship used to switch its check-in schedule off, and Restore
-- never switched it back on, so a restored client silently stopped getting
-- check-ins. Ending no longer touches the setting (the schedule only runs for
-- ACTIVE relationships anyway), so Restore brings it back with everything
-- else.
--
-- Relationships ended before this change lost the coach's setting when they
-- were ended. On is the default and what nearly every coach runs, so put them
-- back on: restoring one resumes the schedule like any other. Only Restore
-- reads this for an ended relationship; a fresh invite turns it on anyway.
UPDATE "coach_client_relationships"
SET "checkInScheduleEnabled" = true
WHERE "status" <> 'ACTIVE' AND "checkInScheduleEnabled" = false;
