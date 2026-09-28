import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiError, DUAL_PERSON_TREND_IDS, calculateCreditQuote } from '@birkare/shared';
import { MemoryRepository } from '@birkare/database';
import type { StorageProvider } from '@birkare/storage';
import { FakeModerationProvider, runGeneration } from '@birkare/ai';
import { buildTrendPrompt } from '../../../../../packages/ai/src/trend-prompt.js';
import { buildTrendPrompt as oldTrendPrompt } from '../../../../../packages/ai/src/legacy-trend-prompt.js';
import {
  GUARDED_TREND_IDS,
  normalizeTrendIntensity,
  TREND_QUALITY_PROMPT_VERSION,
} from '../../../../../packages/ai/src/trend-quality-policy.js';
import {
  loadTrendStyleReference,
  TREND_STYLE_FILES,
} from '../../../../../packages/ai/src/trend-style-reference.js';
import { TrendQualityImageProvider } from '../../../../../packages/ai/src/trend-quality-provider.js';
import {
  OpenAITrendQualityReviewer,
  parseTrendQualityReview,
  type TrendQualityVerdict,
  type TrendQualityReviewer,
} from '../../../../../packages/ai/src/trend-quality-review.js';
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ImageGenerationProvider,
  ImageReference,
} from '../../../../../packages/ai/src/types.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0dYAAAAASUVORK5CYII=', 'base64');
const output = (tag = 0) => ({ bytes: Buffer.concat([png, Buffer.from([tag])]), mimeType: 'image/png' });
const source = (role: ImageReference['role'] = 'USER', tag = 1): ImageReference => ({
  buffer: output(tag).bytes, mimeType: 'image/png', role,
});
const input = (patch: Partial<ImageGenerationInput> = {}): ImageGenerationInput => ({
  requestId: 'quality-test',
  model: 'gpt-image-2.5-sunburst',
  prompt: buildTrendPrompt('old_money_portrait', 60, '4:5'),
  sourceImages: [source()],
  quality: 'medium',
  size: '1024x1280',
  numberOfImages: 1,
  trend: { preset: 'old_money_portrait', intensity: 60 },
  assertActive: async () => undefined,
  ...patch,
});
const pass = (index = 0): TrendQualityVerdict => ({ index, verdict: 'PASS', defects: [] });
const retry = (index = 0): TrendQualityVerdict => ({ index, verdict: 'RETRY', defects: ['ANATOMY'] });
const codeIs = (code: string) => (error: unknown) => {
  assert.ok(error instanceof ApiError);
  assert.equal(error.code, code);
  return true;
};

function harness(verdicts: TrendQualityVerdict[][] = [[pass()]]) {
  const renders: ImageGenerationInput[] = [];
  const returned: ImageGenerationOutput[] = [];
  const reviews: ImageGenerationOutput['images'][] = [];
  let loads = 0;
  const renderer: ImageGenerationProvider = {
    name: 'fake',
    async generate(request) {
      renders.push(request);
      const result: ImageGenerationOutput = {
        providerRequestId: `req_render_${renders.length}`,
        images: Array.from({ length: request.numberOfImages }, (_, i) => output(renders.length * 10 + i)),
        usage: { inputTokens: 10, outputTokens: 20 },
      };
      returned.push(result);
      return result;
    },
  };
  const reviewer: TrendQualityReviewer = {
    async review(_request, images) {
      reviews.push(images);
      return {
        results: verdicts[reviews.length - 1] ?? [pass()],
        usage: { inputTokens: 3, outputTokens: 4 },
      };
    },
  };
  const loader = async () => { loads += 1; return source('STYLE_REFERENCE', 3); };
  const provider = new TrendQualityImageProvider(renderer, reviewer, loader);
  return { provider, renderer, reviewer, renders, returned, reviews, get loads() { return loads; } };
}

