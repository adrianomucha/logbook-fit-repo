-- In-app product feedback, submitted from the account menu's "Send feedback"
-- dialog and reviewed on /admin/feedback.
CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'IDEA', 'OTHER');
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'RESOLVED');

CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" "UserRole" NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "pageUrl" VARCHAR(1000),
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_status_createdAt_idx" ON "feedback"("status", "createdAt");
CREATE INDEX "feedback_userId_idx" ON "feedback"("userId");

-- SET NULL, not CASCADE: feedback is the owner's product-research record and
-- should outlive the reporter's account.
ALTER TABLE "feedback"
    ADD CONSTRAINT "feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same posture as every other table (see 20260711_enable_rls): the app reaches
-- Postgres as the table owner through Prisma, so enabling RLS with no policies
-- just closes Supabase's auto-generated PostgREST surface to anon/authenticated.
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
