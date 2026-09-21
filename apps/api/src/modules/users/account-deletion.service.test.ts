import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryRepository, PrismaRepository, WELCOME_CREDIT_AMOUNT } from '@birkare/database';
import { DeleteAccountSchema, UpdatePreferencesSchema } from '@birkare/contracts';
import { ApiError } from '@birkare/shared';
import type { StorageProvider } from '@birkare/storage';
import { AccountDeletionService } from './account-deletion.service.js';

const email = 'delete-me@example.test';
const confirmation = 'HESABIMI SIL';
const userInput = (address = email) => ({
  email: address,
  passwordHash: 'test-hash',
  firstName: 'Test',
  lastName: 'User',
  locale: 'tr-TR',
  dateOfBirth: new Date('1990-01-01'),
  consents: [],
});
const assetInput = (ownerId: string, suffix = 'source') => ({
  ownerId,
  type: 'USER_SOURCE' as const,
  storageProvider: 'local' as const,
  storageKey: `users/${ownerId}/${suffix}.jpg`,
  originalName: 'source.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 42,
  sha256: null,
});
const matchesCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

async function fixture() {
  const repository = new MemoryRepository('isolated-test-identity-secret');
  const user = await repository.createUser(userInput());
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  await repository.grantCredits({
    userId: user.id,
    amount: WELCOME_CREDIT_AMOUNT,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: user.id,
    idempotencyKey: `test-fixture:${user.id}`,
  });
  const deletedKeys: string[] = [];
  let failStorage = false;
  const storage = {
    deleteObject: async (key: string) => {
      if (failStorage) throw new Error('temporary storage outage');
      deletedKeys.push(key);
    },
  } as StorageProvider;
  let googleSubject = 'own-subject';
  let issuedAt = Math.floor(Date.now() / 1000);
  const service = new AccountDeletionService(
    repository,
    storage,
    { verify: async (hash, password) => hash === 'test-hash' && password === 'correct-password' },
    { verify: async () => ({ subject: googleSubject, email, issuedAt }) },
  );
  return {
    repository,
    user,
    service,
    deletedKeys,
    failStorage: (value: boolean) => {
      failStorage = value;
    },
    google: (subject: string, iat = Math.floor(Date.now() / 1000)) => {
      googleSubject = subject;
      issuedAt = iat;
    },
  };
}

test('deletion requires exact confirmation and exactly one real reauthentication method', async () => {
  const { repository, user, service } = await fixture();
  assert.equal(DeleteAccountSchema.safeParse({ confirmation }).success, false);
  assert.equal(
    DeleteAccountSchema.safeParse({ confirmation, password: 'p', googleIdToken: 'x'.repeat(30) })
      .success,
    false,
  );
  assert.equal(
    DeleteAccountSchema.safeParse({ confirmation, password: 'p', userId: 'someone-else' }).success,
    false,
  );
  assert.equal(
    DeleteAccountSchema.safeParse({ confirmation, email, verificationCode: '123456' }).success,
    false,
  );
  await assert.rejects(
    () => service.request(user.id, { confirmation: 'yes', password: 'correct-password' }),
    matchesCode('DELETION_CONFIRMATION_REQUIRED'),
  );
  await assert.rejects(
    () => service.request(user.id, { confirmation, password: 'incorrect' }),
    matchesCode('DELETION_REAUTH_FAILED'),
  );
  assert.equal((await repository.getUserById(user.id))?.status, 'ACTIVE');
  assert.equal(
    (await repository.listPendingAccountDeletions(new Date(Date.now() + 1000000), 20)).length,
    0,
  );
});

test('a password changed during asynchronous reauthentication cannot authorize account deletion', async () => {
  const f = await fixture();
  const service = new AccountDeletionService(
    f.repository,
    {} as StorageProvider,
    {
      verify: async (hash) => {
        assert.equal(hash, 'test-hash');
        await f.repository.updateUser(f.user.id, { passwordHash: 'new-test-hash' });
        return true;
      },
    },
    {
      verify: async () => {
        throw new Error('Google must not be used for password reauthentication');
      },
    },
  );
  await assert.rejects(
    service.request(f.user.id, { confirmation, password: 'correct-password' }),
    matchesCode('DELETION_REAUTH_STALE'),
  );
  assert.equal((await f.repository.getUserById(f.user.id))?.status, 'ACTIVE');
  assert.deepEqual(
    await f.repository.listPendingAccountDeletions(new Date(Date.now() + 601000), 20),
    [],
  );
});

