/**
 * Isolated PostgreSQL regression check. Never point this at the application DB.
 * Create/migrate a disposable birkare_deletion_test_* database first, then run:
 * DATABASE_URL=postgresql://.../birkare_deletion_test_<suffix> \
 *   apps/api/node_modules/.bin/tsx packages/database/scripts/verify-account-deletion.ts
 * Leaves synthetic records in the isolated DB for inspection; touches no files,
 * storage objects, real accounts, external identity providers, or AI APIs.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaRepository } from '../src/prisma.repository.js';
import { DELETION_GRACE_MS, deletionIdentityHash } from '../src/deletion.js';
import { WELCOME_CREDIT_AMOUNT } from '../src/credits.js';
import type { CreateProjectInput, CreateUserInput } from '../src/types.js';

const databaseUrl = process.env.DATABASE_URL;
assert(databaseUrl, 'Explicit DATABASE_URL is required; there is no application-DB fallback.');
const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.slice(1));
assert.match(databaseName, /^birkare_deletion_test_[a-z0-9_]+$/);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname), 'Local test DB only.');

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const identitySecret = 'isolated-integration-test-not-a-production-secret';
const repository = new PrismaRepository(prisma, identitySecret);
const runId = randomUUID();
const future = new Date(Date.now() + 60 * 60 * 1000);
const failures: string[] = [];
let passed = 0;

async function check(name: string, body: () => Promise<void>) {
  try {
    await body();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}`, error);
  }
}

function registration(email: string): CreateUserInput {
  return {
    email,
    passwordHash: 'synthetic-password-hash-not-a-real-password',
    firstName: 'Synthetic',
    lastName: 'Deletion Test',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01T00:00:00Z'),
    consents: [
      {
        type: 'TERMS',
        version: 'test-only',
        source: 'PASSWORD_REGISTRATION',
        acceptedAt: new Date(),
      },
    ],
  };
}

function projectInput(userId: string, sourceAssetId: string | null): CreateProjectInput {
  return {
    userId,
    sourceAssetId,
    title: `Synthetic deletion test ${runId}`,
    mode: 'FULL_SCENE',
    sceneTemplateId: null,
    stylePresetId: null,
    featuredPersonId: null,
    composition: null,
    aspectRatio: '4:5',
  };
}

function assetInput(userId: string, suffix: string, output = false) {
  return {
    ownerId: userId,
    type: output ? ('GENERATION_FINAL' as const) : ('USER_SOURCE' as const),
    storageProvider: 'local' as const,
    storageKey: `synthetic-deletion-test/${runId}/${suffix}.png`,
    originalName: `${suffix}.png`,
    mimeType: 'image/png',
    sizeBytes: 128,
    sha256: null,
  };
}

async function fixture(label: string) {
  const created = await repository.createUser(registration(`${label}-${runId}@example.invalid`));
  const user = await repository.updateUser(created.id, {
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
  });
  const source = await repository.createAsset(assetInput(user.id, `${label}-source`));
  const output = await repository.createAsset(assetInput(user.id, `${label}-output`, true));
  const project = await repository.createProject(projectInput(user.id, source.id));
  const generation = await prisma.generation.create({
    data: {
      userId: user.id,
      projectId: project.id,
      status: 'COMPLETED',
      quality: 'STANDARD',
      aspectRatio: '4:5',
      progress: 100,
      completedAt: new Date(),
      inputs: { create: { assetId: source.id, role: 'PRIMARY_SOURCE' } },
      outputs: { create: { assetId: output.id, variantIndex: 0 } },
      messages: { create: { role: 'user', content: 'Synthetic personal instruction' } },
    },
  });
  const session = await repository.createSession({
    userId: user.id,
    refreshTokenHash: randomUUID(),
    expiresAt: future,
  });
  await prisma.emailToken.create({
    data: { userId: user.id, type: 'VERIFY_EMAIL', tokenHash: randomUUID(), expiresAt: future },
  });
  await prisma.pendingSocialLogin.create({
    data: {
      provider: 'GOOGLE',
      providerAccountId: `${label}-pending-${runId}`,
      providerEmail: user.email,
      tokenHash: randomUUID(),
      expiresAt: future,
    },
  });
  await prisma.idempotencyRecord.create({
    data: {
      userId: user.id,
      route: 'isolated-generation-test',
      key: `${label}-${runId}`,
      requestHash: 'synthetic-request-hash',
      responseCode: 201,
      responseBody: { generationId: generation.id },
      expiresAt: future,
    },
  });
  const moderation = await prisma.moderationEvent.create({
    data: {
      userId: user.id,
      generationId: generation.id,
      assetId: source.id,
      stage: 'INPUT_IMAGE',
      provider: 'SYNTHETIC_TEST',
      model: 'no-model-call',
      flagged: false,
      action: 'ALLOW',
    },
  });
  return { user, source, output, project, generation, session, moderation };
}

try {
  const current = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  assert.equal(current[0]?.name, databaseName);
  console.log(`Isolated database: ${databaseName}; synthetic run: ${runId}`);
  const target = await fixture('target');
  const other = await fixture('control');
  const providerSubject = `synthetic-google-subject-${runId}`;
  await repository.linkAuthAccount({
    userId: target.user.id,
    provider: 'GOOGLE',
    providerAccountId: providerSubject,
    providerEmail: target.user.email,
  });

  await check('new accounts receive the configured welcome credit exactly once', async () => {
    assert.equal((await repository.getWallet(target.user.id)).available, WELCOME_CREDIT_AMOUNT);
    assert.equal((await repository.getWallet(other.user.id)).available, WELCOME_CREDIT_AMOUNT);
    assert.equal(
      await prisma.creditTransaction.count({
        where: { userId: target.user.id, referenceType: 'WELCOME_CREDIT' },
      }),
      1,
    );
  });

  await check(
    'appearance preferences persist in PostgreSQL JSON without losing other preferences',
    async () => {
      await prisma.profile.update({
        where: { userId: target.user.id },
        data: { preferences: { unrelatedPreference: 'preserve-me' } },
      });
      const updated = await repository.updateUser(target.user.id, {
        preferences: {
          ...target.user.preferences,
          glassEffects: false,
          reducedMotion: true,
          theme: 'dark',
        },
      });
      assert.equal(updated.preferences.glassEffects, false);
      assert.equal(updated.preferences.reducedMotion, true);
      assert.equal(updated.preferences.theme, 'dark');
      const stored = await prisma.profile.findUniqueOrThrow({ where: { userId: target.user.id } });
      assert.deepEqual(stored.preferences, {
        unrelatedPreference: 'preserve-me',
        glassEffects: false,
        theme: 'dark',
      });
      const reread = await repository.getUserById(target.user.id);
      assert.equal(reread?.preferences.glassEffects, false);
      assert.equal(reread?.preferences.reducedMotion, true);
    },
  );

  await check('concurrent refresh rotation creates exactly one successor', async () => {
    const results = await Promise.allSettled(
      [0, 1].map(() =>
        repository.rotateSession(other.session.id, {
          userId: other.user.id,
          refreshTokenHash: randomUUID(),
          expiresAt: future,
        }),
      ),
    );
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert(rejected?.status === 'rejected');
    assert.equal(rejected.reason.code, 'AUTH_REFRESH_TOKEN_REUSE');
    assert.equal(
      await prisma.session.count({ where: { tokenFamilyId: other.session.tokenFamilyId } }),
      2,
    );
    assert.equal(
      await prisma.session.count({
        where: { tokenFamilyId: other.session.tokenFamilyId, revokedAt: null },
      }),
      1,
    );
  });

  await check(
    'active generation blocks deletion and rolls back account/session changes',
    async () => {
      await prisma.generation.update({
        where: { id: other.generation.id },
        data: { status: 'GENERATING' },
      });
      try {
        await assert.rejects(repository.requestAccountDeletion(other.user.id), {
          code: 'ACCOUNT_GENERATION_ACTIVE',
        });
        assert.equal((await repository.getUserById(other.user.id))?.status, 'ACTIVE');
        assert.equal((await repository.getUserById(other.user.id))?.deletedAt, null);
        assert.equal(await prisma.accountDeletion.count({ where: { userId: other.user.id } }), 0);
        assert.equal(
          await prisma.session.count({
            where: { userId: other.user.id, revokedReason: 'ACCOUNT_DELETION' },
          }),
          0,
        );
      } finally {
        await prisma.generation.update({
          where: { id: other.generation.id },
          data: { status: 'COMPLETED' },
        });
      }
    },
  );

  await check('reserved wallet credits independently block deletion', async () => {
    await prisma.creditWallet.update({ where: { userId: other.user.id }, data: { reserved: 1 } });
    try {
      await assert.rejects(repository.requestAccountDeletion(other.user.id), {
        code: 'ACCOUNT_GENERATION_ACTIVE',
      });
      assert.equal((await repository.getUserById(other.user.id))?.status, 'ACTIVE');
      assert.equal(await prisma.accountDeletion.count({ where: { userId: other.user.id } }), 0);
    } finally {
      await prisma.creditWallet.update({ where: { userId: other.user.id }, data: { reserved: 0 } });
    }
  });

  await check('suspended accounts cannot request account deletion', async () => {
    await repository.updateUser(other.user.id, { status: 'SUSPENDED' });
    try {
      await assert.rejects(repository.requestAccountDeletion(other.user.id), {
        code: 'ACCOUNT_UNAVAILABLE',
      });
      assert.equal(await prisma.accountDeletion.count({ where: { userId: other.user.id } }), 0);
    } finally {
      await repository.updateUser(other.user.id, { status: 'ACTIVE' });
    }
  });

  // Cover generation-tree cascades and moderation rows lacking a direct userId.
  const child = await prisma.generation.create({
    data: {
      userId: target.user.id,
      projectId: target.project.id,
      parentGenerationId: target.generation.id,
      status: 'FAILED',
      quality: 'STANDARD',
      aspectRatio: '4:5',
      userInstruction: 'Synthetic child instruction',
    },
  });
  const indirectModeration = await prisma.moderationEvent.createManyAndReturn({
    data: [
      {
        generationId: child.id,
        stage: 'INPUT_TEXT',
        provider: 'SYNTHETIC_TEST',
        model: 'no-model-call',
        flagged: false,
        action: 'ALLOW',
      },
      {
        assetId: target.output.id,
        stage: 'OUTPUT_IMAGE',
        provider: 'SYNTHETIC_TEST',
        model: 'no-model-call',
        flagged: false,
        action: 'ALLOW',
      },
    ],
  });

  const requestedAt = Date.now();
  const deletion = await repository.requestAccountDeletion(target.user.id);
  await check(
    'deletion captures exact asset manifest and keyed identities, and revokes sessions',
    async () => {
      assert.deepEqual(
        [...deletion.storageKeys].sort(),
        [target.source.storageKey, target.output.storageKey].sort(),
      );
      assert.deepEqual(
        [...deletion.identityHashes].sort(),
        [
          deletionIdentityHash(identitySecret, 'email', target.user.email),
          deletionIdentityHash(identitySecret, 'GOOGLE', providerSubject),
        ].sort(),
      );
      assert(deletion.identityHashes.every((value) => /^[a-f0-9]{64}$/.test(value)));
      assert(deletion.notBefore.getTime() >= requestedAt + DELETION_GRACE_MS);
      assert.equal((await repository.getUserById(target.user.id))?.status, 'DELETION_PENDING');
      assert.equal(
        await prisma.session.count({ where: { userId: target.user.id, revokedAt: null } }),
        0,
      );
      assert.equal(
        (await prisma.session.findUniqueOrThrow({ where: { id: target.session.id } }))
          .revokedReason,
        'ACCOUNT_DELETION',
      );
      assert.equal(
        (await repository.requestAccountDeletion(target.user.id)).createdAt.getTime(),
        deletion.createdAt.getTime(),
      );
      assert(
        !(await repository.listPendingAccountDeletions(new Date(), 100)).some(
          (row) => row.userId === target.user.id,
        ),
      );
      assert(
        (
          await repository.listPendingAccountDeletions(
            new Date(deletion.notBefore.getTime() + 1),
            100,
          )
        ).some((row) => row.userId === target.user.id),
      );
    },
  );

  await check(
    'pending deletion rejects new uploads, linked identities, and credit reservations',
    async () => {
      await assert.rejects(repository.createAsset(assetInput(target.user.id, 'late-source')), {
        code: 'ACCOUNT_UNAVAILABLE',
      });
      await assert.rejects(
        repository.linkAuthAccount({
          userId: target.user.id,
          provider: 'GOOGLE',
          providerAccountId: `late-${runId}`,
          providerEmail: target.user.email,
        }),
        { code: 'ACCOUNT_UNAVAILABLE' },
      );
      await assert.rejects(
        repository.reserveCredits({
          userId: target.user.id,
          generationId: target.generation.id,
          amount: 1,
        }),
        { code: 'ACCOUNT_UNAVAILABLE' },
      );
    },
  );

  await check('pending deletion rejects a late project creation', async () => {
    await assert.rejects(repository.createProject(projectInput(target.user.id, target.source.id)), {
      code: 'ACCOUNT_UNAVAILABLE',
    });
  });

  // Repository completion is called after the service has deleted storage keys.
  // No real storage was written; advance only this synthetic manifest deadline.
  await prisma.accountDeletion.update({
    where: { userId: target.user.id },
    data: { notBefore: new Date(Date.now() - 1) },
  });
  await repository.completeAccountDeletion(target.user.id);
  await check(
    'completion removes all target personal records and dependent generations',
    async () => {
      assert.equal(await repository.getUserById(target.user.id), null);
      const userModels = [
        'profile',
        'authAccount',
        'userConsent',
        'session',
        'emailToken',
        'project',
        'generation',
        'creditWallet',
        'creditTransaction',
        'idempotencyRecord',
      ] as const;
      for (const model of userModels) {
        const delegate = prisma[model] as unknown as {
          count: (args: { where: { userId: string } }) => Promise<number>;
        };
        assert.equal(await delegate.count({ where: { userId: target.user.id } }), 0, model);
      }
      assert.equal(await prisma.asset.count({ where: { ownerId: target.user.id } }), 0);
      for (const model of ['generationInput', 'generationOutput', 'generationMessage'] as const) {
        const delegate = prisma[model] as unknown as {
          count: (args: { where: { generationId: { in: string[] } } }) => Promise<number>;
        };
        assert.equal(
          await delegate.count({
            where: { generationId: { in: [target.generation.id, child.id] } },
          }),
          0,
          model,
        );
      }
      assert.equal(
        await prisma.pendingSocialLogin.count({ where: { providerEmail: target.user.email } }),
        0,
      );
      assert.equal(
        await prisma.moderationEvent.count({
          where: { id: { in: [target.moderation.id, ...indirectModeration.map((row) => row.id)] } },
        }),
        0,
      );
    },
  );

  await check(
    'completed deletion keeps only the anti-abuse tombstone and is idempotent',
    async () => {
      const tombstone = await prisma.accountDeletion.findUniqueOrThrow({
        where: { userId: target.user.id },
      });
      assert(tombstone.completedAt);
      assert.deepEqual(tombstone.storageKeys, []);
      assert.deepEqual(tombstone.identityHashes, deletion.identityHashes);
      await repository.completeAccountDeletion(target.user.id);
      assert.equal(
        (
          await prisma.accountDeletion.findUniqueOrThrow({ where: { userId: target.user.id } })
        ).completedAt?.getTime(),
        tombstone.completedAt.getTime(),
      );
    },
  );

  await check(
    'another account and its assets, results, moderation, auth, and credits survive untouched',
    async () => {
      assert.equal((await repository.getUserById(other.user.id))?.status, 'ACTIVE');
      assert.equal(
        await prisma.asset.count({ where: { id: { in: [other.source.id, other.output.id] } } }),
        2,
      );
      assert.equal(await prisma.project.count({ where: { id: other.project.id } }), 1);
      assert.equal(await prisma.generation.count({ where: { id: other.generation.id } }), 1);
      assert.equal(
        await prisma.generationOutput.count({ where: { generationId: other.generation.id } }),
        1,
      );
      assert.equal(await prisma.moderationEvent.count({ where: { id: other.moderation.id } }), 1);
      assert.equal(
        await prisma.pendingSocialLogin.count({ where: { providerEmail: other.user.email } }),
        1,
      );
      assert.equal(await prisma.idempotencyRecord.count({ where: { userId: other.user.id } }), 1);
      assert.equal(await prisma.userConsent.count({ where: { userId: other.user.id } }), 1);
      assert.equal(
        await prisma.session.count({ where: { userId: other.user.id, revokedAt: null } }),
        1,
      );
      assert.equal((await repository.getWallet(other.user.id)).available, WELCOME_CREDIT_AMOUNT);
    },
  );

  await check('re-registering the deleted email cannot get another welcome grant', async () => {
    const returning = await repository.createUser(registration(target.user.email.toUpperCase()));
    assert.notEqual(returning.id, target.user.id);
    const wallet = await repository.getWallet(returning.id);
    assert.equal(wallet.available, 0);
    assert.equal(wallet.lifetimeEarned, 0);
    assert.equal(
      await prisma.creditTransaction.count({ where: { userId: returning.id, type: 'BONUS' } }),
      0,
    );
  });

  await check(
    'same social provider subject with a changed email cannot regain welcome credits',
    async () => {
      const input = registration(`changed-${runId}@example.invalid`);
      const returning = await repository.createVerifiedSocialUser({
        ...input,
        dateOfBirth: input.dateOfBirth!,
        provider: 'GOOGLE',
        providerAccountId: providerSubject,
        providerEmail: input.email,
        consents: input.consents.map((consent) => ({ ...consent, source: 'SOCIAL_REGISTRATION' })),
      });
      assert.equal(returning.status, 'ACTIVE');
      assert.equal((await repository.getWallet(returning.id)).available, 0);
      assert.equal(
        await prisma.creditTransaction.count({ where: { userId: returning.id, type: 'BONUS' } }),
        0,
      );
    },
  );

  console.log(
    `${passed} checks passed; ${failures.length} failed. Isolated database retained: ${databaseName}`,
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
