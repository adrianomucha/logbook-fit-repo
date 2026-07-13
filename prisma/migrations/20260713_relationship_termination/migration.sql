-- Relationship termination: either side can end the coaching relationship
-- (coach terminates the client, or the client unsubscribes). The row is kept
-- with status INACTIVE as history; these columns record when and by whom.
-- Additive and nullable: existing rows are unaffected.
ALTER TABLE "coach_client_relationships"
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "endedBy" "UserRole";