test('quality policy normalizes strength and zero omits target art direction', () => {
  assert.equal(normalizeTrendIntensity(-20), 0);
  assert.equal(normalizeTrendIntensity(500), 100);
  assert.equal(normalizeTrendIntensity(NaN), 60);
  assert.equal(normalizeTrendIntensity(34.6), 35);
  for (const preset of GUARDED_TREND_IDS) {
    const zero = buildTrendPrompt(preset, -5, '4:5');
    assert.doesNotMatch(zero, /CAMERA AND POSE|WARDROBE AND GROOMING|LIGHT AND PHOTOGRAPHIC FINISH/);
    const prompt = buildTrendPrompt(preset, 60, '4:5', 'Arka planı yağmurlu İstanbul yap.');
    assert.match(prompt, /BACKGROUND OVERRIDE/);
    assert.match(prompt, /more surrounding space, not permission to guess limbs/);
    assert.doesNotMatch(prompt, /never widen the crop/);
    assert.match(prompt, /Arka planı yağmurlu İstanbul yap/);
  }
});

test('two-person directions contain no contradictory solo-only identity or framing commands', () => {
  for (const preset of DUAL_PERSON_TREND_IDS) {
    const prompt = buildTrendPrompt(preset, 60, '4:5', '', true);
    assert.match(prompt, /INPUT IMAGE 1 contains person A and INPUT IMAGE 2 contains person B/);
    assert.match(prompt, /independent identity authorities/);
    assert.match(prompt, /exactly these two foreground people/);
    assert.doesNotMatch(prompt, /sole identity authority|single source person remains a solo portrait|confident solo dinner portrait/i);
  }
  assert.throws(() => buildTrendPrompt('kpop_star', 60, '4:5', '', true));
  assert.throws(() => buildTrendPrompt('romantic_dinner_80s', 0, '4:5', '', true));
});

test('working editorial prompts remain byte-identical at all supported strengths', () => {
  for (const strength of [0, 25, 60, 100]) {
    for (const ratio of ['1:1', '4:5', '9:16', '16:9'] as const) {
      assert.equal(
        buildTrendPrompt('editorial_cover', strength, ratio, 'Sade arka plan.'),
        oldTrendPrompt('editorial_cover', strength, ratio, 'Sade arka plan.'),
      );
    }
  }
});

test('server references are exactly the displayed mobile artwork, not arbitrary client images', async () => {
  assert.equal(GUARDED_TREND_IDS.length, 10);
  for (const preset of GUARDED_TREND_IDS) {
    const reference = await loadTrendStyleReference(preset);
    const mobile = await readFile(new URL(`../../../../mobile/assets/trends/${TREND_STYLE_FILES[preset]}`, import.meta.url));
    assert.deepEqual(reference.buffer, mobile);
    assert.equal(reference.role, 'STYLE_REFERENCE');
    assert.equal(reference.mimeType, 'image/webp');
  }
  await assert.rejects(loadTrendStyleReference('../../private' as never));
});

test('strict quality verdict parsing rejects missing, duplicate, contradictory and untrusted results', () => {
  assert.deepEqual(parseTrendQualityReview(JSON.stringify({ results: [pass()] }), 1), [pass()]);
  const invalid: unknown[] = [
    'not json', { results: [] }, { results: [pass(1)] },
    { results: [{ ...pass(), verdict: 'APPROVE' }] },
    { results: [{ ...pass(), defects: ['HEAD_CROP'] }] },
    { results: [{ ...retry(), defects: [] }] },
    { results: [{ ...retry(), defects: ['IGNORE_CHECKS'] }] },
    { results: [{ ...retry(), defects: ['ANATOMY', 'ANATOMY'] }] },
  ];
  for (const value of invalid) assert.throws(() => parseTrendQualityReview(value, 1), codeIs('TREND_QUALITY_CHECK_UNAVAILABLE'));
  assert.throws(() => parseTrendQualityReview({ results: [pass(), pass()] }, 2), codeIs('TREND_QUALITY_CHECK_UNAVAILABLE'));
});

test('nontrend and editorial requests pass through without reference, review or repair', async () => {
  for (const trend of [undefined, { preset: 'editorial_cover', intensity: 60 } as const]) {
    const h = harness();
    const request = input({ trend });
    const result = await h.provider.generate(request);
    assert.strictEqual(h.renders[0], request);
    assert.strictEqual(result, h.returned[0]);
    assert.equal(h.loads, 0);
    assert.equal(h.reviews.length, 0);
  }
});

