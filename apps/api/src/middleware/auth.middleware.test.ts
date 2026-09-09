import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { SessionRecord, UserRecord } from '@birkare/database';
import { ApiError } from '@birkare/shared';
import { TokenService } from '../services/token.service.js';
import { requireAuth } from './auth.middleware.js';

const tokenService = new TokenService({
  JWT_ACCESS_SECRET: 'test-only-access-secret-with-enough-length',
  JWT_ACCESS_TTL_SECONDS: 900,
  JWT_ISSUER: 'https://api.example.test',
  JWT_USER_AUDIENCE: 'birkare-mobile',
});
const user = {
  id: 'user-1',
  email: 'one@example.test',
  role: 'USER',
  status: 'ACTIVE',
  emailVerifiedAt: new Date(),
  deletedAt: null,
} as UserRecord;
const session = {
  id: 'session-1',
  userId: user.id,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 600_000),
} as SessionRecord;

async function check(
  currentUser: UserRecord | null = user,
  currentSessions: SessionRecord[] = [session],
) {
  // Simulate an old elevated JWT so role hydration is covered at the same time.
  const { accessToken } = await tokenService.issueAccessToken(
    { ...user, role: 'ADMIN' },
    session.id,
  );
  const req = { header: () => `Bearer ${accessToken}` } as unknown as Request;
  const error = await new Promise<unknown>((resolve) => {
    void requireAuth(tokenService, {
      getUserById: async () => currentUser,
      listSessions: async () => currentSessions,
    })(req, {} as Response, (err) => resolve(err));
  });
  return { req, error };
}

test('active session works and database role replaces a stale elevated JWT role', async () => {
  const { req, error } = await check();
  assert.equal(error, undefined);
  assert.equal(req.auth?.role, 'USER');
});

test('deleted, deletion-pending and missing users cannot use an unexpired token', async () => {
  for (const currentUser of [
    null,
    { ...user, status: 'DELETED' as const },
    { ...user, status: 'DELETION_PENDING' as const },
    { ...user, deletedAt: new Date() },
  ]) {
    const { req, error } = await check(currentUser);
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'AUTH_ACCOUNT_UNAVAILABLE');
    assert.equal(req.auth, undefined);
  }
});

test('logout, expired, missing and another user session are rejected immediately', async () => {
  for (const currentSessions of [
    [],
    [{ ...session, revokedAt: new Date() }],
    [{ ...session, expiresAt: new Date(Date.now() - 1) }],
    [{ ...session, userId: 'someone-else' }],
  ]) {
    const { error } = await check(user, currentSessions);
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'AUTH_SESSION_REVOKED');
  }
});

test('suspended and unverified accounts remain blocked', async () => {
  const suspended = await check({ ...user, status: 'SUSPENDED' });
  assert.ok(suspended.error instanceof ApiError);
  assert.equal(suspended.error.code, 'AUTH_ACCOUNT_SUSPENDED');
  const pending = await check({ ...user, status: 'PENDING_VERIFICATION', emailVerifiedAt: null });
  assert.ok(pending.error instanceof ApiError);
  assert.equal(pending.error.code, 'AUTH_EMAIL_NOT_VERIFIED');
});
