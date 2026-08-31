-- Coach-configurable check-in cadence on the relationship. Until now the
-- auto-schedule was a hardcoded 7 days with no way to change it — a coach
-- could only turn the loop on or off.
--
-- "checkInIntervalDays": a new check-in is due this many days after the last.
-- "checkInDayOfWeek": optional anchor weekday (0 = Sunday … 6 = Saturday,
-- UTC); NULL keeps today's behaviour of sending whenever the interval elapses.
-- Existing relationships keep their current weekly cadence via the default.
ALTER TABLE "coach_client_relationships"
  ADD COLUMN "checkInIntervalDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "checkInDayOfWeek" INTEGER;