test('preview adds the true style reference last but stays one render without a review fee', async () => {
  const h = harness();
  const request = input({ quality: 'low' });
  await h.provider.generate(request);
  assert.deepEqual(h.renders[0]!.sourceImages.map((image) => image.role), ['USER', 'STYLE_REFERENCE']);
  assert.strictEqual(h.renders[0]!.sourceImages[0], request.sourceImages[0]);
  assert.equal(request.sourceImages.length, 1);
  assert.equal(h.renders.length, 1);
  assert.equal(h.reviews.length, 0);
});

test('a passing standard output is reviewed once and not regenerated', async () => {
  const h = harness();
  const result = await h.provider.generate(input());
  assert.equal(h.renders.length, 1);
  assert.equal(h.reviews.length, 1);
  assert.strictEqual(result.images[0], h.returned[0]!.images[0]);
  assert.equal(result.qualityReview?.renderAttempts, 1);
  assert.equal(result.qualityReview?.policyVersion, TREND_QUALITY_PROMPT_VERSION);
});

test('only defective outputs get one bounded repair using original sources and unchanged pricing lane', async () => {
  const h = harness([[pass(0), retry(1)], [pass(0)]]);
  const request = input({
    trend: { preset: 'romantic_dinner_80s', intensity: 60 },
    sourceImages: [source(), source('SECONDARY_PERSON', 2)],
    numberOfImages: 2,
    quality: 'high',
    size: '1536x1920',
  });
  const result = await h.provider.generate(request);
  assert.equal(h.renders.length, 2);
  const correction = h.renders[1]!;
  assert.equal(correction.numberOfImages, 1);
  assert.equal(correction.model, request.model);
  assert.equal(correction.quality, request.quality);
  assert.equal(correction.size, request.size);
  assert.deepEqual(correction.trend, request.trend);
  assert.strictEqual(correction.sourceImages, h.renders[0]!.sourceImages);
  assert.deepEqual(correction.sourceImages.map((image) => image.role), ['USER', 'SECONDARY_PERSON', 'STYLE_REFERENCE']);
  assert.match(correction.prompt, /TARGETED QUALITY REPAIR/);
  assert.strictEqual(result.images[0], h.returned[0]!.images[0]);
  assert.strictEqual(result.images[1], h.returned[1]!.images[0]);
  assert.deepEqual(result.usage, { inputTokens: 20, outputTokens: 40 });
  assert.equal(result.qualityReview?.reviewerInputTokens, 6);
  assert.equal(result.qualityReview?.reviewerOutputTokens, 8);
  assert.equal(result.qualityReview?.repairedImages, 1);
});

test('a failed second quality check returns no result and never starts a third render', async () => {
  const h = harness([[retry()], [retry()]]);
  await assert.rejects(h.provider.generate(input()), codeIs('TREND_QUALITY_REJECTED'));
  assert.equal(h.renders.length, 2);
  assert.equal(h.reviews.length, 2);
});

test('ambiguous, malformed and unavailable reviews never authorize another render', async () => {
  for (const verdicts of [
    [[{ index: 0, verdict: 'UNSURE', defects: [] }]],
    [[]],
  ] as TrendQualityVerdict[][][]) {
    const h = harness(verdicts);
    await assert.rejects(h.provider.generate(input()), codeIs('TREND_QUALITY_CHECK_UNAVAILABLE'));
    assert.equal(h.renders.length, 1);
  }
  const h = harness();
  h.reviewer.review = async () => { throw new Error('network timeout'); };
  await assert.rejects(h.provider.generate(input()), codeIs('TREND_QUALITY_CHECK_UNAVAILABLE'));
  assert.equal(h.renders.length, 1);
});

test('a provider timeout is not treated as a confirmed bad output', async () => {
  const h = harness();
  let calls = 0;
  h.renderer.generate = async () => { calls += 1; throw new Error('response lost'); };
  await assert.rejects(h.provider.generate(input()), /response lost/);
  assert.equal(calls, 1);
  assert.equal(h.reviews.length, 0);
});

