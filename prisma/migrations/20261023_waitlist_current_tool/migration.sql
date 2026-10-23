-- The waitlist confirmation screen's second question: what the coach runs
-- their coaching on today. Nullable and additive: existing rows and
-- already-deployed code are unaffected.
ALTER TABLE "waitlist_entries" ADD COLUMN "currentTool" TEXT;
