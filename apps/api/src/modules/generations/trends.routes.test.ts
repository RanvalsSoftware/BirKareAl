import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { MemoryRepository } from '@birkare/database';
import { catalogFixtures } from '@birkare/shared';
import type { ApiDependencies } from '../../services/dependencies.js';
import { TokenService } from '../../services/token.service.js';
import { createErrorMiddleware } from '../../middleware/error.middleware.js';
import { createGenerationsRouter } from './generations.routes.js';

test('HTTP trends validate quote, snapshot choice, replay safely, preview and revise from original', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'trends@example.test',
    firstName: 'Trend',
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
  const session = await repository.createSession({
    userId: user.id,
    refreshTokenHash: 'test-trend-session',
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
    title: 'Trend test',
    mode: 'AI_FILTER',
    sourceAssetId: source.id,
    sceneTemplateId: null,
    stylePresetId: style.id,
    featuredPersonId: null,
    composition: 'CLOSE',
    aspectRatio: '4:5',
  });
  const queued: string[] = [];
  const deps = {
    repository,
    tokenService,
    generationQueue: {
      enqueue: async ({ generationId }: { generationId: string }) => {
        queued.push(generationId);
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
  const payload = {
    projectId: project.id,
    sourceAssetId: source.id,
    mode: 'AI_FILTER',
    stylePresetId: style.id,
    sceneTemplateId: null,
    featuredPersonId: null,
    quality: 'PREVIEW',
    numberOfImages: 1,
    disclosureAccepted: true,
    trendPreset: 'kpop_star',
    filterIntensity: 80,
    preserveFace: true,
    preserveClothes: false,
  };
  const post = async (path: string, body: unknown, key = 'trend-test-default') => {
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
          availableCredits: number;
          canGenerate: boolean;
          modelLane: 'FAST' | 'PREMIUM';
        };
        error: { code: string };
      },
    };
  };
  try {
    const previewQuote = await post('/quote', payload);
    assert.equal(previewQuote.status, 200);
    assert.equal(previewQuote.body.data.creditCost, 3);
    assert.equal(previewQuote.body.data.modelLane, 'FAST');
    const hdQuote = await post('/quote', { ...payload, quality: 'HD' });
    assert.equal(hdQuote.status, 200);
    assert.equal(hdQuote.body.data.creditCost, 12);
    assert.equal(hdQuote.body.data.modelLane, 'PREMIUM');
    assert.equal(hdQuote.body.data.canGenerate, true);
    const fourHdQuote = await post('/quote', {
      ...payload,
      quality: 'HD',
      numberOfImages: 4,
    });
    assert.equal(fourHdQuote.status, 200);
    assert.equal(fourHdQuote.body.data.creditCost, 48);
    assert.equal(fourHdQuote.body.data.canGenerate, false);

    const sceneQuote = await post('/quote', {
      ...payload,
      mode: 'FULL_SCENE',
      quality: 'STANDARD',
      trendPreset: undefined,
      stylePresetId: null,
      sceneTemplateId: catalogFixtures.scenes[0]!.id,
      preserveClothes: true,
    });
    assert.equal(sceneQuote.status, 200);
    assert.equal(sceneQuote.body.data.creditCost, 7);
    assert.equal(sceneQuote.body.data.modelLane, 'PREMIUM');
    const before = await repository.getWallet(user.id);
    for (const change of [
      { stylePresetId: catalogFixtures.styles.find((s) => s.slug === 'studio')!.id },
      { mode: 'FULL_SCENE', sceneTemplateId: catalogFixtures.scenes[0]!.id },
      { trendPreset: 'unknown-trend' },
      { transformation: { kind: 'gender-swap', presentation: 'feminine' } },
    ])
      assert.equal((await post('/quote', { ...payload, ...change })).status, 400);
    assert.deepEqual(await repository.getWallet(user.id), before);
    assert.equal(queued.length, 0);

    const started = await post('', payload, 'trend-test-start');
    assert.equal(started.status, 202);
    const id = started.body.data.generationId;
    const job = await repository.getGenerationById(id);
    assert.equal(job?.recipe?.version === 1 ? job.recipe.trendPreset : undefined, 'kpop_star');
    assert.equal(job?.recipe?.version === 1 ? job.recipe.filterIntensity : undefined, 80);
    assert.equal(job?.preserveClothes, false);
    assert.equal(job?.model, 'test-flare');
    assert.deepEqual(job?.recipe?.version === 1 ? job.recipe.selection : undefined, {
      sceneTemplateId: null,
      featuredPersonId: null,
      stylePresetId: style.id,
    });
    const replay = await post('', payload, 'trend-test-start');
    assert.equal(replay.status, 202);
    assert.equal(replay.body.data.generationId, id);
    assert.equal(queued.length, 1);
    assert.equal(
      (await post('', { ...payload, trendPreset: 'analog_90s' }, 'trend-test-start')).status,
      409,
    );

    const preview = await post(
      '/preview',
      { ...payload, trendPreset: 'old_money_portrait', filterIntensity: 20 },
      'trend-test-preview',
    );
    assert.equal(preview.status, 202);
    const previewRecipe = (await repository.getGenerationById(preview.body.data.generationId))
      ?.recipe;
    assert.equal(
      previewRecipe?.version === 1 ? previewRecipe.trendPreset : undefined,
      'old_money_portrait',
    );
    const output = await repository.addGenerationOutput({
      generationId: id,
      assetId: 'test-generated-output',
      variantIndex: 0,
      selected: true,
      watermarkApplied: false,
      disclosureType: 'AI_GENERATED',
    });
    await repository.updateGeneration(id, { status: 'COMPLETED' });
    await repository.updateProject(project.id, {
      stylePresetId: catalogFixtures.styles.find((s) => s.slug === 'studio')!.id,
      featuredPersonId: catalogFixtures.featuredPeople[0]!.id,
      sceneTemplateId: catalogFixtures.scenes[0]!.id,
    });
    const revision = await post(
      `/${id}/revisions`,
      { sourceOutputId: output.id, instruction: 'Keep lighting soft', quality: 'PREVIEW' },
      'trend-test-revision',
    );
    assert.equal(revision.status, 202);
    const revised = await repository.getGenerationById(revision.body.data.generationId);
    assert.equal(revised?.sourceAssetId, source.id);
    assert.equal(
      revised?.recipe?.version === 1 ? revised.recipe.trendPreset : undefined,
      'kpop_star',
    );
    assert.equal(
      revised?.recipe?.version === 1 ? revised.recipe.selection?.stylePresetId : undefined,
      style.id,
    );
    assert.equal(
      revised?.reservedCredits,
      3,
      'Mutable project characters must not add a surcharge to the original trend recipe',
    );

    const priorInvalid = await repository.getWallet(user.id);
    await repository.updateAsset(source.id, { deletedAt: new Date() });
    const invalid = await post('', payload, 'trend-test-deleted');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'TREND_ORIGINAL_REQUIRED');
    assert.deepEqual(await repository.getWallet(user.id), priorInvalid);
    assert.equal(queued.length, 3);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
