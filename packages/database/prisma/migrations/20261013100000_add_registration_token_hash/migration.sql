-- Binds a pending (unverified) password registration to the client that
-- submitted it. Stores only a SHA-256 hash; cleared when the e-mail is verified.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationTokenHash" TEXT;
