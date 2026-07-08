-- Early-access waitlist signups collected from the public landing page.
CREATE TABLE "early_access_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "early_access_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "early_access_signups_email_key" ON "early_access_signups"("email");
