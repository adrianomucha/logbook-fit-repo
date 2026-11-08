-- Replaces sessionsValidAfter (20261106_sessions_valid_after) before it was
-- ever used: a timestamp cutoff left a window where a login made earlier in
-- the same instant as a password change still counted as valid. An exact
-- counter has no window. Logins record the version they were issued under,
-- and a password change or reset increments it (see lib/session-validity.ts).
-- Every account starts at 0, which is what logins from before this column
-- read as, so existing sessions keep working until the next password change.
ALTER TABLE "users"
    ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users"
    DROP COLUMN "sessionsValidAfter";
