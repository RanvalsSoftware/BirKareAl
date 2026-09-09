-- A welcome credit is an account entitlement, not an onboarding/device
-- entitlement. Backfill one deterministic idempotency key per existing user;
-- CreditTransaction_idempotencyKey_key then prevents the grant from ever
-- being inserted again for that same immutable user id.
--
-- If historical duplicate welcome rows exist, keep the financial audit rows
-- untouched and bind the key to the earliest grant. We deliberately do not
-- rewrite wallet balances or delete ledger history in this migration.
WITH ranked_welcome_credits AS (
  SELECT
    "id",
    "userId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "grantRank"
  FROM "CreditTransaction"
  WHERE "referenceType" = 'WELCOME_CREDIT'
),
canonical_welcome_credits AS (
  SELECT "id", "userId"
  FROM ranked_welcome_credits
  WHERE "grantRank" = 1
)
UPDATE "CreditTransaction" AS credit_tx
SET "idempotencyKey" = 'welcome-credit:' || canonical."userId"
FROM canonical_welcome_credits AS canonical
WHERE credit_tx."id" = canonical."id"
  AND NOT EXISTS (
    SELECT 1
    FROM "CreditTransaction" AS existing
    WHERE existing."idempotencyKey" = 'welcome-credit:' || canonical."userId"
      AND existing."id" <> credit_tx."id"
  );
