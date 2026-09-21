import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  FakeImageGenerationProvider,
  FakeModerationProvider,
  DisabledModerationProvider,
  OpenAIImageGenerationProvider,
  OpenAIModerationProvider,
  STUDIO_CATALOG_VERSION,
  STUDIO_PRICING_VERSION,
  STUDIO_PROMPT_VERSION,
  buildStudioPrompt,
  getStudioSelection,
  providerFailure,
  runGeneration,
  type ImageGenerationInput,
  type ImageGenerationProvider,
  type ModerationProvider,
} from '@birkare/ai';
import { MemoryRepository, type StudioGenerationRecipe } from '@birkare/database';
import type { StorageProvider } from '@birkare/storage';
import { ApiError } from '@birkare/shared';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0dYAAAAASUVORK5CYII=',
  'base64',
);
const render: ImageGenerationInput = {
  requestId: 'runtime-test',
  prompt: 'A neutral studio portrait.',
  quality: 'low',
  size: '1024x1280',
  numberOfImages: 1,
  sourceImages: [{ buffer: png, mimeType: 'image/png', role: 'USER' }],
};

test('real SDK transport does not retry a rejected paid image request', async () => {
  let calls = 0;
  const provider = new OpenAIImageGenerationProvider(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_IMAGE_MODEL: 'gpt-image-1-mini' },
    {
      fetch: async () => {
        calls += 1;
        return new Response(
          JSON.stringify({
            error: {
              type: 'insufficient_quota',
              code: 'insufficient_quota',
              message: 'private-provider-detail',
            },
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_test_safe' },
          },
        );
      },
    },
  );
  await assert.rejects(provider.generate(render), (error: unknown) => {
    assert.equal((error as { code: string }).code, 'PROVIDER_QUOTA_EXHAUSTED');
    assert.doesNotMatch(String(error), /private-provider-detail/);
    return true;
  });
  assert.equal(calls, 1);
});

test('SDK image editing uses the configured model, supported canvas and original source', async () => {
  let body = '';
  const provider = new OpenAIImageGenerationProvider(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_IMAGE_MODEL: 'gpt-image-1-mini' },
    {
      fetch: async (_url, init) => {
        body = await new Response(init?.body).text();
        return new Response(
          JSON.stringify({
            data: [{ b64_json: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64') }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_test_safe' },
          },
        );
      },
    },
  );
  const result = await provider.generate(render);
  assert.match(body, /gpt-image-1-mini/);
  assert.match(body, /1024x1536/);
  assert.match(body, /1-user.png/);
  assert.match(body, /name="moderation"\r\n\r\nauto/);
  assert.doesNotMatch(body, /input_fidelity/);
  assert.equal(result.images.length, 1);
  assert.equal(result.providerRequestId, 'req_test_safe');
});

test('GPT Image 2 keeps the exact requested ratio, high-fidelity default and usage metrics', async () => {
  let form: FormData | undefined;
  const provider = new OpenAIImageGenerationProvider(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_IMAGE_MODEL: 'gpt-image-1-mini' },
    {
      fetch: async (_url, init) => {
        form = await new Response(init?.body, { headers: init?.headers }).formData();
        return new Response(
          JSON.stringify({
            data: [{ b64_json: png.toString('base64') }],
            usage: { input_tokens: 321, output_tokens: 654 },
          }),
          {
            headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_gpt_image_2' },
          },
        );
      },
    },
  );
  const result = await provider.generate({ ...render, model: 'gpt-image-2.5-flare' });
  assert.equal(form?.get('model'), 'gpt-image-2.5-flare');
  assert.equal(form?.get('size'), '1024x1280');
  assert.equal(form?.get('input_fidelity'), null);
  assert.deepEqual(result.usage, { inputTokens: 321, outputTokens: 654 });
});

