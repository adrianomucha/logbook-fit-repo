-- Setup calls booked on Cal.com from the waitlist confirmation screen, and the
-- spreadsheet a coach uploads after booking. Nullable and additive: existing
-- rows and already-deployed code are unaffected.
CREATE TYPE "SetupCallStatus" AS ENUM ('BOOKED', 'CANCELLED');

ALTER TABLE "waitlist_entries"
  ADD COLUMN "callStatus" "SetupCallStatus",
  ADD COLUMN "callStartsAt" TIMESTAMP(3),
  ADD COLUMN "callTimeZone" TEXT,
  ADD COLUMN "callBookingUid" TEXT,
  ADD COLUMN "callBookedAt" TIMESTAMP(3),
  ADD COLUMN "setupFilePath" TEXT,
  ADD COLUMN "setupFileName" TEXT,
  ADD COLUMN "setupFileUploadedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "waitlist_entries_callBookingUid_key" ON "waitlist_entries"("callBookingUid");
