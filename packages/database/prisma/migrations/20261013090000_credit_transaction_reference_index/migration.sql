-- A store purchase is credited once across all accounts. The grant path looks
-- up prior grants by store reference, so that lookup must not scan the ledger.
CREATE INDEX IF NOT EXISTS "CreditTransaction_referenceType_referenceId_idx"
  ON "CreditTransaction"("referenceType", "referenceId");
