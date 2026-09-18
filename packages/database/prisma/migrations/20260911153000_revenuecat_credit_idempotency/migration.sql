-- RevenueCat webhooks and client reconciliation may deliver the same purchase
-- more than once. A user-scoped idempotency key makes every credit grant safe
-- across retries and concurrent API instances. PostgreSQL permits multiple NULL
-- values, so existing non-idempotent generation rows remain valid.
CREATE UNIQUE INDEX "CreditTransaction_userId_idempotencyKey_key"
ON "CreditTransaction"("userId", "idempotencyKey");
