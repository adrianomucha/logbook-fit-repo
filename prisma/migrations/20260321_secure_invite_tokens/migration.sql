-- AlterTable: Remove default UUID generation from invite tokens.
-- Tokens are now generated in application code using crypto.randomBytes()
-- for 256 bits of entropy (vs UUID v4's 122 bits).
ALTER TABLE "client_invites" ALTER COLUMN "token" DROP DEFAULT;
