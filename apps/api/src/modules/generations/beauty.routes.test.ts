import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { MemoryRepository } from '@birkare/database';
import { catalogFixtures, forbidden, type BeautySettings } from '@birkare/shared';
import type { ApiDependencies } from '../../services/dependencies.js';
import { TokenService } from '../../services/token.service.js';
import { createErrorMiddleware } from '../../middleware/error.middleware.js';
import { createGenerationsRouter } from './generations.routes.js';

test('HTTP beauty prices layers, protects premium tools with PRO, replays idempotently and revises from original', async () => {
  // Isolated account, repository and queue; no real images, credits or AI requests.
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'beauty@example.test',
    firstName: 'Beauty',
    lastName: 'Test',
    passwordHash: 'unused',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    consents: [],
  });
  const active = await repository.updateUser(user.id, {
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
  });
  await repository.grantCredits({
    userId: user.id,
    amount: 21,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: user.id,
    idempotencyKey: `test-fixture:${user.id}`,
  });
  const session = await repository.createSession({
    userId: user.id,
    refreshTokenHash: 'test-only-beauty',
    expiresAt: new Date(Date.now() + 60000),
  });
  const tokenService = new TokenService({
    JWT_ACCESS_SECRET: 'test-only-access-secret-with-enough-length',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_ISSUER: 'https://api.example.test',
    JWT_USER_AUDIENCE: 'birkare-mobile',
  });
  const { accessToken } = await tokenService.issueAccessToken(active, session.id);
  const source = await repository.createAsset({
    ownerId: user.id,
    type: 'USER_SOURCE',
    storageProvider: 'local',
    storageKey: 'test-original.png',
    originalName: 'test.png',
    mimeType: 'image/png',
    sizeBytes: 1,
    sha256: null,
  });
  await repository.updateAsset(source.id, { status: 'READY' });
  const style = catalogFixtures.styles.find((item) => item.slug === 'natural-light')!;
  const project = await repository.createProject({
    userId: user.id,
    title: 'Beauty test',
    mode: 'AI_FILTER',
    sourceAssetId: source.id,
    sceneTemplateId: null,
    stylePresetId: style.id,
    featuredPersonId: null,
    composition: 'CLOSE',
    aspectRatio: '4:5',
  });
  const queued: string[] = [];
  let proActive = false;
  let proChecks = 0;
  const deps = {
    repository,
    tokenService,
    generationQueue: {
      enqueue: async ({ generationId }: { generationId: string }) => {
        queued.push(generationId);
      },
    },
    revenueCatService: {
      assertActive: async () => {
        proChecks += 1;
        if (!proActive) throw forbidden('BIRKARE_PRO_REQUIRED', 'BirKare Pro gerekli.');
      },
    },
    config: {
      DISABLE_ALL_GENERATION: false,
      AI_PROVIDER: 'fake',
      OPENAI_IMAGE_MODEL: 'test-flare',
      OPENAI_IMAGE_PREMIUM_MODEL: 'test-sunburst',
      QUEUE_DRIVER: 'memory',
    },
  } as unknown as ApiDependencies;
  const app = express();
  app.use(express.json());
  app.use('/v1/generations', createGenerationsRouter(deps));
  app.use(
    createErrorMiddleware({ error() {}, warn() {} } as unknown as ApiDependencies['logger'], false),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/generations`;
  const beauty: BeautySettings = {
    adjustments: {
      naturalBalance: 35,
      blemishRemoval: 65,
      skinSmoothing: 30,
      underEyeCorrection: 0,
      skinGlow: 0,
      faceContour: 0,
      youthfulLook: 0,
    },
    makeup: { preset: 'nude', intensity: 40 },
    preserveSkinTexture: true,
    preserveFrecklesAndMoles: true,
  };
  const payload = {
    projectId: project.id,
    sourceAssetId: source.id,
    mode: 'AI_FILTER',
    stylePresetId: style.id,
    quality: 'STANDARD',
    numberOfImages: 1,
    disclosureAccepted: true,
    beauty,
  };
  const post = async (path: string, body: unknown, key: string) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: (await response.json()) as {
        data: {
          generationId: string;
          creditCost: number;
          modelLane: 'FAST' | 'PREMIUM';
        };
        error: { code: string };
      },
    };
  };
  try {
    const started = await post('', payload, 'beauty-test-start');
    assert.equal(started.status, 202);
    const id = started.body.data.generationId;
    const startedRecipe = (await repository.getGenerationById(id))?.recipe;
    assert.equal(startedRecipe?.version, 1);
    assert.deepEqual(startedRecipe?.version === 1 ? startedRecipe.beauty : undefined, beauty);
    assert.equal((await repository.getGenerationById(id))?.model, 'test-sunburst');
    assert.equal((await repository.getGenerationById(id))?.reservedCredits, 7);
    const standardQuote = await post(
      '/quote',
      { ...payload, quality: 'STANDARD' },
      'beauty-standard-quote',
    );
    assert.equal(standardQuote.status, 200);
    assert.equal(standardQuote.body.data.creditCost, 7);
    assert.equal(standardQuote.body.data.modelLane, 'PREMIUM');
    const replay = await post('', payload, 'beauty-test-start');
    assert.equal(replay.status, 202);
    assert.equal(replay.body.data.generationId, id);
    assert.equal(queued.length, 1);
    const beforePro = await repository.getWallet(user.id);
    const premium = {
      ...payload,
      beauty: { ...beauty, adjustments: { ...beauty.adjustments, faceContour: 1 } },
    };
    const lockedQuote = await post('/quote', premium, 'beauty-test-premium-quote-locked');
    assert.equal(lockedQuote.status, 200);
    assert.equal(lockedQuote.body.data.creditCost, 8);
    const blocked = await post('', premium, 'beauty-test-premium');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, 'BIRKARE_PRO_REQUIRED');
    assert.deepEqual(await repository.getWallet(user.id), beforePro);
    assert.equal(proChecks, 1, 'quote is informational; PRO is enforced before reservation');
    proActive = true;
    const premiumQuote = await post('/quote', premium, 'beauty-premium-quote');
    assert.equal(premiumQuote.status, 200);
    assert.equal(premiumQuote.body.data.creditCost, 8);
    const premiumStart = await post('', premium, 'beauty-premium-start');
    assert.equal(premiumStart.status, 202);
    assert.equal(
      (await repository.getGenerationById(premiumStart.body.data.generationId))?.reservedCredits,
      8,
    );
    assert.equal(proChecks, 2);
    const wrongStyle = await post(
      '/quote',
      {
        ...payload,
        stylePresetId: catalogFixtures.styles.find((item) => item.slug === 'studio')!.id,
      },
      'beauty-wrong-style',
    );
    assert.equal(wrongStyle.status, 400);
    assert.equal(wrongStyle.body.error.code, 'BEAUTY_STYLE_INVALID');
    const preview = await post(
      '/preview',
      {
        ...payload,
        quality: 'PREVIEW',
        beauty: { ...beauty, makeup: { preset: 'none', intensity: 0 } },
      },
      'beauty-test-preview',
    );
    assert.equal(preview.status, 202);
    const previewRecipe = (await repository.getGenerationById(preview.body.data.generationId))
      ?.recipe;
    assert.equal(
      previewRecipe?.version === 1 ? previewRecipe.beauty?.makeup.preset : undefined,
      'none',
    );
    const output = await repository.addGenerationOutput({
      generationId: id,
      assetId: 'synthetic-output-asset',
      variantIndex: 0,
      selected: true,
      watermarkApplied: false,
      disclosureType: 'AI_GENERATED',
    });
    await repository.updateGeneration(id, { status: 'COMPLETED' });
    const revision = await post(
      `/${id}/revisions`,
      { sourceOutputId: output.id, instruction: 'Keep the retouch subtle', quality: 'PREVIEW' },
      'beauty-test-revision',
    );
    assert.equal(revision.status, 202);
    const revised = await repository.getGenerationById(revision.body.data.generationId);
    assert.equal(revised?.sourceAssetId, source.id);
    assert.deepEqual(revised?.recipe?.version === 1 ? revised.recipe.beauty : undefined, beauty);
    assert.equal(queued.length, 4);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
