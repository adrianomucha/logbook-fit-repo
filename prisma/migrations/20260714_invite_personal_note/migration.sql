-- Personal invite notes: a coach can attach a short message to an invite.
-- The invited client sees it on the signup landing page, and on acceptance
-- it becomes the coach's first chat message — the relationship starts with
-- the coach's own words instead of software copy. Additive and nullable:
-- existing invites are unaffected.
ALTER TABLE "client_invites" ADD COLUMN "note" TEXT;
