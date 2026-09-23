import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeDeletionRecoveryHandoff, recoveryUntilFromError, stageDeletionRecoveryHandoff } from './deletion-recovery-handoff';

afterEach(() => { consumeDeletionRecoveryHandoff(); vi.useRealTimers(); });
describe('registration to login deletion recovery handoff', () => {
  it('is consumed once and contains the original verified-provider attempt', () => {
    const attempt = { kind: 'google' as const, idToken: 'in-memory-only-token', recoveryUntil: new Date(Date.now() + 86400000).toISOString() };
    stageDeletionRecoveryHandoff(attempt);
    expect(consumeDeletionRecoveryHandoff()).toEqual(attempt);
    expect(consumeDeletionRecoveryHandoff()).toBeNull();
  });
  it('drops a stale token instead of retaining it across a later login', () => {
    vi.useFakeTimers();
    stageDeletionRecoveryHandoff({ kind: 'google', idToken: 'not-persisted', recoveryUntil: new Date(Date.now() + 86400000).toISOString() });
    vi.advanceTimersByTime(300001);
    expect(consumeDeletionRecoveryHandoff()).toBeNull();
  });
  it('does not turn arbitrary 403, suspension or expired metadata into a recovery dialog', () => {
    expect(recoveryUntilFromError({ code: 'AUTH_ACCOUNT_SUSPENDED', details: { recoveryUntil: '2999-01-01' } })).toBeNull();
    expect(recoveryUntilFromError({ code: 'AUTH_ACCOUNT_UNAVAILABLE' })).toBeNull();
    expect(recoveryUntilFromError({ code: 'AUTH_ACCOUNT_DELETION_PENDING', details: { recoveryUntil: '2000-01-01' } })).toBeNull();
    stageDeletionRecoveryHandoff({ kind: 'google', idToken: 'ignored', recoveryUntil: 'invalid' });
    expect(consumeDeletionRecoveryHandoff()).toBeNull();
  });
});
