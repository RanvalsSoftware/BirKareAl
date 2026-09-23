export type SocialDeletionRecoveryAttempt =
  | { kind: 'google'; idToken: string; recoveryUntil: string }
  | { kind: 'apple'; input: { idToken: string; firstName?: string; lastName?: string }; recoveryUntil: string };

// One-use memory handoff from registration to login. Never persist provider
// credentials in route parameters, logs, AsyncStorage, SecureStore or the URL.
let pending: { attempt: SocialDeletionRecoveryAttempt; expiresAt: number } | null = null;
const HANDOFF_TTL_MS = 5 * 60 * 1000;

export function stageDeletionRecoveryHandoff(attempt: SocialDeletionRecoveryAttempt): void {
  const deadline = Date.parse(attempt.recoveryUntil);
  if (!Number.isFinite(deadline) || deadline <= Date.now()) {
    pending = null;
    return;
  }
  pending = { attempt, expiresAt: Math.min(deadline, Date.now() + HANDOFF_TTL_MS) };
}

export function consumeDeletionRecoveryHandoff(): SocialDeletionRecoveryAttempt | null {
  const value = pending;
  pending = null;
  return value && value.expiresAt > Date.now() ? value.attempt : null;
}

export function recoveryUntilFromError(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'AUTH_ACCOUNT_DELETION_PENDING') return null;
  const details = 'details' in error ? error.details : null;
  if (!details || typeof details !== 'object' || !('recoveryUntil' in details)) return null;
  const value = details.recoveryUntil;
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now() ? value : null;
}
