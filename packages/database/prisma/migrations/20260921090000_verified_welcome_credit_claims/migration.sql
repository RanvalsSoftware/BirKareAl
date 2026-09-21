CREATE TABLE "WelcomeCreditClaim" (
    "id" TEXT NOT NULL,
    "abuseKeyHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelcomeCreditClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WelcomeCreditClaim_abuseKeyHash_key"
ON "WelcomeCreditClaim"("abuseKeyHash");

CREATE INDEX "WelcomeCreditClaim_userId_idx"
ON "WelcomeCreditClaim"("userId");

-- Existing welcome transactions predate abuse fingerprints. User-level
-- idempotency still prevents a second grant during migration; new grants are
-- additionally protected by the claim table above.