test('SDK sends PNG and JPEG source bytes unchanged to the image edit endpoint', async () => {
  for (const source of [
    { buffer: png, mimeType: 'image/png', extension: 'png' },
    {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      mimeType: 'image/jpeg',
      extension: 'jpeg',
    },
  ] as const) {
    let calls = 0;
    const provider = new OpenAIImageGenerationProvider(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_IMAGE_MODEL: 'gpt-image-1-mini' },
      {
        fetch: async (url, init) => {
          calls += 1;
          assert.equal(new URL(String(url)).pathname, '/v1/images/edits');
          assert.equal(init?.method, 'POST');
          const body = await new Response(init?.body, { headers: init?.headers }).formData();
          const files = [...body.values()].filter((value) => typeof value !== 'string');
          assert.equal(files.length, 1);
          assert.equal(files[0]!.type, source.mimeType);
          assert.equal(files[0]!.name, `1-user.${source.extension}`);
          assert.deepEqual(Buffer.from(await files[0]!.arrayBuffer()), source.buffer);
          assert.equal(body.get('model'), 'gpt-image-1-mini');
          assert.equal(body.get('quality'), 'low');
          assert.equal(body.get('moderation'), 'auto');
          assert.equal(body.get('n'), '1');
          assert.equal(body.get('prompt'), render.prompt);
          return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    );
    await provider.generate({
      ...render,
      sourceImages: [{ buffer: source.buffer, mimeType: source.mimeType, role: 'USER' }],
    });
    assert.equal(calls, 1);
  }
});

test('SDK output rejection preserves diagnostic context without retrying or returning an image', async () => {
  let calls = 0;
  const provider = new OpenAIImageGenerationProvider(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_IMAGE_MODEL: 'gpt-image-1-mini' },
    {
      fetch: async () => {
        calls += 1;
        return new Response(
          JSON.stringify({
            error: {
              code: 'moderation_blocked',
              type: 'image_generation_user_error',
              message: 'private-provider-body',
              moderation_details: { moderation_stage: 'output', categories: [] },
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_output_test' },
          },
        );
      },
    },
  );
  await assert.rejects(provider.generate(render), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'MODERATION_BLOCKED');
    assert.equal(error.details?.moderationStage, 'output');
    assert.equal(error.details?.providerRequestId, 'req_output_test');
    assert.equal(error.details?.providerStatus, 400);
    assert.deepEqual(error.details?.moderationCategories, []);
    assert.doesNotMatch(JSON.stringify(error), /private-provider-body/);
    return true;
  });
  assert.equal(calls, 1);
});

test('moderation sends the actual original image with bounded optional text before rendering', async () => {
  let body:
    { input: Array<{ type: string; text?: string; image_url?: { url: string } }> } | undefined;
  const provider = new OpenAIModerationProvider(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_MODERATION_MODEL: 'omni-moderation-latest' },
    {
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ results: [{ flagged: false, categories: { sexual: false } }] }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  );
  assert.equal(
    (
      await provider.moderateText({
        text: '',
        requestId: 'test',
        sourceImages: render.sourceImages,
      })
    ).flagged,
    false,
  );
  assert.equal(body?.input[0]?.type, 'text');
  assert.ok(body?.input[0]?.text?.length);
  assert.equal(body?.input[1]?.image_url?.url, `data:image/png;base64,${png.toString('base64')}`);
});

