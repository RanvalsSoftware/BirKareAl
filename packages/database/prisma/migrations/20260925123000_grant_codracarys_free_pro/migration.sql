-- Idempotent server-side promotional access for the requested account.
-- `unlimited` also bypasses the verified RevenueCat Pro gate in the API;
-- clients cannot set or modify this database-owned flag.
UPDATE "CreditWallet" AS wallet
SET "unlimited" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "User" AS app_user
WHERE wallet."userId" = app_user."id"
  AND lower(app_user."email") = lower('codracarys@gmail.com')
  AND wallet."unlimited" = false;
