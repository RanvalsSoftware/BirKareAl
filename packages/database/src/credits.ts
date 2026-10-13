import { createHmac } from 'node:crypto';

/** Granted only after ownership of the e-mail address is verified. */
export const WELCOME_CREDIT_AMOUNT = 21;
export const WELCOME_CREDIT_REFERENCE_TYPE = 'WELCOME_CREDIT';

/**
 * CreditTransaction.idempotencyKey is globally unique. Binding the key to the
 * immutable BirKare user id makes the welcome grant safe against retries,
 * social-login races, app reinstalls, and onboarding resets.
 */
export function welcomeCreditIdempotencyKey(userId: string): string {
  return `welcome-credit:${userId}`;
}

/** Login identities remain distinct; this canonical form is bonus-abuse only. */
export function emailAbuseFingerprint(email: string): string {
  const normalized = email.trim().toLowerCase();
  const separator = normalized.lastIndexOf('@');
  if (separator <= 0) return normalized;
  let local = normalized.slice(0, separator);
  let domain = normalized.slice(separator + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+', 1)[0]!.replace(/\./g, '');
  return `${local}@${domain}`;
}

export function welcomeCreditAbuseHash(secret: string, email: string): string {
  return createHmac('sha256', secret)
    .update(`welcome:${emailAbuseFingerprint(email)}`)
    .digest('hex');
}

/** Ledger types that represent a store purchase and can be clawed back by a store refund. */
export const STORE_GRANT_TYPES = ['PURCHASE', 'SUBSCRIPTION_GRANT'] as const;

/** One active refund row per grant; the key is retired if that refund is later reversed. */
export function creditRefundIdempotencyKey(grantTransactionId: string): string {
  return `credit-refund:${grantTransactionId}`;
}
