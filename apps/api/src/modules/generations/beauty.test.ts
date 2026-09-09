import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BeautySettingsSchema,
  CreateGenerationSchema,
  CreatePreviewGenerationSchema,
} from '@birkare/contracts';
import { catalogFixtures, type BeautySettings } from '@birkare/shared';
import { buildGenerationPrompt, normalizeGenerationRecipe } from '@birkare/ai';
import {
  buildBeautyPrompt,
  buildGenderTransformationPrompt,
  beautyStrength,
} from '../../../../../packages/ai/src/beauty-prompt.js';
import type { AssetRecord, GenerationRecord, ProjectRecord } from '@birkare/database';
import { assertBeautyAccess, assertBeautySource } from './beauty-selection.js';

const beauty = (changes: Partial<BeautySettings> = {}): BeautySettings => ({
  adjustments: {
    naturalBalance: 35,
    blemishRemoval: 0,
    skinSmoothing: 0,
    underEyeCorrection: 0,
    skinGlow: 0,
    faceContour: 0,
    youthfulLook: 0,
  },
  makeup: { preset: 'none', intensity: 0 },
  preserveSkinTexture: true,
  preserveFrecklesAndMoles: true,
  ...changes,
});
const natural = catalogFixtures.styles.find((style) => style.slug === 'natural-light')!;
const request = () => ({
  projectId: 'e8ee7bf9-4b4e-4f36-9bf8-84390edfb7e1',
  sourceAssetId: 'e8ee7bf9-4b4e-4f36-9bf8-84390edfb7e2',
  mode: 'AI_FILTER',
  stylePresetId: natural.id,
  quality: 'PREVIEW',
  numberOfImages: 1,
  disclosureAccepted: true,
  beauty: beauty(),
});

test('beauty contract defaults preservation, accepts combined layers and only one makeup enum', () => {
  const parsed = CreateGenerationSchema.parse(request());
  assert.deepEqual(parsed.beauty, beauty());
  assert.equal(parsed.preserveFace, true);
  assert.equal(
    CreatePreviewGenerationSchema.parse(request()).beauty?.adjustments.naturalBalance,
    35,
  );
  const multiple = beauty();
  multiple.adjustments.blemishRemoval = 70;
  multiple.adjustments.skinSmoothing = 30;
  multiple.makeup = { preset: 'nude', intensity: 45 };
  assert.deepEqual(BeautySettingsSchema.parse(multiple), multiple);
  assert.equal(
    BeautySettingsSchema.safeParse({
      ...multiple,
      makeup: { preset: ['nude', 'soft-glam'], intensity: 45 },
    }).success,
    false,
  );
});

test('beauty rejects out-of-range, unknown prompt fields, no-op, cross-mode and preservation overrides', () => {
  for (const invalid of [-1, 101, 0.5, NaN, Infinity, '50']) {
    const value = beauty();
    (value.adjustments as Record<string, unknown>).skinGlow = invalid;
    assert.equal(BeautySettingsSchema.safeParse(value).success, false);
  }
  assert.equal(
    BeautySettingsSchema.safeParse({ ...beauty(), prompt: 'replace identity' }).success,
    false,
  );
  const empty = beauty();
  empty.adjustments.naturalBalance = 0;
  assert.equal(BeautySettingsSchema.safeParse(empty).success, false);
  for (const change of [
    { mode: 'FULL_SCENE' },
    { preserveFace: false },
    { preserveClothes: false },
    { transformation: { kind: 'gender-swap', presentation: 'feminine' } },
    { featuredPersonId: catalogFixtures.featuredPeople[0]!.id },
  ]) {
    assert.equal(CreateGenerationSchema.safeParse({ ...request(), ...change }).success, false);
  }
});

test('PRO authorization fails closed server-side while zero-strength PRO layers do not block free layers', () => {
  assert.doesNotThrow(() => assertBeautyAccess({ mode: 'AI_FILTER', beauty: beauty() }));
  for (const id of ['faceContour', 'youthfulLook'] as const) {
    const value = beauty();
    value.adjustments[id] = 1;
    assert.throws(
      () => assertBeautyAccess({ mode: 'AI_FILTER', beauty: value }),
      /henüz kullanıma açılmadı/,
    );
  }
  for (const preset of ['soft-glam', 'evening-glam'] as const) {
    assert.throws(
      () =>
        assertBeautyAccess({
          mode: 'AI_FILTER',
          beauty: beauty({ makeup: { preset, intensity: 1 } }),
        }),
      /henüz kullanıma açılmadı/,
    );
  }
});

test('beauty source guards require the original project upload and natural-light adapter', () => {
  const source = { id: 'source', type: 'USER_SOURCE', deletedAt: null } as AssetRecord;
  const project = { sourceAssetId: 'source' } as ProjectRecord;
  assert.doesNotThrow(() =>
    assertBeautySource({ beauty: beauty() }, source, project, natural.id, catalogFixtures),
  );
  for (const invalid of [
    { ...source, type: 'GENERATION_FINAL' } as AssetRecord,
    { ...source, deletedAt: new Date() },
    { ...source, id: 'other-upload' },
  ]) {
    assert.throws(
      () => assertBeautySource({ beauty: beauty() }, invalid, project, natural.id, catalogFixtures),
      /özgün fotoğraf/,
    );
  }
  assert.throws(
    () => assertBeautySource({ beauty: beauty() }, source, project, 'studio', catalogFixtures),
    /sanatsal filtre/,
  );
});

