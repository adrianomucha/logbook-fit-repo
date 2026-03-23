-- Replace weekday-indexed days (dayNumber 1-7, isRestDay) with sequential ordering.
-- Only workout days survive; rest days are deleted (they have no exercises or completions).

-- Step 1: Add orderIndex column (nullable initially)
ALTER TABLE "days" ADD COLUMN "orderIndex" INT;

-- Step 2: Assign sequential orderIndex to non-rest workout days per week
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "weekId" ORDER BY "dayNumber" ASC) AS idx
  FROM "days"
  WHERE "isRestDay" = false
)
UPDATE "days" SET "orderIndex" = ranked.idx
FROM ranked WHERE "days".id = ranked.id;

-- Step 3: Delete rest-day records (cascade handles workout_exercises, completions)
DELETE FROM "days" WHERE "isRestDay" = true;

-- Step 4: Make orderIndex NOT NULL
ALTER TABLE "days" ALTER COLUMN "orderIndex" SET NOT NULL;

-- Step 5: Drop old unique constraint and create new one
DROP INDEX IF EXISTS "days_weekId_dayNumber_key";
CREATE UNIQUE INDEX "days_weekId_orderIndex_key" ON "days"("weekId", "orderIndex");

-- Step 6: Drop old columns
ALTER TABLE "days" DROP COLUMN "dayNumber";
ALTER TABLE "days" DROP COLUMN "isRestDay";
