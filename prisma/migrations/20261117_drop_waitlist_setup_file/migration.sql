-- The spreadsheet upload on the waitlist confirmation was replaced by a
-- pointer to the in-app importer: coaches get their invite on booking, so
-- they import their program themselves before the setup call. Nothing reads
-- these columns any more.
ALTER TABLE "waitlist_entries"
  DROP COLUMN "setupFilePath",
  DROP COLUMN "setupFileName",
  DROP COLUMN "setupFileUploadedAt";