test('a malformed or unreachable moderation service fails closed instead of returning a safe result', async () => {
  for (const mode of ['malformed', 'network'] as const) {
    const provider = new OpenAIModerationProvider(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_MODERATION_MODEL: 'omni-moderation-latest' },
      {
        fetch: async () => {
          if (mode === 'network') throw new TypeError('private-provider-host-and-token');
          return new Response(JSON.stringify({ results: [] }), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    );
    await assert.rejects(
      provider.moderateText({ text: 'Photo retouch', requestId: 'test' }),
      (error: unknown) => {
        assert.equal((error as { code: string }).code, 'MODERATION_UNAVAILABLE');
        assert.doesNotMatch(String(error), /private-provider-host-and-token/);
        return true;
      },
    );
  }
});

test('moderation transport preserves account and budget failures without exposing SDK details or retrying', async () => {
  const cases = [
    [401, 'invalid_api_key', 'PROVIDER_CONFIGURATION_ERROR'],
    [403, 'permission_denied', 'PROVIDER_CONFIGURATION_ERROR'],
    [404, 'model_not_found', 'PROVIDER_CONFIGURATION_ERROR'],
    [429, 'credit_balance_exhausted', 'PROVIDER_QUOTA_EXHAUSTED'],
    [429, 'project_spend_limit_exceeded', 'PROVIDER_QUOTA_EXHAUSTED'],
    [429, 'organization_spend_limit_exceeded', 'PROVIDER_QUOTA_EXHAUSTED'],
    [429, 'slow_down', 'PROVIDER_RATE_LIMITED'],
  ] as const;
  for (const [status, providerCode, expectedCode] of cases) {
    let calls = 0;
    const provider = new OpenAIModerationProvider(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_MODERATION_MODEL: 'omni-moderation-latest' },
      {
        fetch: async () => {
          calls += 1;
          return new Response(
            JSON.stringify({
              error: {
                code: providerCode,
                message: 'do-not-expose-sdk-body',
                type: 'test_error',
              },
            }),
            {
              status,
              headers: {
                'Content-Type': 'application/json',
                'x-request-id': 'req_moderation_test',
              },
            },
          );
        },
      },
    );
    await assert.rejects(
      provider.moderateText({ text: 'A neutral portrait.', requestId: 'test' }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.code, expectedCode);
        assert.equal(error.details?.providerCode, providerCode);
        assert.equal(error.details?.providerStatus, status);
        assert.equal(error.details?.providerRequestId, 'req_moderation_test');
        assert.doesNotMatch(JSON.stringify(error), /do-not-expose-sdk-body/);
        if (status === 401) assert.match(error.message, /Sunucunun AI erişim bilgileri/);
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test('non-success moderation responses never masquerade as a valid content verdict', async () => {
  for (const [status, code] of [
    [400, 'moderation_blocked'],
    [500, 'server_error'],
  ] as const) {
    const provider = new OpenAIModerationProvider(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_MODERATION_MODEL: 'omni-moderation-latest' },
      {
        fetch: async () =>
          new Response(JSON.stringify({ error: { code } }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
      },
    );
    await assert.rejects(
      provider.moderateText({ text: 'A neutral portrait.', requestId: 'test' }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.code, 'MODERATION_UNAVAILABLE');
        return true;
      },
    );
  }
});

async function fixture(options: { unlimited?: boolean } = {}) {
  const repository = new MemoryRepository();
  // MemoryRepository accepts arbitrary stage strings, but production PostgreSQL
  // uses this enum. Exercise the real schema contract in every runner test.
  const schema = readFileSync(
    new URL('../../../../../packages/database/prisma/schema.prisma', import.meta.url),
    'utf8',
  );
  const stageEnum = schema.match(/enum GenerationStage\s*\{([^}]+)\}/)?.[1];
  assert.ok(stageEnum);
  const stages = new Set(stageEnum.trim().split(/\s+/));
  const updateGeneration = repository.updateGeneration.bind(repository);
  repository.updateGeneration = async (id, patch) => {
    if (patch.stage != null) assert.ok(stages.has(patch.stage), `Invalid DB stage: ${patch.stage}`);
    return updateGeneration(id, patch);
  };
  const user = await repository.createUser({
    email: 'runtime@example.test',
    firstName: 'Runtime',
    lastName: 'Test',
    dateOfBirth: new Date('1990-01-01'),
    passwordHash: 'unused',
    locale: 'tr-TR',
    consents: [],
  });
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  await repository.grantCredits({
    userId: user.id,
    amount: 21,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: user.id,
    idempotencyKey: `test-fixture:${user.id}`,
  });
  if (options.unlimited) {
    const wallets = (
      repository as unknown as {
        wallets: Map<string, { unlimited?: boolean }>;
      }
    ).wallets;
    wallets.get(user.id)!.unlimited = true;
  }
  const walletBefore = await repository.getWallet(user.id);
  const asset = await repository.createAsset({
    ownerId: user.id,
    type: 'USER_SOURCE',
    storageProvider: 'local',
    storageKey: 'test/source.png',
    originalName: null,
    mimeType: 'image/png',
    sizeBytes: png.length,
    sha256: null,
  });
  await repository.updateAsset(asset.id, { status: 'READY' });
  const catalog = await repository.getCatalog();
  const style =
    catalog.styles.find((item) => item.slug === 'natural-light') ??
    catalog.filters.find((item) => item.slug === 'natural-light');
  assert.ok(style);
  const project = await repository.createProject({
    userId: user.id,
    title: 'Synthetic runtime test',
    mode: 'AI_FILTER',
    sourceAssetId: asset.id,
    sceneTemplateId: null,
    stylePresetId: style.id,
    featuredPersonId: null,
    composition: 'SELFIE',
    aspectRatio: '4:5',
  });
  const generation = await repository.createGeneration({
    userId: user.id,
    projectId: project.id,
    sourceAssetId: asset.id,
    parentGenerationId: null,
    quality: 'PREVIEW',
    requestedImageCount: 1,
    aspectRatio: '4:5',
    preserveFace: true,
    preserveClothes: true,
    recipe: null,
    userInstruction: '',
    provider: 'FAKE',
    model: 'test',
    reservedCredits: 2,
  });
  await repository.reserveCredits({ userId: user.id, generationId: generation.id, amount: 2 });
  const objects = new Map<string, Buffer>([['test/source.png', png]]);
  const storage: StorageProvider = {
    createUploadUrl: async ({ key }) => ({ url: key }),
    createDownloadUrl: async ({ key }) => key,
    putObject: async ({ key, body }) => {
      objects.set(key, body);
    },
    getObject: async (key) => objects.get(key)!,
    statObject: async (key) => ({ sizeBytes: objects.get(key)?.length ?? 0 }),
    exists: async (key) => objects.has(key),
    deleteObject: async (key) => {
      objects.delete(key);
    },
  };
  const logs: unknown[] = [];
  const logger = {
    info() {},
    warn() {},
    error(payload: unknown) {
      logs.push(payload);
    },
  };
  return { repository, user, walletBefore, generation, storage, logger, logs };
}

async function virtualTryOnFixture(invalidInputOrder = false) {
  const context = await fixture();
  const primary = await context.repository.getAssetById(context.generation.sourceAssetId);
  assert.ok(primary);
  const garmentBytes = Buffer.concat([png, Buffer.from([0x01])]);
  const garment = await context.repository.createAsset({
    ownerId: context.user.id,
    type: 'USER_SOURCE',
    storageProvider: 'local',
    storageKey: 'test/garment.png',
    originalName: null,
    mimeType: 'image/png',
    sizeBytes: garmentBytes.length,
    sha256: null,
  });
  await context.repository.updateAsset(garment.id, { status: 'READY' });
  await context.storage.putObject({
    key: garment.storageKey,
    body: garmentBytes,
    contentType: garment.mimeType,
    metadata: {},
  });
  const project = await context.repository.createProject({
    userId: context.user.id,
    title: 'Virtual try-on runtime test',
    mode: 'VIRTUAL_TRY_ON',
    sourceAssetId: primary.id,
    sceneTemplateId: null,
    stylePresetId: null,
    featuredPersonId: null,
    composition: 'WIDE',
    aspectRatio: '4:5',
  });
  const plan = getStudioSelection({
    kind: 'VIRTUAL_TRY_ON',
    sceneId: 'fashion-luxury-boutique',
  });
  assert.equal(plan.kind, 'VIRTUAL_TRY_ON');
  const recipe: StudioGenerationRecipe = {
    version: 2,
    studio: {
      kind: plan.kind,
      sceneId: plan.sceneId,
      taskType: plan.taskType,
    },
    catalogVersion: STUDIO_CATALOG_VERSION,
    promptVersion: STUDIO_PROMPT_VERSION,
    pricingVersion: STUDIO_PRICING_VERSION,
    modelLane: plan.modelLane,
    baseCredits: plan.baseCredits,
    hdExtraCredits: plan.hdExtraCredits,
  };
  const compiledPrompt = buildStudioPrompt({
    recipe: recipe.studio,
    promptVersion: recipe.promptVersion,
    aspectRatio: '4:5',
    quality: 'STANDARD',
    userInstruction: 'Keep the styling understated.',
  });
  const generation = await context.repository.createGeneration({
    userId: context.user.id,
    projectId: project.id,
    sourceAssetId: primary.id,
    parentGenerationId: null,
    quality: 'STANDARD',
    requestedImageCount: 1,
    aspectRatio: '4:5',
    preserveFace: true,
    preserveClothes: true,
    recipe,
    userInstruction: 'Keep the styling understated.',
    compiledPrompt,
    promptVersion: recipe.promptVersion,
    provider: 'FAKE',
    model: 'test-premium',
    reservedCredits: 10,
    inputs: invalidInputOrder
      ? [
          { assetId: garment.id, role: 'GARMENT', sortOrder: 0 },
          { assetId: primary.id, role: 'PRIMARY_PERSON', sortOrder: 1 },
        ]
      : [
          { assetId: primary.id, role: 'PRIMARY_PERSON', sortOrder: 0 },
          { assetId: garment.id, role: 'GARMENT', sortOrder: 1 },
        ],
  });
  await context.repository.reserveCredits({
    userId: context.user.id,
    generationId: generation.id,
    amount: 10,
  });
  return { ...context, generation, garmentBytes, compiledPrompt };
}

test('studio worker validates, moderates and renders every typed input in deterministic order', async () => {
  const context = await virtualTryOnFixture();
  assert.ok(context.generation.recipe?.version === 2);
  const previousPromptVersion = '2026-09-14-studio-prompts-v0';
  const immutablePrompt = `${context.compiledPrompt}\n\nIMMUTABLE_QUEUE_SNAPSHOT`;
  context.generation = await context.repository.updateGeneration(context.generation.id, {
    recipe: { ...context.generation.recipe, promptVersion: previousPromptVersion },
    promptVersion: previousPromptVersion,
    compiledPrompt: immutablePrompt,
  });
  let moderatedRoles: string[] = [];
  let renderedRoles: string[] = [];
  let renderedPrompt = '';
  const moderationProvider: ModerationProvider = {
    name: 'fake',
    async moderateText(input) {
      moderatedRoles = input.sourceImages?.map((image) => image.role) ?? [];
      assert.deepEqual(input.sourceImages?.[0]?.buffer, png);
      assert.deepEqual(input.sourceImages?.[1]?.buffer, context.garmentBytes);
      return { flagged: false, categories: [] };
    },
  };
  const fakeProvider = new FakeImageGenerationProvider();
  const imageProvider: ImageGenerationProvider = {
    name: 'fake',
    async generate(input) {
      renderedRoles = input.sourceImages.map((image) => image.role);
      renderedPrompt = input.prompt;
      return fakeProvider.generate(input);
    },
  };
  await runGeneration(
    { generationId: context.generation.id, requestId: 'studio-multi-input' },
    {
      ...context,
      imageProvider,
      moderationProvider,
      config: { OPENAI_IMAGE_MODEL: 'test-fast' },
    },
  );
  assert.deepEqual(moderatedRoles, ['PRIMARY_PERSON', 'GARMENT']);
  assert.deepEqual(renderedRoles, ['PRIMARY_PERSON', 'GARMENT']);
  assert.equal(
    renderedPrompt,
    immutablePrompt,
    'queued work must use its submitted prompt snapshot after a prompt registry deploy',
  );
  assert.equal(
    (await context.repository.getGenerationById(context.generation.id))?.status,
    'COMPLETED',
  );
});

test('studio worker rejects malformed input role order before moderation or paid rendering', async () => {
  const context = await virtualTryOnFixture(true);
  let moderationCalls = 0;
  let renderCalls = 0;
  await runGeneration(
    { generationId: context.generation.id, requestId: 'studio-invalid-input-order' },
    {
      ...context,
      moderationProvider: {
        name: 'fake',
        async moderateText() {
          moderationCalls += 1;
          return { flagged: false, categories: [] };
        },
      },
      imageProvider: {
        name: 'fake',
        async generate() {
          renderCalls += 1;
          throw new Error('must-not-render');
        },
      },
      config: { OPENAI_IMAGE_MODEL: 'test-fast' },
    },
  );
  const result = await context.repository.getGenerationById(context.generation.id);
  assert.equal(result?.status, 'FAILED');
  assert.equal(result?.failureCode, 'GENERATION_INPUT_ROLES_INVALID');
  assert.equal(result?.refundedCredits, 10);
  assert.equal(moderationCalls, 0);
  assert.equal(renderCalls, 0);
});

test('worker rejects an overwritten oversized source before reading it into memory', async () => {
  const context = await fixture();
  let reads = 0;
  let renders = 0;
  const storage: StorageProvider = {
    ...context.storage,
    statObject: async () => ({ sizeBytes: 15 * 1024 * 1024 + 1 }),
    getObject: async (key) => {
      reads += 1;
      return context.storage.getObject(key);
    },
  };
  await runGeneration(
    { generationId: context.generation.id, requestId: 'oversized-overwrite' },
    {
      ...context,
      storage,
      moderationProvider: new FakeModerationProvider(),
      imageProvider: {
        name: 'fake',
        async generate() {
          renders += 1;
          throw new Error('must-not-render');
        },
      },
      config: { OPENAI_IMAGE_MODEL: 'test' },
    },
  );
  const result = await context.repository.getGenerationById(context.generation.id);
  assert.equal(reads, 0);
  assert.equal(renders, 0);
  assert.equal(result?.status, 'FAILED');
  assert.equal(result?.failureCode, 'ASSET_INVALID_IMAGE');
  assert.equal(result?.refundedCredits, 2);
});

test('full runner saves a result and captures credits once, including queue redelivery', async () => {
  const context = await fixture();
  let submittedModel: string | undefined;
  const fakeProvider = new FakeImageGenerationProvider();
  const dependencies = {
    ...context,
    imageProvider: {
      name: 'fake' as const,
      async generate(input: ImageGenerationInput) {
        submittedModel = input.model;
        return fakeProvider.generate(input);
      },
    },
    moderationProvider: new FakeModerationProvider(),
    config: { OPENAI_IMAGE_MODEL: 'test' },
  };
  const job = { generationId: context.generation.id, requestId: 'synthetic-success' };
  await runGeneration(job, dependencies);
  await runGeneration(job, dependencies);
  const result = await context.repository.getGenerationById(job.generationId);
  assert.equal(result?.status, 'COMPLETED');
  assert.equal(result?.outputs.length, 1);
  assert.equal(submittedModel, context.generation.model);
  assert.equal(result?.chargedCredits, 2);
  const wallet = await context.repository.getWallet(context.user.id);
  assert.equal(wallet.reserved, 0);
  assert.equal(wallet.available, context.walletBefore.available - 2);
});

test('quota rejection finalizes visibly and releases credits once, without rerendering', async () => {
  const context = await fixture();
  let calls = 0;
  const imageProvider: ImageGenerationProvider = {
    name: 'openai',
    async generate() {
      calls += 1;
      throw providerFailure({
        status: 429,
        code: 'insufficient_quota',
        request_id: 'req_test_safe',
        message: 'private-user-prompt',
      });
    },
  };
  const dependencies = {
    ...context,
    imageProvider,
    moderationProvider: new FakeModerationProvider(),
    config: { OPENAI_IMAGE_MODEL: 'test' },
  };
  const job = { generationId: context.generation.id, requestId: 'synthetic-failure' };
  await runGeneration(job, dependencies);
  await runGeneration(job, dependencies);
  const result = await context.repository.getGenerationById(job.generationId);
  assert.equal(result?.status, 'FAILED');
  assert.equal(result?.failureCode, 'PROVIDER_QUOTA_EXHAUSTED');
  assert.equal(result?.providerRequestId, 'req_test_safe');
  assert.match(result?.failureMessage ?? '', /sunucu tarafında/);
  assert.equal(result?.refundedCredits, 2);
  assert.equal(calls, 1);
  const wallet = await context.repository.getWallet(context.user.id);
  assert.equal(wallet.reserved, 0);
  assert.equal(wallet.available, context.walletBefore.available);
  assert.doesNotMatch(JSON.stringify(context.logs), /private-user-prompt/);
});

test('flagged input photo blocks before any paid generation and refunds once', async () => {
  const context = await fixture();
  let calls = 0;
  const imageProvider: ImageGenerationProvider = {
    name: 'openai',
    async generate() {
      calls += 1;
      throw new Error('must-not-render');
    },
  };
  const moderationProvider: ModerationProvider = {
    name: 'openai',
    async moderateText(input) {
      assert.deepEqual(input.sourceImages?.[0]?.buffer, png);
      return { flagged: true, categories: ['sexual'] };
    },
  };
  const dependencies = {
    ...context,
    imageProvider,
    moderationProvider,
    config: { OPENAI_IMAGE_MODEL: 'test' },
  };
  const job = { generationId: context.generation.id, requestId: 'input-safety-test' };
  await runGeneration(job, dependencies);
  await runGeneration(job, dependencies);
  const result = await context.repository.getGenerationById(job.generationId);
  assert.equal(result?.status, 'BLOCKED');
  assert.equal(result?.stage, 'INPUT_MODERATION');
  assert.equal(result?.failureCode, 'INPUT_MODERATION_BLOCKED');
  assert.equal(result?.startedAt, null);
  assert.equal(result?.refundedCredits, 2);
  assert.equal(calls, 0);
  assert.equal(
    (await context.repository.getWallet(context.user.id)).available,
    context.walletBefore.available,
  );
});

test('moderation service failure stops safely and refunds rather than calling the renderer', async () => {
  const context = await fixture();
  let calls = 0;
  const imageProvider: ImageGenerationProvider = {
    name: 'openai',
    async generate() {
      calls += 1;
      throw new Error('must-not-render');
    },
  };
  const moderationProvider: ModerationProvider = {
    name: 'openai',
    async moderateText() {
      throw new ApiError({
        statusCode: 503,
        code: 'MODERATION_UNAVAILABLE',
        message: 'Güvenlik hizmetine ulaşılamadı.',
        expose: true,
      });
    },
  };
  await runGeneration(
    { generationId: context.generation.id, requestId: 'input-network-test' },
    { ...context, imageProvider, moderationProvider, config: { OPENAI_IMAGE_MODEL: 'test' } },
  );
  const result = await context.repository.getGenerationById(context.generation.id);
  assert.equal(result?.status, 'FAILED');
  assert.equal(result?.failureCode, 'MODERATION_UNAVAILABLE');
  assert.equal(result?.refundedCredits, 2);
  assert.equal(calls, 0);
});

test('passing preflight never overrides a later image-provider safety refusal', async () => {
  const context = await fixture();
  const imageProvider: ImageGenerationProvider = {
    name: 'openai',
    async generate() {
      throw providerFailure({
        status: 400,
        code: 'moderation_blocked',
        error: { moderation_details: { moderation_stage: 'output', categories: ['violence'] } },
      });
    },
  };
  await runGeneration(
    { generationId: context.generation.id, requestId: 'output-safety-test' },
    {
      ...context,
      imageProvider,
      moderationProvider: new FakeModerationProvider(),
      config: { OPENAI_IMAGE_MODEL: 'test' },
    },
  );
  const result = await context.repository.getGenerationById(context.generation.id);
  assert.equal(result?.status, 'BLOCKED');
  assert.equal(result?.stage, 'OUTPUT_MODERATION');
  assert.equal(result?.outputs.length, 0);
  assert.equal(result?.refundedCredits, 2);
});

test('all provider moderation stages persist a real database enum and settle once', async () => {
  for (const stage of ['input', 'output', 'unknown', undefined] as const) {
    const context = await fixture();
    let renders = 0;
    const imageProvider: ImageGenerationProvider = {
      name: 'openai',
      async generate() {
        renders += 1;
        throw providerFailure({
          status: 400,
          code: 'moderation_blocked',
          error: { moderation_details: { moderation_stage: stage, categories: [] } },
        });
      },
    };
    const dependencies = {
      ...context,
      imageProvider,
      moderationProvider: new FakeModerationProvider(),
      config: { OPENAI_IMAGE_MODEL: 'test' },
    };
    const job = { generationId: context.generation.id, requestId: 'all-safety-stages' };
    await runGeneration(job, dependencies);
    await runGeneration(job, dependencies);
    const result = await context.repository.getGenerationById(job.generationId);
    assert.equal(result?.status, 'BLOCKED');
    assert.equal(result?.progress, 100);
    assert.equal(
      result?.stage,
      stage === 'input'
        ? 'INPUT_MODERATION'
        : stage === 'output'
          ? 'OUTPUT_MODERATION'
          : 'MODERATION_PROVIDER',
    );
    assert.equal(result?.refundedCredits, 2);
    assert.equal(renders, 1);
    assert.equal(
      (await context.repository.listCreditTransactions(context.user.id)).filter(
        (item) => item.type === 'GENERATION_RELEASE',
      ).length,
      1,
    );
  }
});

test('refund failure rejects the queue job and redelivery settles without another paid render', async () => {
  const context = await fixture();
  const releaseCredits = context.repository.releaseCredits.bind(context.repository);
  let releases = 0;
  context.repository.releaseCredits = async (input) => {
    releases += 1;
    if (releases === 1) throw new Error('private-database-error');
    return releaseCredits(input);
  };
  let renders = 0;
  const dependencies = {
    ...context,
    imageProvider: {
      name: 'openai' as const,
      async generate() {
        renders += 1;
        throw providerFailure({ status: 400, code: 'moderation_blocked' });
      },
    },
    moderationProvider: new FakeModerationProvider(),
    config: { OPENAI_IMAGE_MODEL: 'test' },
  };
  const job = { generationId: context.generation.id, requestId: 'refund-retry' };
  await assert.rejects(runGeneration(job, dependencies), {
    code: 'GENERATION_FINALIZATION_FAILURE',
  });
  const pending = await context.repository.getGenerationById(job.generationId);
  assert.equal(pending?.status, 'BLOCKED');
  assert.equal(pending?.refundedCredits, 0);
  assert.match(pending?.failureMessage ?? '', /iadesi tamamlanıyor/);
  assert.doesNotMatch(pending?.failureMessage ?? '', /iade edildi/);
  await runGeneration(job, dependencies);
  await runGeneration(job, dependencies);
  assert.equal(renders, 1);
  assert.equal((await context.repository.getGenerationById(job.generationId))?.refundedCredits, 2);
  assert.equal(
    (await context.repository.getWallet(context.user.id)).available,
    context.walletBefore.available,
  );
  assert.doesNotMatch(JSON.stringify(context.logs), /private-database-error/);
});

test('lost terminal write cannot cause a paid render again on queue redelivery', async () => {
  const context = await fixture();
  const updateGeneration = context.repository.updateGeneration.bind(context.repository);
  const releaseCredits = context.repository.releaseCredits.bind(context.repository);
  let settlementFailsOnce = true;
  let fallbackWriteFailsOnce = true;
  context.repository.releaseCredits = async (input) => {
    if (input.finalization?.status === 'BLOCKED' && settlementFailsOnce) {
      settlementFailsOnce = false;
      throw new Error('simulated settlement outage');
    }
    return releaseCredits(input);
  };
  context.repository.updateGeneration = async (id, patch) => {
    if (patch.status === 'BLOCKED' && fallbackWriteFailsOnce) {
      fallbackWriteFailsOnce = false;
      throw new Error('simulated database outage');
    }
    return updateGeneration(id, patch);
  };
  let renders = 0;
  const dependencies = {
    ...context,
    imageProvider: {
      name: 'openai' as const,
      async generate() {
        renders += 1;
        throw providerFailure({ status: 400, code: 'moderation_blocked' });
      },
    },
    moderationProvider: new FakeModerationProvider(),
    config: { OPENAI_IMAGE_MODEL: 'test' },
  };
  const job = { generationId: context.generation.id, requestId: 'write-retry' };
  await assert.rejects(runGeneration(job, dependencies), {
    code: 'GENERATION_FINALIZATION_FAILURE',
  });
  await runGeneration(job, dependencies);
  assert.equal(renders, 1);
  const result = await context.repository.getGenerationById(job.generationId);
  assert.equal(result?.status, 'FAILED');
  assert.equal(result?.failureCode, 'GENERATION_INTERRUPTED');
  assert.equal(result?.refundedCredits, 2);
});

test('a cancellation during input moderation cannot restart the paid render', async () => {
  const context = await fixture();
  let calls = 0;
  const imageProvider: ImageGenerationProvider = {
    name: 'openai',
    async generate() {
      calls += 1;
      throw new Error('must-not-render');
    },
  };
  const moderationProvider: ModerationProvider = {
    name: 'openai',
    async moderateText() {
      await context.repository.releaseCredits({
        userId: context.user.id,
        generationId: context.generation.id,
        amount: 2,
        reason: 'test cancellation',
        finalization: {
          status: 'CANCELLED',
          stage: 'CANCELLED',
          progress: 100,
          refundedCredits: 2,
          completedAt: new Date(),
        },
      });
      return { flagged: false, categories: [] };
    },
  };
  await runGeneration(
    { generationId: context.generation.id, requestId: 'cancelled-preflight' },
    { ...context, imageProvider, moderationProvider, config: { OPENAI_IMAGE_MODEL: 'test' } },
  );
  assert.equal(
    (await context.repository.getGenerationById(context.generation.id))?.status,
    'CANCELLED',
  );
  assert.equal(calls, 0);
});

test('concurrent capture and release claim one reservation and only the winner finalizes', async () => {
  for (const first of ['capture', 'release'] as const) {
    const context = await fixture();
    const capture = () =>
      context.repository.captureCredits({
        userId: context.user.id,
        generationId: context.generation.id,
        amount: 2,
        finalization: {
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          chargedCredits: 2,
          completedAt: new Date(),
        },
      });
    const release = () =>
      context.repository.releaseCredits({
        userId: context.user.id,
        generationId: context.generation.id,
        amount: 2,
        reason: 'concurrent cancellation',
        finalization: {
          status: 'CANCELLED',
          stage: 'CANCELLED',
          progress: 100,
          refundedCredits: 2,
          completedAt: new Date(),
        },
      });
    const results = await Promise.all(
      first === 'capture' ? [capture(), release()] : [release(), capture()],
    );
    const winner = results.find((result) => result.applied);
    assert.ok(winner);
    assert.equal(results.filter((result) => result.applied).length, 1);
    assert.ok(results.every((result) => result.outcome === winner.outcome));

    const generation = await context.repository.getGenerationById(context.generation.id);
    const wallet = await context.repository.getWallet(context.user.id);
    assert.equal(wallet.reserved, 0);
    assert.equal(generation?.status, winner.outcome === 'CAPTURED' ? 'COMPLETED' : 'CANCELLED');
    assert.equal(
      wallet.available,
      winner.outcome === 'CAPTURED'
        ? context.walletBefore.available - 2
        : context.walletBefore.available,
    );
    assert.equal(
      wallet.lifetimeSpent,
      context.walletBefore.lifetimeSpent + (winner.outcome === 'CAPTURED' ? 2 : 0),
    );
    if (winner.outcome === 'RELEASED') {
      await context.repository.updateGeneration(context.generation.id, {
        status: 'MODERATING_OUTPUT',
        stage: 'OUTPUT_MODERATION',
      });
      assert.equal(
        (await context.repository.getGenerationById(context.generation.id))?.status,
        'CANCELLED',
        'a stale worker stage write must not resurrect a terminal cancellation',
      );
    }
    const settlements = (await context.repository.listCreditTransactions(context.user.id)).filter(
      (transaction) =>
        transaction.referenceId === context.generation.id &&
        (transaction.type === 'GENERATION_CAPTURE' || transaction.type === 'GENERATION_RELEASE'),
    );
    assert.equal(settlements.length, 1);
  }
});

test('unlimited reservations still settle exactly once without changing wallet counters', async () => {
  const context = await fixture({ unlimited: true });
  const before = await context.repository.getWallet(context.user.id);
  const results = await Promise.all([
    context.repository.releaseCredits({
      userId: context.user.id,
      generationId: context.generation.id,
      amount: 2,
      finalization: {
        status: 'CANCELLED',
        stage: 'CANCELLED',
        progress: 100,
        refundedCredits: 2,
        completedAt: new Date(),
      },
    }),
    context.repository.captureCredits({
      userId: context.user.id,
      generationId: context.generation.id,
      amount: 2,
      finalization: {
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        chargedCredits: 2,
        completedAt: new Date(),
      },
    }),
  ]);
  const after = await context.repository.getWallet(context.user.id);
  assert.equal(results.filter((result) => result.applied).length, 1);
  assert.deepEqual(
    {
      available: after.available,
      reserved: after.reserved,
      lifetimeEarned: after.lifetimeEarned,
      lifetimeSpent: after.lifetimeSpent,
      version: after.version,
    },
    {
      available: before.available,
      reserved: before.reserved,
      lifetimeEarned: before.lifetimeEarned,
      lifetimeSpent: before.lifetimeSpent,
      version: before.version,
    },
  );
  const settlements = (await context.repository.listCreditTransactions(context.user.id)).filter(
    (transaction) =>
      transaction.referenceId === context.generation.id &&
      (transaction.type === 'GENERATION_CAPTURE' || transaction.type === 'GENERATION_RELEASE'),
  );
  assert.equal(settlements.length, 1);
  assert.equal(settlements[0]?.amount, 0);
});

test('disabled safety service and rejected server credentials fail before rendering, with one release', async () => {
  const providers: ModerationProvider[] = [
    new DisabledModerationProvider(),
    new OpenAIModerationProvider(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_MODERATION_MODEL: 'omni-moderation-latest' },
      {
        fetch: async () =>
          new Response(
            JSON.stringify({ error: { code: 'invalid_api_key', message: 'hidden-credential' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
      },
    ),
  ];
  for (const moderationProvider of providers) {
    const context = await fixture();
    let renders = 0;
    const imageProvider: ImageGenerationProvider = {
      name: 'fake',
      async generate() {
        renders += 1;
        throw new Error('must-not-render');
      },
    };
    const job = { generationId: context.generation.id, requestId: 'technical-moderation-error' };
    const dependencies = {
      ...context,
      moderationProvider,
      imageProvider,
      config: { OPENAI_IMAGE_MODEL: 'test' },
    };
    await runGeneration(job, dependencies);
    await runGeneration(job, dependencies);
    const result = await context.repository.getGenerationById(context.generation.id);
    assert.equal(result?.status, 'FAILED');
    assert.equal(
      result?.failureCode,
      moderationProvider.name === 'disabled'
        ? 'MODERATION_UNAVAILABLE'
        : 'PROVIDER_CONFIGURATION_ERROR',
    );
    assert.equal(result?.startedAt, null);
    assert.equal(result?.refundedCredits, 2);
    assert.equal(result?.chargedCredits, 0);
    assert.equal(renders, 0);
    assert.equal(
      (await context.repository.getWallet(context.user.id)).available,
      context.walletBefore.available,
    );
    const transactions = await context.repository.listCreditTransactions(context.user.id);
    assert.equal(transactions.filter((item) => item.type === 'GENERATION_RELEASE').length, 1);
    assert.doesNotMatch(JSON.stringify(context.logs), /hidden-credential/);
  }
});
