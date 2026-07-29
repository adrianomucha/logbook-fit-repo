-- Owner-managed pairing between two accounts belonging to the same person
-- (their coach account and their client/training account), stored
-- symmetrically on both rows. Powers the nav's one-click account switch.
-- Written only by the owner (SQL/admin) — no user-facing API sets it.
ALTER TABLE "users" ADD COLUMN "linkedUserId" TEXT;
CREATE UNIQUE INDEX "users_linkedUserId_key" ON "users"("linkedUserId");
