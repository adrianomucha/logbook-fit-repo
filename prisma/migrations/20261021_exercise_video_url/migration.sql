-- A demo video link on each library exercise. The coach sets it once and
-- every workout that uses the exercise shows it, across plans and clients.
ALTER TABLE "exercises"
    ADD COLUMN "videoUrl" TEXT;
