/**
 * The one-time account entitlement granted when a brand-new user row is
 * created. Onboarding state lives on the device, so it must never be used as
 * the source of truth for this grant.
 */
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