test('Prisma atomically compares the verified password while claiming the account for deletion', async () => {
  let claim: { where: Record<string, unknown>; data: Record<string, unknown> } | undefined;
  const tx = {
    accountDeletion: { findUnique: async () => null },
    user: {
      updateMany: async (input: typeof claim) => {
        claim = input;
        return { count: 0 }; // Simulate a reset that changed the hash before the lock.
      },
    },
  };
  const repository = new PrismaRepository({
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx),
  });
  await assert.rejects(
    repository.requestAccountDeletion('isolated-user', {
      expectedPasswordHash: 'verified-test-hash',
    }),
    matchesCode('DELETION_REAUTH_STALE'),
  );
  assert.deepEqual(claim?.where, {
    id: 'isolated-user',
    status: 'ACTIVE',
    deletedAt: null,
    passwordHash: 'verified-test-hash',
  });
  assert.equal(claim?.data.status, 'DELETION_PENDING');
});

test('Google deletion accepts only a fresh token for the already-linked immutable subject', async () => {
  const f = await fixture();
  await f.repository.linkAuthAccount({
    userId: f.user.id,
    provider: 'GOOGLE',
    providerAccountId: 'own-subject',
    providerEmail: email,
  });
  assert.deepEqual(await f.service.preview(f.user.id), {
    canVerifyPassword: true,
    canVerifyGoogle: true,
    cleanupDelayMinutes: 10,
  });
  f.google('other-subject');
  await assert.rejects(
    () => f.service.request(f.user.id, { confirmation, googleIdToken: 'token' }),
    matchesCode('DELETION_REAUTH_FAILED'),
  );
  f.google('own-subject', Math.floor(Date.now() / 1000) - 600);
  await assert.rejects(
    () => f.service.request(f.user.id, { confirmation, googleIdToken: 'token' }),
    matchesCode('DELETION_REAUTH_STALE'),
  );
  for (const invalidIssuedAt of [0, Number.NaN, Math.floor(Date.now() / 1000) + 600]) {
    f.google('own-subject', invalidIssuedAt);
    await assert.rejects(
      () => f.service.request(f.user.id, { confirmation, googleIdToken: 'token' }),
      matchesCode('DELETION_REAUTH_STALE'),
    );
    assert.equal((await f.repository.getUserById(f.user.id))?.status, 'ACTIVE');
  }
  f.google('own-subject');
  assert.equal(
    (await f.service.request(f.user.id, { confirmation, googleIdToken: 'token' }))
      .deletionRequested,
    true,
  );
});

test('a partially deleted storage manifest is retained and safely retried before database removal', async () => {
  const f = await fixture();
  const first = await f.repository.createAsset(assetInput(f.user.id, 'first'));
  const second = await f.repository.createAsset(assetInput(f.user.id, 'second'));
  const deleted = new Set<string>();
  let failSecond = true;
  const service = new AccountDeletionService(
    f.repository,
    {
      deleteObject: async (key: string) => {
        if (key === second.storageKey && failSecond) throw new Error('temporary storage failure');
        deleted.add(key); // An already deleted object must remain an idempotent success.
      },
    } as StorageProvider,
    { verify: async () => true },
    {
      verify: async () => {
        throw new Error('Google is not used');
      },
    },
  );
  await service.request(f.user.id, { confirmation, password: 'correct-password' });
  const later = new Date(Date.now() + 601000);
  assert.deepEqual(await service.cleanup(later), { completed: 0, failed: 1 });
  assert.deepEqual([...deleted], [first.storageKey]);
  assert.equal((await f.repository.getUserById(f.user.id))?.status, 'DELETION_PENDING');
  assert.equal(
    (await f.repository.listPendingAccountDeletions(later, 20))[0]?.storageKeys.length,
    2,
  );
  failSecond = false;
  assert.deepEqual(await service.cleanup(later), { completed: 1, failed: 0 });
  assert.deepEqual([...deleted], [first.storageKey, second.storageKey]);
  assert.equal(await f.repository.getUserById(f.user.id), null);
});

