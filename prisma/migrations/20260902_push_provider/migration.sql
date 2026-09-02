-- Native-app push. `provider` says which transport a row belongs to: WEB rows
-- are browser Web Push subscriptions (push-service URL + encryption keys);
-- EXPO rows hold an Expo push token in `endpoint` and carry no keys.
CREATE TYPE "PushProvider" AS ENUM ('WEB', 'EXPO');

ALTER TABLE "push_subscriptions"
    ADD COLUMN "provider" "PushProvider" NOT NULL DEFAULT 'WEB';

ALTER TABLE "push_subscriptions"
    ALTER COLUMN "p256dh" DROP NOT NULL,
    ALTER COLUMN "auth" DROP NOT NULL;

-- The keys are what makes a Web Push row deliverable, so the column-level
-- NOT NULL they used to have becomes a per-provider rule.
ALTER TABLE "push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_web_keys_check"
    CHECK ("provider" <> 'WEB' OR ("p256dh" IS NOT NULL AND "auth" IS NOT NULL));
