-- Add description column to days table (coach's workout briefing for clients)
ALTER TABLE "days" ADD COLUMN IF NOT EXISTS "description" TEXT;