test('accepted deletion revokes sessions, delays storage cleanup and rejects new uploads/credit reservations', async () => {
  const f = await fixture();
  const asset = await f.repository.createAsset(assetInput(f.user.id));
  const session = await f.repository.createSession({
    userId: f.user.id,
    refreshTokenHash: 'test-refresh',
    expiresAt: new Date(Date.now() + 86400000),
  });
  const before = Date.now();
  const result = await f.service.request(f.user.id, { confirmation, password: 'correct-password' });
  assert.equal(result.reversible, false);
  assert.ok(Date.parse(result.cleanupNotBefore) >= before + 600000);
  assert.equal((await f.repository.getUserById(f.user.id))?.status, 'DELETION_PENDING');
  assert.ok((await f.repository.getSessionByRefreshHash(session.refreshTokenHash))?.revokedAt);
  assert.deepEqual(await f.service.cleanup(new Date(before + 599999)), { completed: 0, failed: 0 });
  assert.ok(await f.repository.getAssetById(asset.id));
  await assert.rejects(
    () => f.repository.createAsset(assetInput(f.user.id, 'late')),
    matchesCode('ACCOUNT_UNAVAILABLE'),
  );
  await assert.rejects(
    () => f.repository.reserveCredits({ userId: f.user.id, generationId: 'late', amount: 1 }),
    matchesCode('ACCOUNT_UNAVAILABLE'),
  );
});

test('cleanup is retryable and removes only the requested account and its related data', async () => {
  const f = await fixture();
  const other = await f.repository.createUser(userInput('keep-me@example.test'));
  await f.repository.grantCredits({
    userId: other.id,
    amount: WELCOME_CREDIT_AMOUNT,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: other.id,
    idempotencyKey: `test-fixture:${other.id}`,
  });
  const { ticket } = await f.repository.claimSupportTicket({
    userId: f.user.id,
    idempotencyKey: 'support-deletion-test',
    requestHash: 'a'.repeat(64),
    requestId: 'support-deletion-test',
    category: 'OTHER',
    subject: 'Test destek',
    message: 'Hesap silme regresyon testi',
  });
  const source = await f.repository.createAsset(assetInput(f.user.id));
  const otherAsset = await f.repository.createAsset(assetInput(other.id));
  const project = await f.repository.createProject({
    userId: f.user.id,
    title: 'Test project',
    mode: 'AI_FILTER',
    sourceAssetId: source.id,
    sceneTemplateId: null,
    stylePresetId: null,
    featuredPersonId: null,
    composition: null,
    aspectRatio: '4:5',
  });
  const generation = await f.repository.createGeneration({
    userId: f.user.id,
    projectId: project.id,
    sourceAssetId: source.id,
    parentGenerationId: null,
    quality: 'STANDARD',
    requestedImageCount: 1,
    aspectRatio: '4:5',
    preserveFace: true,
    preserveClothes: true,
    recipe: null,
    userInstruction: null,
    provider: 'mock',
    model: 'mock',
    reservedCredits: 0,
  });
  await f.repository.updateGeneration(generation.id, { status: 'COMPLETED' });
  await f.repository.addGenerationMessage({
    generationId: generation.id,
    role: 'USER',
    content: 'private test prompt',
  });
  await f.repository.addGenerationOutput({
    generationId: generation.id,
    assetId: source.id,
    variantIndex: 0,
    selected: true,
    watermarkApplied: false,
    disclosureType: null,
  });
  await f.repository.putIdempotency({
    userId: f.user.id,
    route: '/test',
    key: 'test-key',
    requestHash: 'hash',
    responseCode: 201,
    responseBody: { private: true },
    expiresAt: new Date(Date.now() + 86400000),
  });
  await f.service.request(f.user.id, { confirmation, password: 'correct-password' });
  const later = new Date(Date.now() + 601000);
  f.failStorage(true);
  assert.deepEqual(await f.service.cleanup(later), { completed: 0, failed: 1 });
  assert.ok(await f.repository.getUserById(f.user.id));
  assert.ok(await f.repository.getSupportTicket(f.user.id, ticket.id));
  assert.equal((await f.repository.listPendingAccountDeletions(later, 20)).length, 1);
  f.failStorage(false);
  assert.deepEqual(await f.service.cleanup(later), { completed: 1, failed: 0 });
  assert.deepEqual(f.deletedKeys, [source.storageKey]);
  assert.equal(await f.repository.getUserById(f.user.id), null);
  assert.equal(await f.repository.getUserByEmail(email), null);
  assert.equal(await f.repository.getProjectById(project.id), null);
  assert.equal(await f.repository.getGenerationById(generation.id), null);
  assert.equal(await f.repository.getAssetById(source.id), null);
  assert.deepEqual(await f.repository.listGenerationMessages(generation.id), []);
  assert.deepEqual(await f.repository.listCreditTransactions(f.user.id), []);
  assert.equal(await f.repository.getIdempotency('/test', 'test-key'), null);
  assert.equal(await f.repository.getSupportTicket(f.user.id, ticket.id), null);
  assert.ok(await f.repository.getUserById(other.id));
  assert.ok(await f.repository.getAssetById(otherAsset.id));
  assert.equal((await f.repository.getWallet(other.id)).available, WELCOME_CREDIT_AMOUNT);
  assert.deepEqual(await f.service.cleanup(later), { completed: 0, failed: 0 });
});

