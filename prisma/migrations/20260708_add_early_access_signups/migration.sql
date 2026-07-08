-- Early-access / waitlist capture for the public marketing landing page.
-- Standalone table (no relations to the auth graph): a visitor leaves an email
-- before they have an account. Email is unique so re-submitting is idempotent.

-- CreateEnum
CREATE TYPE "EarlyAccessRole" AS ENUM ('COACH', 'CLIENT');

-- CreateTable
CREATE TABLE "early_access_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "EarlyAccessRole",
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "early_access_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_access_signups_email_key" ON "early_access_signups"("email");

-- CreateIndex
CREATE INDEX "early_access_signups_createdAt_idx" ON "early_access_signups"("createdAt");
