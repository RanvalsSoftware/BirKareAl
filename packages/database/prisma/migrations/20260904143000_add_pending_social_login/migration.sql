-- CreateTable
CREATE TABLE "PendingSocialLogin" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSocialLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSocialLogin_tokenHash_key" ON "PendingSocialLogin"("tokenHash");

-- CreateIndex
CREATE INDEX "PendingSocialLogin_provider_providerAccountId_idx" ON "PendingSocialLogin"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "PendingSocialLogin_expiresAt_idx" ON "PendingSocialLogin"("expiresAt");
