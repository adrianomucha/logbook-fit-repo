-- Web Push endpoints, one row per browser/device that opted in.
-- `endpoint` is the push service URL for that device and is globally unique,
-- so re-subscribing the same device updates the row instead of stacking.
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

ALTER TABLE "push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as every other table (see 20260711_enable_rls): the app reaches
-- Postgres as the table owner through Prisma, so enabling RLS with no policies
-- just closes Supabase's auto-generated PostgREST surface to anon/authenticated.
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
