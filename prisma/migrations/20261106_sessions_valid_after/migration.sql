-- Logins that signed in before this moment are refused (see User in
-- schema.prisma). Set when a password is changed or reset, so the change
-- signs out every other device. Null means "no cutoff", which is every
-- existing account until its next password change.
ALTER TABLE "users"
    ADD COLUMN "sessionsValidAfter" TIMESTAMP(3);
