CREATE TABLE "AccountDeletion" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "identityHashes" TEXT[] NOT NULL,
  "storageKeys" TEXT[] NOT NULL,
  "notBefore" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AccountDeletion_completedAt_notBefore_idx" ON "AccountDeletion"("completedAt", "notBefore");
CREATE INDEX "AccountDeletion_identityHashes_idx" ON "AccountDeletion" USING GIN ("identityHashes");
