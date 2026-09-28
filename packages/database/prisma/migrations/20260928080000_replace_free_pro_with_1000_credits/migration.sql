-- Replace the old codracarys promotional unlimited/Pro override with a finite,
-- auditable one-time credit grant for the two requested accounts.
--
-- Safety properties:
-- - Existing balances are incremented; never overwritten.
-- - CreditTransaction.idempotencyKey prevents duplicate grants.
-- - A trigger handles either account if its wallet is created after this migration.
-- - The old codracarys unlimited trigger/function are removed.

DROP TRIGGER IF EXISTS "credit_wallet_codracarys_free_pro" ON "CreditWallet";
DROP FUNCTION IF EXISTS "grant_codracarys_free_pro"();

UPDATE "CreditWallet" AS wallet
SET "unlimited" = false,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "User" AS app_user
WHERE wallet."userId" = app_user."id"
  AND lower(app_user."email") = lower('codracarys@gmail.com')
  AND wallet."unlimited" = true;

CREATE OR REPLACE FUNCTION "grant_requested_promotional_1000_credits"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_email text;
  grant_key text;
BEGIN
  SELECT lower(app_user."email")
  INTO target_email
  FROM "User" AS app_user
  WHERE app_user."id" = NEW."userId";

  IF target_email NOT IN (
    lower('codracarys@gmail.com'),
    lower('cengizyildiz@ranvals.com')
  ) THEN
    RETURN NEW;
  END IF;

  grant_key := 'admin:promotional-1000:' || NEW."userId" || ':v1';

  IF NOT EXISTS (
    SELECT 1
    FROM "CreditTransaction"
    WHERE "idempotencyKey" = grant_key
  ) THEN
    INSERT INTO "CreditTransaction" (
      "id",
      "userId",
      "type",
      "status",
      "amount",
      "availableAfter",
      "reservedAfter",
      "referenceType",
      "referenceId",
      "idempotencyKey",
      "description",
      "createdAt",
      "completedAt"
    )
    VALUES (
      (
        substr(md5(grant_key), 1, 8) || '-' ||
        substr(md5(grant_key), 9, 4) || '-' ||
        substr(md5(grant_key), 13, 4) || '-' ||
        substr(md5(grant_key), 17, 4) || '-' ||
        substr(md5(grant_key), 21, 12)
      )::uuid,
      NEW."userId",
      'ADMIN_ADJUSTMENT',
      'COMPLETED',
      1000,
      NEW."available" + 1000,
      NEW."reserved",
      'PROMOTIONAL_CREDIT',
      target_email,
      grant_key,
      'BirKare AI promosyon 1000 kredi',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    UPDATE "CreditWallet"
    SET "available" = "available" + 1000,
        "lifetimeEarned" = "lifetimeEarned" + 1000,
        "version" = "version" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = NEW."userId";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "credit_wallet_requested_promotional_1000" ON "CreditWallet";

CREATE TRIGGER "credit_wallet_requested_promotional_1000"
AFTER INSERT ON "CreditWallet"
FOR EACH ROW
EXECUTE FUNCTION "grant_requested_promotional_1000_credits"();

WITH target_users AS (
  SELECT app_user."id" AS "userId", lower(app_user."email") AS email
  FROM "User" AS app_user
  WHERE lower(app_user."email") IN (
    lower('codracarys@gmail.com'),
    lower('cengizyildiz@ranvals.com')
  )
),
inserted AS (
  INSERT INTO "CreditTransaction" (
    "id",
    "userId",
    "type",
    "status",
    "amount",
    "availableAfter",
    "reservedAfter",
    "referenceType",
    "referenceId",
    "idempotencyKey",
    "description",
    "createdAt",
    "completedAt"
  )
  SELECT
    (
      substr(md5('admin:promotional-1000:' || target."userId" || ':v1'), 1, 8) || '-' ||
      substr(md5('admin:promotional-1000:' || target."userId" || ':v1'), 9, 4) || '-' ||
      substr(md5('admin:promotional-1000:' || target."userId" || ':v1'), 13, 4) || '-' ||
      substr(md5('admin:promotional-1000:' || target."userId" || ':v1'), 17, 4) || '-' ||
      substr(md5('admin:promotional-1000:' || target."userId" || ':v1'), 21, 12)
    )::uuid,
    target."userId",
    'ADMIN_ADJUSTMENT',
    'COMPLETED',
    1000,
    wallet."available" + 1000,
    wallet."reserved",
    'PROMOTIONAL_CREDIT',
    target.email,
    'admin:promotional-1000:' || target."userId" || ':v1',
    'BirKare AI promosyon 1000 kredi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM target_users AS target
  JOIN "CreditWallet" AS wallet ON wallet."userId" = target."userId"
  ON CONFLICT ("idempotencyKey") DO NOTHING
  RETURNING "userId", "amount"
)
UPDATE "CreditWallet" AS wallet
SET "available" = wallet."available" + inserted."amount",
    "lifetimeEarned" = wallet."lifetimeEarned" + inserted."amount",
    "version" = wallet."version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
FROM inserted
WHERE wallet."userId" = inserted."userId";
