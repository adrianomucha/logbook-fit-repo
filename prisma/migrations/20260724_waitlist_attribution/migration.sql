-- Waitlist attribution and qualification.
--
-- `source`/`medium`/`campaign`/`referrer` record where a signup came from so
-- traffic can be judged per channel — without them a launch across several
-- channels produces one number and no way to tell which channel earned it.
--
-- `clientCount` holds the qualifying answer collected on the confirmation
-- screen (how many clients the coach runs today), used to order early-access
-- batches and to tell real coaches apart from curious lifters.
--
-- Column names stay camelCase to match the existing table ("createdAt").
-- All additive and nullable: existing entries are unaffected.
ALTER TABLE "waitlist_entries" ADD COLUMN "source" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "medium" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "campaign" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "referrer" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "clientCount" TEXT;
