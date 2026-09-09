import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryRepository, PrismaRepository } from '@birkare/database';

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
