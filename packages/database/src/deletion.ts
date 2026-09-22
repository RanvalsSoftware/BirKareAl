import { createHmac } from 'node:crypto';

/** Non-reversible keyed identifiers prevent delete/re-register welcome-credit abuse. */
export function deletionIdentityHash(secret: string, kind: string, value: string) {
  return createHmac('sha256', secret)
    .update(`${kind}\0${kind === 'email' ? value.trim().toLowerCase() : value}`)
    .digest('hex');
}
export const ACCOUNT_DELETION_RECOVERY_DAYS = 30;
export const ACCOUNT_DELETION_RECOVERY_MS =
  ACCOUNT_DELETION_RECOVERY_DAYS * 24 * 60 * 60 * 1000;
/**
 * Account access is disabled immediately, but destructive cleanup waits through
 * the user-visible recovery window. Keep the legacy name as an internal alias
 * so repository call sites remain explicit about the deletion deadline.
 */
export const DELETION_GRACE_MS = ACCOUNT_DELETION_RECOVERY_MS;
export const DELETION_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // Minimal post-deletion audit row.
export const DELETION_IDLE_STATUSES = [
  'DRAFT',
  'BLOCKED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'DELETED',
] as const;