test('deleting and re-registering an email or linked Google subject cannot repeat welcome credits', async () => {
  const f = await fixture();
  await f.repository.createPendingSocialLogin({
    tokenHash: 'different-email-handoff',
    provider: 'GOOGLE',
    providerAccountId: 'own-subject',
    providerEmail: 'old-address@example.test',
    givenName: 'Test',
    familyName: null,
    expiresAt: new Date(Date.now() + 86400000),
  });
  await f.repository.linkAuthAccount({
    userId: f.user.id,
    provider: 'GOOGLE',
    providerAccountId: 'own-subject',
    providerEmail: email,
  });
  await f.service.request(f.user.id, { confirmation, password: 'correct-password' });
  const records = await f.repository.listPendingAccountDeletions(new Date(Date.now() + 601000), 20);
  assert.ok(records[0]?.identityHashes.every((value) => /^[a-f0-9]{64}$/.test(value)));
  assert.ok(!JSON.stringify(records[0]?.identityHashes).includes(email));
  await f.service.cleanup(new Date(Date.now() + 601000));
  assert.equal(
    await f.repository.consumePendingSocialLogin('different-email-handoff', 'GOOGLE'),
    null,
  );
  const recreated = await f.repository.createUser(userInput(email.toUpperCase()));
  assert.equal((await f.repository.getWallet(recreated.id)).available, 0);
  assert.deepEqual(await f.repository.listCreditTransactions(recreated.id), []);
  const social = await f.repository.createVerifiedSocialUser({
    email: 'new-address@example.test',
    firstName: 'Test',
    lastName: 'Social',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    provider: 'GOOGLE',
    providerAccountId: 'own-subject',
    providerEmail: 'new-address@example.test',
    consents: [],
  });
  assert.equal((await f.repository.getWallet(social.id)).available, 0);
});

test('reserved work blocks deletion without changing user status or creating a manifest', async () => {
  const f = await fixture();
  await f.repository.reserveCredits({
    userId: f.user.id,
    generationId: 'isolated-test-job',
    amount: 1,
  });
  await assert.rejects(
    () => f.service.request(f.user.id, { confirmation, password: 'correct-password' }),
    matchesCode('ACCOUNT_GENERATION_ACTIVE'),
  );
  assert.equal((await f.repository.getUserById(f.user.id))?.status, 'ACTIVE');
  assert.deepEqual(
    await f.repository.listPendingAccountDeletions(new Date(Date.now() + 601000), 20),
    [],
  );
});

test('appearance contract keeps the dark-only theme with persisted glass and motion values', async () => {
  assert.equal(UpdatePreferencesSchema.safeParse({ theme: 'light' }).success, false);
  assert.equal(UpdatePreferencesSchema.safeParse({ theme: 'system' }).success, false);
  assert.equal(UpdatePreferencesSchema.safeParse({ glassEffects: 'false' }).success, false);
  const preferences = UpdatePreferencesSchema.parse({
    theme: 'dark',
    glassEffects: false,
    reducedMotion: true,
  });
  const f = await fixture();
  await f.repository.updateUser(f.user.id, {
    preferences: { ...f.user.preferences, ...preferences },
  });
  const stored = (await f.repository.getUserById(f.user.id))?.preferences;
  assert.equal(stored?.glassEffects, false);
  assert.equal(stored?.reducedMotion, true);
  assert.equal(stored?.theme, 'dark');
});
