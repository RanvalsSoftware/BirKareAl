import { createHmac } from 'node:crypto';

/** Non-reversible keyed identifiers prevent delete/re-register welcome-credit abuse. */
export function deletionIdentityHash(secret: string, kind: string, value: string) {
  return createHmac('sha256', secret)
    .update(`${kind}\0${kind === 'email' ? value.trim().toLowerCase() : value}`)
    .digest('hex');
}
export const DELETION_GRACE_MS = 10 * 60 * 1000; // Existing signed asset URLs expire after five minutes.
export const DELETION_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // Minimal deletion manifest/audit row.
export const DELETION_IDLE_STATUSES = [
  'DRAFT',
  'BLOCKED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'DELETED',
] as const;
