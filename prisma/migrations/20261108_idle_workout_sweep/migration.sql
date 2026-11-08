-- The idle sweep (lib/idle-workouts.ts) nudges a client whose workout has sat
-- open with nothing logged for a while, then finishes it for them if they never
-- come back. Both columns are null for every existing session: none of them
-- were ever nudged or closed by the sweep.
ALTER TABLE "workout_completions"
    ADD COLUMN "idleReminderSentAt" TIMESTAMP(3),
    ADD COLUMN "autoFinishedAt" TIMESTAMP(3);

-- The sweep reads every IN_PROGRESS session on each run.
CREATE INDEX "workout_completions_status_idx" ON "workout_completions"("status");
