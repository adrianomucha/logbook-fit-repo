-- When a client invite was last emailed to its address. Invites used to be
-- share-the-link only; the coach can now have Logbook email it. Null for
-- every existing invite: none of them were ever emailed.
ALTER TABLE "client_invites"
    ADD COLUMN "emailSentAt" TIMESTAMP(3);
