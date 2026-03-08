-- Add emoji and workoutsPerWeek columns to plans table
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "emoji" TEXT NOT NULL DEFAULT '💪';
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "workoutsPerWeek" INTEGER NOT NULL DEFAULT 4;
