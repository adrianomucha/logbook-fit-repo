-- Durable record of scheduled-job invocations, written by the job itself so
-- /admin/health can tell a cron that silently stopped from one that ran.
CREATE TABLE "cron_runs" (
    "id" TEXT NOT NULL,
    "job" VARCHAR(64) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "summary" JSONB,
    "error" VARCHAR(2000),

    CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cron_runs_job_startedAt_idx" ON "cron_runs"("job", "startedAt");

-- Same posture as every other table (see 20260711_enable_rls): the app reaches
-- Postgres as the table owner through Prisma, so enabling RLS with no policies
-- just closes Supabase's auto-generated PostgREST surface to anon/authenticated.
ALTER TABLE "cron_runs" ENABLE ROW LEVEL SECURITY;