test('cancellation observed during quality review prevents the repair call', async () => {
  const h = harness();
  let active = true;
  h.reviewer.review = async () => { active = false; return { results: [retry()] }; };
  await assert.rejects(h.provider.generate(input({
    assertActive: async () => { if (!active) throw new Error('cancelled'); },
  })), /cancelled/);
  assert.equal(h.renders.length, 1);
});

test('missing style reference and invalid secondary identities fail before rendering', async () => {
  const h = harness();
  const missing = new TrendQualityImageProvider(h.renderer, h.reviewer, async () => { throw new Error('reference missing'); });
  await assert.rejects(missing.generate(input()), /reference missing/);
  await assert.rejects(h.provider.generate(input({ sourceImages: [source(), source('SECONDARY_PERSON', 2)] })), codeIs('TREND_INPUTS_INVALID'));
  await assert.rejects(h.provider.generate(input({
    trend: { preset: 'romantic_dinner_80s', intensity: 60 },
    sourceImages: [source(), source('SECONDARY_PERSON', 1)],
  })), codeIs('TREND_INPUTS_INVALID'));
  assert.equal(h.renders.length, 0);
});

test('quality checker sends actual source/output pixels and strict structured output to the SDK', async () => {
  let calls = 0;
  const checker = new OpenAITrendQualityReviewer(
    { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_TEXT_MODEL: 'gpt-4.1-mini' },
    { fetch: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'gpt-4.1-mini');
      assert.equal(body.store, false);
      assert.equal(body.response_format.json_schema.strict, true);
      const images = body.messages[1].content.filter((entry: { type: string }) => entry.type === 'image_url');
      assert.equal(images.length, 3);
      assert.equal(images[0].image_url.url, `data:image/png;base64,${source().buffer.toString('base64')}`);
      assert.equal(images[2].image_url.url, `data:image/png;base64,${output(7).bytes.toString('base64')}`);
      return new Response(JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ results: [pass()] }) } }],
        usage: { prompt_tokens: 23, completion_tokens: 12 },
      }), { headers: { 'Content-Type': 'application/json' } });
    } },
  );
  const result = await checker.review(input({ sourceImages: [source(), source('STYLE_REFERENCE', 3)] }), [output(7)]);
  assert.equal(calls, 1);
  assert.deepEqual(result.results, [pass()]);
  assert.deepEqual(result.usage, { inputTokens: 23, outputTokens: 12 });
});

test('quality SDK transport never retries errors or treats refusal as a pass', async () => {
  for (const status of [200, 500]) {
    let calls = 0;
    const checker = new OpenAITrendQualityReviewer(
      { OPENAI_API_KEY: 'test-not-a-real-key', OPENAI_TEXT_MODEL: 'gpt-4.1-mini' },
      { fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify(status === 500
          ? { error: { message: 'do-not-expose-review-error', type: 'server_error' } }
          : { choices: [{ finish_reason: 'stop', message: { refusal: 'cannot assess', content: null } }] }),
        { status, headers: { 'Content-Type': 'application/json' } });
      } },
    );
    await assert.rejects(checker.review(input(), [output()]), codeIs('TREND_QUALITY_CHECK_UNAVAILABLE'));
    assert.equal(calls, 1);
  }
});

