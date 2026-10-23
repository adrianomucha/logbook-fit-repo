-- At most one unanswered (PENDING) check-in per coach-client pair.
--
-- Every path that creates a check-in (the nightly sweep, the coach's
-- workspace, the client's app, a manual send) first checks that nothing is
-- open and then inserts, with no lock in between. Two of them landing on the
-- same due client at the same moment could both see nothing open and both
-- insert. Every insert is PENDING, so this is where the race lands; the
-- application treats the unique violation as "someone else just sent it"
-- (see isDuplicatePendingCheckIn in src/lib/checkin-schedule.ts).
--
-- Not expressible in schema.prisma (partial index), same as
-- plans_coach_name_active_unique.

-- Any duplicates that already slipped through: keep the newest, close the
-- older ones out as EXPIRED. They were never answered and the UI only ever
-- showed the newest, so nothing anyone saw goes missing.
UPDATE "check_ins" AS c
SET "status" = 'EXPIRED', "updatedAt" = NOW()
WHERE c."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "check_ins" AS n
    WHERE n."coachId" = c."coachId"
      AND n."clientId" = c."clientId"
      AND n."status" = 'PENDING'
      AND (n."createdAt" > c."createdAt"
        OR (n."createdAt" = c."createdAt" AND n."id" > c."id"))
  );

CREATE UNIQUE INDEX "check_ins_one_pending_per_pair"
  ON "check_ins" ("coachId", "clientId")
  WHERE "status" = 'PENDING';