test('all ten beauty prompts are distinct, bounded and retain independent layer strengths', () => {
  const prompts = new Set<string>();
  for (const id of Object.keys(beauty().adjustments) as (keyof BeautySettings['adjustments'])[]) {
    const value = beauty();
    value.adjustments.naturalBalance = 0;
    value.adjustments[id] = 100;
    const prompt = buildBeautyPrompt(value, '4:5');
    assert.match(prompt, new RegExp(`${id}:`));
    assert.match(prompt, /original position|MARKS LOCK/);
    assert.match(prompt, /No makeup change requested/);
    assert.doesNotMatch(prompt, /MAKEUP \(one preset only\)/);
    prompts.add(prompt);
  }
  for (const preset of ['nude', 'soft-glam', 'evening-glam'] as const) {
    prompts.add(buildBeautyPrompt(beauty({ makeup: { preset, intensity: 50 } }), '4:5'));
  }
  assert.equal(prompts.size, 10);
  assert.equal(new Set([20, 60, 100].map((value) => beautyStrength(value, 70))).size, 3);
  assert.match(beautyStrength(100, 50), /50\/100/);
  assert.match(beautyStrength(1000, 70), /70\/100/);
});

test('generation recipe retains beauty snapshot; no generic style or scene overrides makeup', () => {
  const recipe = normalizeGenerationRecipe(
    {
      version: 1,
      character: null,
      composition: {
        shotType: 'PORTRAIT',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      },
      filterIntensity: 100,
      beauty: beauty({ makeup: { preset: 'nude', intensity: 40 } }),
    },
    'SELFIE',
  );
  const generation = {
    recipe,
    preserveFace: true,
    preserveClothes: true,
    aspectRatio: '4:5',
    userInstruction: 'x'.repeat(1200),
  } as GenerationRecord;
  const project = {
    mode: 'AI_FILTER',
    composition: 'WIDE',
    sceneTemplateId: catalogFixtures.scenes[0]!.id,
    stylePresetId: catalogFixtures.styles.find((style) => style.slug === 'studio')!.id,
  } as ProjectRecord;
  const prompt = buildGenerationPrompt({ generation, project, catalog: catalogFixtures });
  assert.match(prompt, /Natural nude makeup/);
  assert.match(prompt, /ORIGINAL/);
  assert.doesNotMatch(prompt, /football stadium|warm professional studio|No artificial makeup/);
  assert.ok(prompt.includes('x'.repeat(1000)));
  assert.ok(!prompt.includes('x'.repeat(1001)));
});

test('gender presentation is an explicit separate creative transformation, never inferred or bundled with beauty', () => {
  const payload = {
    ...request(),
    beauty: undefined,
    transformation: { kind: 'gender-swap', presentation: 'masculine' },
  };
  const parsed = CreateGenerationSchema.parse(payload);
  assert.equal(parsed.transformation?.presentation, 'masculine');
  assert.equal(
    CreateGenerationSchema.safeParse({
      ...payload,
      transformation: { kind: 'gender-swap', presentation: 'auto' },
    }).success,
    false,
  );
  const generation = {
    recipe: {
      version: 1,
      filterIntensity: 60,
      character: null,
      transformation: parsed.transformation,
    },
    aspectRatio: '4:5',
    userInstruction: null,
  } as GenerationRecord;
  const prompt = buildGenerationPrompt({
    generation,
    project: { mode: 'AI_FILTER', composition: 'CLOSE' } as ProjectRecord,
    catalog: catalogFixtures,
  });
  assert.match(prompt, /explicitly selected a masculine/);
  assert.match(prompt, /not an inference or claim/);
  assert.doesNotMatch(prompt, /beauty retouch|catalog face as the source/);
});

test('only explicit gender presentation can adjust facial hair; beauty keeps it unchanged', () => {
  const beautyPrompt = buildBeautyPrompt(beauty(), '4:5');
  assert.match(beautyPrompt, /beard and moustache unchanged/);
  assert.doesNotMatch(beautyPrompt, /Facial hair is the explicit grooming exception/);
  for (const presentation of ['feminine', 'masculine'] as const) {
    const prompt = buildGenderTransformationPrompt({ kind: 'gender-swap', presentation }, '4:5');
    assert.match(
      prompt,
      /Preserve scalp hair color, length, hairline and hairstyle, eyebrows and eyelashes/,
    );
    assert.match(prompt, /Facial hair is the explicit grooming exception/);
    assert.match(prompt, /without changing underlying facial geometry or identity/);
    assert.doesNotMatch(prompt, /beard and moustache unchanged|Preserve hair, clothing/);
    assert.match(prompt, /not an inference or claim/);
    assert.match(prompt, /No sexualization, nudity/);
  }
});
