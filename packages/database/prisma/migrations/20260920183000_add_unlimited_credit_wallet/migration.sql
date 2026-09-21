ALTER TABLE "CreditWallet"
ADD COLUMN "unlimited" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CreditWallet" AS wallet
SET "unlimited" = true
FROM "User" AS app_user
WHERE wallet."userId" = app_user."id"
  AND lower(app_user."email") = lower('cengizyildiz@ranvals.com');
