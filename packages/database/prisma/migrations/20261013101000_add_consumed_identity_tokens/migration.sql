-- Single-use registry for Google/Apple ID tokens (replay protection). Rows are
-- kept only until the token's own expiry and pruned by the API.
CREATE TABLE IF NOT EXISTS "ConsumedIdentityToken" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumedIdentityToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsumedIdentityToken_provider_tokenKey_key"
  ON "ConsumedIdentityToken"("provider", "tokenKey");

CREATE INDEX IF NOT EXISTS "ConsumedIdentityToken_expiresAt_idx"
  ON "ConsumedIdentityToken"("expiresAt");
