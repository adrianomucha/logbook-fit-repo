-- Waitlist invite flow: entries progress PENDING → INVITED → JOINED.
-- "inviteToken" is a single-use beta-invite credential generated in
-- application code (crypto.randomBytes, 256 bits — same approach as
-- client_invites.token). Re-inviting rotates the token, so the old
-- emailed link stops working. Additive with a PENDING default: existing
-- rows and already-deployed code are unaffected.
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'INVITED', 'JOINED');

ALTER TABLE "waitlist_entries" ADD COLUMN "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "waitlist_entries" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "waitlist_entries" ADD COLUMN "joinedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "waitlist_entries_inviteToken_key" ON "waitlist_entries"("inviteToken");