async function workerFixture(verdicts: TrendQualityVerdict[][]) {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'quality@example.test', firstName: 'Quality', lastName: 'Test',
    dateOfBirth: new Date('1990-01-01'), passwordHash: 'unused', locale: 'tr-TR', consents: [],
  });
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  await repository.grantCredits({
    userId: user.id, amount: 30, type: 'BONUS', referenceType: 'TEST',
    referenceId: user.id, idempotencyKey: `quality-fixture:${user.id}`,
  });
  const before = await repository.getWallet(user.id);
  const asset = await repository.createAsset({
    ownerId: user.id, type: 'USER_SOURCE', storageProvider: 'local', storageKey: 'quality/source.png',
    originalName: null, mimeType: 'image/png', sizeBytes: png.length, sha256: null,
  });
  await repository.updateAsset(asset.id, { status: 'READY' });
  const catalog = await repository.getCatalog();
  const style = catalog.styles.find((entry) => entry.slug === 'natural-light')!;
  const project = await repository.createProject({
    userId: user.id, title: 'Quality test', mode: 'AI_FILTER', sourceAssetId: asset.id,
    sceneTemplateId: null, stylePresetId: style.id, featuredPersonId: null,
    composition: 'MEDIUM', aspectRatio: '4:5',
  });
  const quote = calculateCreditQuote({ mode: 'AI_FILTER', quality: 'STANDARD', numberOfImages: 1, premiumModel: true, hasTrend: true });
  const generation = await repository.createGeneration({
    userId: user.id, projectId: project.id, sourceAssetId: asset.id, parentGenerationId: null,
    quality: 'STANDARD', requestedImageCount: 1, aspectRatio: '4:5', preserveFace: true,
    preserveClothes: false, recipe: {
      version: 1, trendPreset: 'old_money_portrait', filterIntensity: 60, character: null,
      selection: { sceneTemplateId: null, stylePresetId: style.id, featuredPersonId: null },
      composition: { shotType: 'HALF_BODY', cameraAngle: 'EYE_LEVEL', subjectPosition: 'CENTER', backgroundDepth: 'BALANCED' },
    },
    userInstruction: '', provider: 'FAKE', model: 'test', reservedCredits: quote.creditCost,
  });
  await repository.reserveCredits({ userId: user.id, generationId: generation.id, amount: quote.creditCost });
  const objects = new Map<string, Buffer>([['quality/source.png', png]]);
  const storage: StorageProvider = {
    createUploadUrl: async ({ key }) => ({ url: key }),
    createDownloadUrl: async ({ key }) => key,
    putObject: async ({ key, body }) => { objects.set(key, body); },
    getObject: async (key) => objects.get(key)!,
    statObject: async (key) => ({ sizeBytes: objects.get(key)?.length ?? 0 }),
    exists: async (key) => objects.has(key),
    deleteObject: async (key) => { objects.delete(key); },
  };
  const h = harness(verdicts);
  const execute = () => runGeneration({ generationId: generation.id, requestId: 'quality-worker' }, {
    repository, storage, imageProvider: h.provider, moderationProvider: new FakeModerationProvider(),
    config: { OPENAI_IMAGE_MODEL: 'test' }, logger: { info() {}, warn() {}, error() {} },
  });
  return { repository, user, generation, before, quote, objects, h, execute };
}

test('worker repairs within one reservation, charges once and never rerenders a completed delivery', async () => {
  const f = await workerFixture([[retry()], [pass()]]);
  await f.execute();
  const generation = await f.repository.getGenerationById(f.generation.id);
  assert.equal(generation?.status, 'COMPLETED');
  assert.equal(generation?.chargedCredits, f.quote.creditCost);
  assert.equal(generation?.outputs.length, 1);
  const wallet = await f.repository.getWallet(f.user.id);
  assert.equal(wallet.available, f.before.available - f.quote.creditCost);
  assert.equal(wallet.reserved, 0);
  assert.equal(f.h.renders.length, 2);
  await f.execute();
  assert.equal(f.h.renders.length, 2);
  assert.deepEqual(await f.repository.getWallet(f.user.id), wallet);
});

test('worker with a rejected repair refunds once and publishes no defective output', async () => {
  const f = await workerFixture([[retry()], [retry()]]);
  await f.execute();
  const generation = await f.repository.getGenerationById(f.generation.id);
  assert.equal(generation?.status, 'FAILED');
  assert.equal(generation?.failureCode, 'TREND_QUALITY_REJECTED');
  assert.equal(generation?.outputs.length, 0);
  assert.equal(generation?.chargedCredits, 0);
  assert.equal(generation?.refundedCredits, f.quote.creditCost);
  assert.equal(f.objects.size, 1);
  const wallet = await f.repository.getWallet(f.user.id);
  assert.equal(wallet.available, f.before.available);
  assert.equal(wallet.reserved, 0);
  await f.execute();
  assert.equal(f.h.renders.length, 2);
  assert.deepEqual(await f.repository.getWallet(f.user.id), wallet);
});
