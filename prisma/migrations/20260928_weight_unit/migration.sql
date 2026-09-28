-- Each person's kg/lb preference. Weights stay stored in pounds everywhere;
-- the apps convert to this unit for display and back on input. Existing
-- accounts default to LB, the label coaches have always seen in the editor.
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

ALTER TABLE "users"
    ADD COLUMN "weightUnit" "WeightUnit" NOT NULL DEFAULT 'LB';
