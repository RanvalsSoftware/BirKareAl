CREATE TYPE "ConsentEventAction" AS ENUM ('GRANTED', 'REVOKED');

ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'NOTICE';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'IMAGE_PROCESSING_EXPLICIT';

ALTER TYPE "ConsentSource" ADD VALUE IF NOT EXISTS 'FIRST_IMAGE_UPLOAD';
ALTER TYPE "ConsentSource" ADD VALUE IF NOT EXISTS 'PRE_GENERATION';
ALTER TYPE "ConsentSource" ADD VALUE IF NOT EXISTS 'SETTINGS';

CREATE TABLE "UserConsentEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ConsentType" NOT NULL,
  "version" TEXT NOT NULL,
  "action" "ConsentEventAction" NOT NULL,
  "source" "ConsentSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserConsentEvent_userId_type_createdAt_idx"
  ON "UserConsentEvent"("userId", "type", "createdAt");

ALTER TABLE "UserConsentEvent"
  ADD CONSTRAINT "UserConsentEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
