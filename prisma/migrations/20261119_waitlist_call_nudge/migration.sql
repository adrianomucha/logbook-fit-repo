-- When the one-time "book your setup call" reminder went out to a waitlist
-- coach who didn't book. Nullable and additive: existing rows and
-- already-deployed code are unaffected.
ALTER TABLE "waitlist_entries" ADD COLUMN "callNudgedAt" TIMESTAMP(3);
