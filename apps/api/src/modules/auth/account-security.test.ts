import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryRepository, PrismaRepository } from '@birkare/database';
import { PasswordService } from '../../services/password.service.js';

async function activeUser(repository: MemoryRepository) {
  const user = await repository.createUser({
    email: 'security@example.test',
    passwordHash: 'unused',
    firstName: 'Test',
    lastName: 'User',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    consents: [],
  });
  return repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
}

test('concurrent refresh rotation cannot fork a session into two usable children', async () => {
  const repository = new MemoryRepository();
  const user = await activeUser(repository);
  const session = await repository.createSession({
    userId: user.id,
    refreshTokenHash: 'old',
    expiresAt: new Date(Date.now() + 60_000),
  });
  const attempts = await Promise.allSettled(
    ['first', 'second'].map((refreshTokenHash) =>
      repository.rotateSession(session.id, {
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ),
  );
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = attempts.find((result) => result.status === 'rejected');
  assert.equal(rejected?.reason.code, 'AUTH_REFRESH_TOKEN_REUSE');
  assert.equal(
    (await repository.listSessions(user.id)).filter((entry) => !entry.revokedAt).length,
    1,
  );
});

test('concurrent password-reset completions have one winner and revoke every session', async () => {
  const repository = new MemoryRepository();
  const user = await activeUser(repository);
  await repository.createSession({
    userId: user.id,
    refreshTokenHash: 'old-session',
    expiresAt: new Date(Date.now() + 60_000),
  });
  for (const tokenHash of ['reset-one', 'reset-two']) {
    await repository.createEmailToken({
      userId: user.id,
      type: 'RESET_PASSWORD',
      tokenHash,
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  const results = await Promise.all([
    repository.completePasswordReset('reset-one', 'password-one'),
    repository.completePasswordReset('reset-two', 'password-two'),
  ]);

  assert.equal(results.filter((result) => result === 'COMPLETED').length, 1);
  assert.equal(results.filter((result) => result === 'INVALID_TOKEN').length, 1);
  assert.ok(
    ['password-one', 'password-two'].includes(
      (await repository.getUserById(user.id))!.passwordHash!,
    ),
  );
  assert.ok((await repository.listSessions(user.id)).every((session) => session.revokedAt));
  assert.equal(await repository.completePasswordReset('reset-one', 'later'), 'INVALID_TOKEN');
  assert.equal(await repository.completePasswordReset('reset-two', 'later'), 'INVALID_TOKEN');
});

test('a password login cannot create a session after the reset changed its credential snapshot', async () => {
  const repository = new MemoryRepository();
  const user = await activeUser(repository);
  await repository.updateUser(user.id, { passwordHash: 'old-password-hash' });
  await repository.createEmailToken({
    userId: user.id,
    type: 'RESET_PASSWORD',
    tokenHash: 'reset',
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
  });

  assert.equal(await repository.completePasswordReset('reset', 'new-password-hash'), 'COMPLETED');
  await assert.rejects(
    () =>
      repository.createSession(
        {
          userId: user.id,
          refreshTokenHash: 'stale-login',
          expiresAt: new Date(Date.now() + 60_000),
        },
        { expectedPasswordHash: 'old-password-hash' },
      ),
    { code: 'AUTH_INVALID_CREDENTIALS' },
  );
  assert.equal((await repository.listSessions(user.id)).length, 0);
});

test('Prisma password-reset completion rolls every security write back on failure', async () => {
  let durable = {
    passwordHash: 'old-password-hash',
    resetUsed: false,
    siblingUsed: false,
    sessionRevoked: false,
  };
  let failSessionRevocation = true;
  const prisma = {
    $transaction: async (operation: (client: any) => Promise<unknown>) => {
      const working = { ...durable };
      const tx = {
        emailToken: {
          findUnique: async () => ({
            id: 'reset-token',
            userId: 'user',
            type: 'RESET_PASSWORD',
            usedAt: working.resetUsed ? new Date() : null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
          updateMany: async ({ where }: any) => {
            if (where.id) {
              if (working.resetUsed) return { count: 0 };
              working.resetUsed = true;
              return { count: 1 };
            }
            working.siblingUsed = true;
            return { count: 1 };
          },
        },
        user: {
          updateMany: async () => ({ count: 1 }),
          update: async ({ data }: any) => {
            working.passwordHash = data.passwordHash;
          },
        },
        session: {
          updateMany: async () => {
            working.sessionRevoked = true;
            if (failSessionRevocation) throw new Error('simulated session write failure');
            return { count: 1 };
          },
        },
      };
      const result = await operation(tx);
      durable = working;
      return result;
    },
  };
  const repository = new PrismaRepository(prisma);

  await assert.rejects(
    () => repository.completePasswordReset('reset-token-hash', 'new-password-hash'),
    /simulated session write failure/,
  );
  assert.deepEqual(durable, {
    passwordHash: 'old-password-hash',
    resetUsed: false,
    siblingUsed: false,
    sessionRevoked: false,
  });

  failSessionRevocation = false;
  assert.equal(
    await repository.completePasswordReset('reset-token-hash', 'new-password-hash'),
    'COMPLETED',
  );
  assert.deepEqual(durable, {
    passwordHash: 'new-password-hash',
    resetUsed: true,
    siblingUsed: true,
    sessionRevoked: true,
  });
});

test('Prisma password login fails before session creation when its credential snapshot is stale', async () => {
  const calls: string[] = [];
  const tx = {
    user: {
      updateMany: async ({ where }: any) => {
        calls.push('credential-lock');
        assert.equal(where.passwordHash, 'old-password-hash');
        assert.equal(where.deletedAt, null);
        return { count: 0 };
      },
    },
    session: {
      create: async () => {
        calls.push('create-session');
      },
    },
  };
  const repository = new PrismaRepository({
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx),
  });

  await assert.rejects(
    () =>
      repository.createSession(
        {
          userId: 'user',
          refreshTokenHash: 'stale-login',
          expiresAt: new Date(Date.now() + 60_000),
        },
        { expectedPasswordHash: 'old-password-hash' },
      ),
    { code: 'AUTH_INVALID_CREDENTIALS' },
  );
  assert.deepEqual(calls, ['credential-lock']);
});

test('repository guards block linking, rotation and deletion after eligibility changes', async () => {
  for (const status of ['SUSPENDED', 'DELETION_PENDING', 'DELETED'] as const) {
    const repository = new MemoryRepository();
    const user = await activeUser(repository);
    const session = await repository.createSession({
      userId: user.id,
      refreshTokenHash: 'old',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await repository.updateUser(user.id, { status });
    await assert.rejects(
      () =>
        repository.linkAuthAccount({
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: 'unlinked-google',
          providerEmail: user.email,
        }),
      { code: 'ACCOUNT_UNAVAILABLE' },
    );
    await assert.rejects(
      () =>
        repository.rotateSession(session.id, {
          userId: user.id,
          refreshTokenHash: 'new',
          expiresAt: new Date(Date.now() + 60_000),
        }),
      { code: 'ACCOUNT_UNAVAILABLE' },
    );
    await assert.rejects(() => repository.requestAccountDeletion(user.id), {
      code: 'ACCOUNT_UNAVAILABLE',
    });
    assert.equal(await repository.getUserByAuthAccount('GOOGLE', 'unlinked-google'), null);
  }
});

test('Prisma refresh claims an unrevoked unexpired session under account lock before creating a child', async () => {
  const calls: string[] = [];
  const tx = {
    user: {
      updateMany: async ({ where }: any) => {
        calls.push('account-lock');
        assert.equal(where.deletedAt, null);
        return { count: 1 };
      },
    },
    session: {
      findUnique: async () => ({ id: 'session', userId: 'user', tokenFamilyId: 'family' }),
      updateMany: async ({ where }: any) => {
        calls.push('claim-session');
        assert.equal(where.revokedAt, null);
        assert.ok(where.expiresAt.gt instanceof Date);
        return { count: 0 };
      },
      create: async () => {
        calls.push('create-child');
      },
    },
  };
  const repository = new PrismaRepository({
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx),
  });
  await assert.rejects(
    () =>
      repository.rotateSession('session', {
        userId: 'user',
        refreshTokenHash: 'new',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    { code: 'AUTH_REFRESH_TOKEN_REUSE' },
  );
  assert.deepEqual(calls, ['account-lock', 'claim-session']);
});

test('Prisma account deletion does not overwrite a no-longer-active account', async () => {
  const tx = {
    accountDeletion: { findUnique: async () => null },
    user: {
      updateMany: async ({ where }: any) => {
        assert.deepEqual(where, { id: 'user', status: 'ACTIVE', deletedAt: null });
        return { count: 0 };
      },
    },
  };
  const repository = new PrismaRepository({
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx),
  });
  await assert.rejects(() => repository.requestAccountDeletion('user'), {
    code: 'ACCOUNT_UNAVAILABLE',
  });
});

test('Prisma linking takes the account lock before creating a provider identity', async () => {
  const calls: string[] = [];
  const tx = {
    user: {
      updateMany: async () => {
        calls.push('account-lock');
        return { count: 1 };
      },
    },
    authAccount: {
      create: async () => {
        calls.push('link');
      },
    },
  };
  const repository = new PrismaRepository({
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx),
  });
  await repository.linkAuthAccount({
    userId: 'user',
    provider: 'GOOGLE',
    providerAccountId: 'google-id',
    providerEmail: 'security@example.test',
  });
  assert.deepEqual(calls, ['account-lock', 'link']);
});

test('two verified Gmail aliases can create accounts but receive welcome credit only once', async () => {
  const repository = new MemoryRepository();
  const password = new PasswordService('welcome-credit-alias-test-pepper');
  const first = await repository.createUser({
    email: 'a.hmet+first@gmail.com',
    passwordHash: 'unused',
    firstName: null,
    lastName: null,
    locale: 'tr-TR',
    dateOfBirth: null,
    consents: [],
  });
  const second = await repository.createUser({
    email: 'ahmet+second@googlemail.com',
    passwordHash: 'unused',
    firstName: null,
    lastName: null,
    locale: 'tr-TR',
    dateOfBirth: null,
    consents: [],
  });
  const firstCode = '123456';
  const secondCode = '654321';
  await repository.createEmailToken({
    userId: first.id,
    type: 'VERIFY_EMAIL',
    tokenHash: password.hashEmailVerificationCode(first.email, firstCode),
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
  });
  await repository.createEmailToken({
    userId: second.id,
    type: 'VERIFY_EMAIL',
    tokenHash: password.hashEmailVerificationCode(second.email, secondCode),
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
  });
  const sharedAbuseHash = 'same-gmail-abuse-fingerprint';
  assert.deepEqual(
    await repository.completeEmailVerification(
      first.id,
      password.hashEmailVerificationCode(first.email, firstCode),
      5,
      sharedAbuseHash,
    ),
    { status: 'VERIFIED', welcomeCreditsGranted: true },
  );
  assert.deepEqual(
    await repository.completeEmailVerification(
      second.id,
      password.hashEmailVerificationCode(second.email, secondCode),
      5,
      sharedAbuseHash,
    ),
    { status: 'VERIFIED', welcomeCreditsGranted: false },
  );
  assert.equal((await repository.getWallet(first.id)).available, 21);
  assert.equal((await repository.getWallet(second.id)).available, 0);
});
