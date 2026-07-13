-- Sample-client mode: coaches can spawn a demo client with generated history
-- to explore the dashboard and check-in loop before a real client joins.
-- The flag marks those profiles so the UI can badge them and offer one-action
-- removal. Additive with a false default: existing rows are unaffected.
ALTER TABLE "client_profiles" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
