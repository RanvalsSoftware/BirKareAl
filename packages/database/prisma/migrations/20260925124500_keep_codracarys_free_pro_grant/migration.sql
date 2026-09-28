-- The requested Google account may finish social onboarding after this
-- migration is deployed. Grant the database-owned promotional flag both to
-- an existing wallet and to a wallet created later for the same verified
-- account. The trigger cannot be controlled by mobile input.
CREATE OR REPLACE FUNCTION "grant_codracarys_free_pro"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User" AS app_user
    WHERE app_user."id" = NEW."userId"
      AND lower(app_user."email") = lower('codracarys@gmail.com')
  ) THEN
    NEW."unlimited" := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "credit_wallet_codracarys_free_pro" ON "CreditWallet";

CREATE TRIGGER "credit_wallet_codracarys_free_pro"
BEFORE INSERT OR UPDATE OF "userId" ON "CreditWallet"
FOR EACH ROW
EXECUTE FUNCTION "grant_codracarys_free_pro"();

UPDATE "CreditWallet" AS wallet
SET "unlimited" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "User" AS app_user
WHERE wallet."userId" = app_user."id"
  AND lower(app_user."email") = lower('codracarys@gmail.com')
  AND wallet."unlimited" = false;
