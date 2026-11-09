-- When this account first signed in from the native app; null means never.
-- The web reads it to stop offering its Home Screen install to a client who
-- already has the real app (see lib/native-app.ts).
ALTER TABLE "users"
    ADD COLUMN "nativeAppFirstSeenAt" TIMESTAMP(3);

-- Accounts already on the native app, as far as existing data can tell: a
-- device registered for native push. Everyone else is picked up the next time
-- they open the app.
UPDATE "users" u
SET "nativeAppFirstSeenAt" = s."firstSeen"
FROM (
    SELECT "userId", MIN("createdAt") AS "firstSeen"
    FROM "push_subscriptions"
    WHERE "provider" = 'EXPO'
    GROUP BY "userId"
) s
WHERE u."id" = s."userId";
