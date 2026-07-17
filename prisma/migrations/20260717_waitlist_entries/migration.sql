-- Early-access waitlist signups from the public /waitlist page.
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- Invites go out strictly in signup order
CREATE INDEX "waitlist_entries_createdAt_idx" ON "waitlist_entries"("createdAt");

-- Same posture as every other table (see 20260711_enable_rls): the app writes
-- through Prisma as the table owner, so enabling RLS with no policies just
-- closes Supabase's PostgREST surface to the anon/authenticated roles.
ALTER TABLE "waitlist_entries" ENABLE ROW LEVEL SECURITY;
