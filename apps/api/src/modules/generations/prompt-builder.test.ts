import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGenerationPrompt,
  compositionPrompt,
  intensityPrompt,
  normalizeGenerationRecipe,
  scenePrompt,
  stylePrompt,
} from '@birkare/ai';
import { calculateCreditQuote, catalogFixtures } from '@birkare/shared';
import type { GenerationRecord, ProjectRecord } from '@birkare/database';

const scene = (slug: string) => {
  const item = catalogFixtures.scenes.find((entry) => entry.slug === slug);
  assert.ok(item, slug);
  return item;
};

test('Flare and Sunburst lanes use the agreed server-owned credit policy', () => {
  for (const [quality, fast, premium] of [
    ['PREVIEW', 1, 1],
    ['STANDARD', 4, 6],
    ['HD', 7, 10],
  ] as const) {
    assert.equal(
      calculateCreditQuote({ mode: 'AI_FILTER', quality, numberOfImages: 1 }).creditCost,
      fast,
    );
    assert.equal(
      calculateCreditQuote({
        mode: 'AI_FILTER',
        quality,
        numberOfImages: 1,
        premiumModel: true,
      }).creditCost,
      premium,
    );
  }
  assert.equal(
    calculateCreditQuote({
      mode: 'FULL_SCENE',
      quality: 'HD',
      numberOfImages: 1,
      premiumModel: true,
      hasSceneTemplate: true,
      hasFeaturedPerson: true,
    }).creditCost,
    13,
  );
  assert.equal(
    calculateCreditQuote({
      mode: 'PRO_PORTRAIT',
      quality: 'HD',
      numberOfImages: 1,
      premiumModel: true,
    }).creditCost,
    12,
  );
});

test('every selectable edit is charged once per output and identity preservation stays included', () => {
  const cases = [
    {
      label: 'filter',
      input: { mode: 'AI_FILTER', quality: 'STANDARD', numberOfImages: 1, hasFilter: true },
      expected: 5,
    },
    {
      label: 'scene',
      input: {
        mode: 'FULL_SCENE',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
        hasSceneTemplate: true,
      },
      expected: 7,
    },
    {
      label: 'trend',
      input: {
        mode: 'AI_FILTER',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
        hasTrend: true,
      },
      expected: 8,
    },
    {
      label: 'standard beauty',
      input: {
        mode: 'AI_FILTER',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
        beautyTier: 'STANDARD',
      },
      expected: 7,
    },
    {
      label: 'premium beauty',
      input: {
        mode: 'AI_FILTER',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
        beautyTier: 'PREMIUM',
      },
      expected: 8,
    },
    {
      label: 'fictional character',
      input: {
        mode: 'FAN_MOMENT',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
        hasFeaturedPerson: true,
      },
      expected: 8,
    },
    {
      label: 'pro portrait',
      input: {
        mode: 'PRO_PORTRAIT',
        quality: 'STANDARD',
        numberOfImages: 1,
        premiumModel: true,
      },
      expected: 8,
    },
  ] as const;

  for (const entry of cases) {
    const quote = calculateCreditQuote(entry.input);
    assert.equal(quote.creditCost, entry.expected, entry.label);
    assert.equal(
      quote.breakdown.reduce((sum, item) => sum + item.credits, 0),
      entry.expected,
      `${entry.label} breakdown`,
    );
  }

  assert.equal(
    calculateCreditQuote({
      mode: 'AI_FILTER',
      quality: 'HD',
      numberOfImages: 4,
      premiumModel: true,
      hasTrend: true,
    }).creditCost,
    48,
    'base and trend cost must both scale with the four generated outputs',
  );
  assert.equal(
    calculateCreditQuote({
      mode: 'FULL_SCENE',
      quality: 'HD',
      numberOfImages: 1,
      premiumModel: true,
      hasFilter: true,
      hasSceneTemplate: true,
      hasFeaturedPerson: true,
    }).creditCost,
    14,
    'scene, filter and character are independent selected additions',
  );
  assert.equal(
    calculateCreditQuote({ mode: 'AI_FILTER', quality: 'STANDARD', numberOfImages: 1 }).creditCost,
    4,
    'face and identity preservation are included rather than charged as hidden modifiers',
  );
});

function sourceEditFixture(mode: ProjectRecord['mode'], featuredPersonId: string | null = null) {
  return {
    generation: {
      preserveFace: true,
      preserveClothes: true,
      aspectRatio: '4:5',
      userInstruction: null,
      recipe: null,
    } as GenerationRecord,
    project: {
      mode,
      composition: 'CLOSE',
      sceneTemplateId: null,
      stylePresetId: catalogFixtures.styles.find((entry) => entry.slug === 'natural-light')!.id,
      featuredPersonId,
    } as ProjectRecord,
    catalog: catalogFixtures,
  };
}

test('server-owned AI tool presets compile distinct bounded edit intents', () => {
  const natural = catalogFixtures.styles.find((entry) => entry.slug === 'natural-light')!.id;
  const studio = catalogFixtures.styles.find((entry) => entry.slug === 'studio')!.id;
  const alpine = scene('alpine-lake').id;

  const cases = [
    {
      toolPreset: 'background' as const,
      mode: 'BACKGROUND_REPLACE' as const,
      sceneTemplateId: alpine,
      stylePresetId: natural,
      expected: /EDIT INTENT: BACKGROUND REPLACEMENT/,
    },
    {
      toolPreset: 'light' as const,
      mode: 'AI_FILTER' as const,
      sceneTemplateId: null,
      stylePresetId: natural,
      expected: /EDIT INTENT: NATURAL RELIGHTING/,
    },
    {
      toolPreset: 'portrait' as const,
      mode: 'PRO_PORTRAIT' as const,
      sceneTemplateId: null,
      stylePresetId: studio,
      expected: /EDIT INTENT: PROFESSIONAL PORTRAIT/,
    },
    {
      toolPreset: 'extend' as const,
      mode: 'AI_FILTER' as const,
      sceneTemplateId: null,
      stylePresetId: natural,
      expected: /EDIT INTENT: CANVAS EXPANSION \/ OUTPAINTING/,
    },
  ];

  for (const entry of cases) {
    const prompt = buildGenerationPrompt({
      generation: {
        preserveFace: true,
        preserveClothes: true,
        aspectRatio: entry.toolPreset === 'extend' ? '16:9' : '4:5',
        userInstruction: null,
        recipe: {
          version: 1,
          filterIntensity: entry.toolPreset === 'extend' ? 10 : 35,
          toolPreset: entry.toolPreset,
          character: null,
          composition: {
            shotType: 'PORTRAIT',
            cameraAngle: 'EYE_LEVEL',
            subjectPosition: 'CENTER',
            backgroundDepth: 'BALANCED',
          },
          selection: {
            sceneTemplateId: entry.sceneTemplateId,
            stylePresetId: entry.stylePresetId,
            featuredPersonId: null,
          },
        },
      } as GenerationRecord,
      project: {
        mode: entry.mode,
        composition: 'CLOSE',
        sceneTemplateId: entry.sceneTemplateId,
        stylePresetId: entry.stylePresetId,
        featuredPersonId: null,
      } as ProjectRecord,
      catalog: catalogFixtures,
    });
    assert.match(prompt, /SERVER EDIT INTENT/);
    assert.match(prompt, entry.expected);
    assert.match(prompt, /SOURCE PHOTOGRAPH AUTHORITY/);
  }
});

test('localized edits preserve the source person count without requesting a secondary character', () => {
  for (const mode of ['AI_FILTER', 'BACKGROUND_REPLACE'] as const) {
    for (const personId of [null, catalogFixtures.featuredPeople[0]!.id]) {
      const prompt = buildGenerationPrompt(sourceEditFixture(mode, personId));
      assert.match(prompt, /Preserve the number of people in the source image/);
      assert.match(prompt, /if the source has no people, keep it that way/);
      assert.doesNotMatch(
        prompt,
        /SECONDARY CHARACTER|Add one original fictional secondary character|real meeting|endorsement/,
      );
      assert.match(prompt, /no duplicated or extra body parts/);
      assert.match(prompt, /No random text, captions, logos/);
    }
  }
});

test('an authorized secondary person is compatible with person count and anatomy restrictions', () => {
  const licensed = {
    ...catalogFixtures.featuredPeople[0]!,
    id: 'licensed-prompt-fixture',
    kind: 'LICENSED_PERSON' as const,
    rightsStatus: 'LICENSED' as const,
  };
  for (const mode of ['FAN_MOMENT', 'FULL_SCENE'] as const) {
    for (const person of [catalogFixtures.featuredPeople[0]!, licensed]) {
      const prompt = buildGenerationPrompt({
        ...sourceEditFixture(mode, person.id),
        catalog: {
          ...catalogFixtures,
          featuredPeople: [...catalogFixtures.featuredPeople, licensed],
        },
      });
      assert.match(prompt, /SECONDARY CHARACTER/);
      assert.match(prompt, /add exactly one authorized secondary person/);
      assert.match(prompt, /With one source person, the result has two foreground people/);
      assert.match(prompt, /no duplicated or extra body parts/);
      assert.match(prompt, /real meeting, endorsement or event/);
      assert.doesNotMatch(
        prompt,
        /No extra faces|No additional arms, hands, fingers, legs or bodies/,
      );
    }
  }
});

test('missing or unlicensed secondary selections never grant permission to add a person', () => {
  const blocked = { ...catalogFixtures.featuredPeople[0]!, rightsStatus: 'BLOCKED' as const };
  const noSelection = buildGenerationPrompt(sourceEditFixture('FULL_SCENE'));
  assert.match(noSelection, /without adding or duplicating foreground people/);
  assert.doesNotMatch(noSelection, /SECONDARY CHARACTER|add exactly one authorized/);
  const prompt = buildGenerationPrompt({
    ...sourceEditFixture('FAN_MOMENT', blocked.id),
    catalog: { ...catalogFixtures, featuredPeople: [blocked] },
  });
  assert.match(prompt, /Do not add a secondary character/);
  assert.doesNotMatch(prompt, /add exactly one authorized/);
});

test('every new scene resolves to its own environment, not an unrelated legacy fallback', () => {
  const expectations = {
    'stadium-night': /football stadium/,
    'award-night': /waterfront terrace/,
    'red-carpet': /fictional red-carpet entrance/,
    'luxury-car': /parked, unbranded premium vehicle/,
    'istanbul-sunset': /waterfront city terrace/,
    'cosmic-camp': /rocky night campsite/,
    'waterfront-night': /suspension bridge/,
    'coastal-terrace': /Mediterranean/,
    'window-portrait': /window light/,
    'neon-drive': /sports coupe/,
    'alpine-lake': /alpine lake/,
  };
  assert.equal(Object.keys(expectations).length, catalogFixtures.scenes.length);
  for (const [slug, pattern] of Object.entries(expectations)) {
    assert.match(scenePrompt(scene(slug), 'FULL_SCENE'), pattern);
    const background = scenePrompt(scene(slug), 'BACKGROUND_REPLACE');
    assert.match(background, pattern);
    assert.match(background, /original face, hairstyle, clothing/);
    assert.match(background, /pose and expression/);
  }
});

test('human photographic scenes inherit source-fidelity and anti-CGI rules', () => {
  const generation = {
    preserveFace: true,
    preserveClothes: true,
    aspectRatio: '4:5',
    userInstruction: null,
    recipe: {
      version: 1,
      filterIntensity: 60,
      character: null,
      composition: {
        shotType: 'HALF_BODY',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      },
      selection: {
        sceneTemplateId: scene('waterfront-night').id,
        stylePresetId: catalogFixtures.styles.find((entry) => entry.slug === 'natural-light')!.id,
        featuredPersonId: null,
      },
    },
  } as GenerationRecord;
  const project = {
    mode: 'FULL_SCENE',
    composition: 'MEDIUM',
    sceneTemplateId: scene('waterfront-night').id,
    stylePresetId: catalogFixtures.styles.find((entry) => entry.slug === 'natural-light')!.id,
    featuredPersonId: null,
  } as ProjectRecord;
  const prompt = buildGenerationPrompt({ generation, project, catalog: catalogFixtures });
  assert.match(prompt, /SOURCE PHOTOGRAPH AUTHORITY/);
  assert.match(prompt, /PHOTOGRAPHIC REALISM TARGET/);
  assert.match(prompt, /not as AI artwork, CGI, 3D rendering/);
  assert.match(prompt, /Do not invent, extend or reconstruct unseen body regions/);
  assert.match(prompt, /real-looking public waterfront promenade/);
  assert.match(prompt, /Avoid exaggerated neon, excessive bloom, artificial HDR/);
});

test('composition never requires invented body regions just to satisfy framing', () => {
  assert.match(compositionPrompt({
    shotType: 'HALF_BODY',
    cameraAngle: 'EYE_LEVEL',
    subjectPosition: 'CENTER',
    backgroundDepth: 'BALANCED',
  }), /only when the source provides enough visible body information/);
  assert.match(compositionPrompt({
    shotType: 'FULL_BODY',
    cameraAngle: 'EYE_LEVEL',
    subjectPosition: 'CENTER',
    backgroundDepth: 'BALANCED',
  }), /never invent major unseen body regions/);
});

test('filter and portrait modes cannot inherit a stale scene background', () => {
  const filter = scenePrompt(scene('neon-drive'), 'AI_FILTER');
  assert.match(filter, /Keep the original setting/);
  assert.doesNotMatch(filter, /sports coupe/);
  assert.match(filter, /canvas expansion/);
  assert.doesNotMatch(scenePrompt(scene('alpine-lake'), 'PRO_PORTRAIT'), /alpine lake/);
});

test('composition respects selected angle without forcing a vertical output', () => {
  for (const shotType of ['PORTRAIT', 'HALF_BODY', 'FULL_BODY'] as const) {
    const prompt = compositionPrompt({
      shotType,
      cameraAngle: 'SLIGHTLY_LOW',
      subjectPosition: 'LEFT',
      backgroundDepth: 'DEEP',
    });
    assert.match(prompt, /requested aspect ratio/);
    assert.match(prompt, /low camera angle/);
    assert.doesNotMatch(prompt, /vertical|eye.level/);
  }
});

test('studio styling does not override the chosen environment', () => {
  const studio = catalogFixtures.styles.find((entry) => entry.slug === 'studio');
  assert.ok(studio);
  assert.match(stylePrompt(studio), /must not replace it/);
  assert.match(stylePrompt(studio), /warm professional studio/);
});

test('warm studio has concrete, different light targets at each intensity', () => {
  const studio = catalogFixtures.styles.find((entry) => entry.slug === 'studio')!;
  const low = intensityPrompt(25, studio);
  const medium = intensityPrompt(60, studio);
  const high = intensityPrompt(100, studio);
  assert.match(low, /25\/100 \(LOW\)/);
  assert.match(low, /faint warm key-light lift/);
  assert.match(medium, /60\/100 \(MEDIUM\)/);
  assert.match(medium, /moderate cheek and jaw shadow/);
  assert.match(high, /100\/100 \(HIGH\)/);
  assert.match(high, /pronounced golden soft-key highlights/);
  assert.match(high, /never identity, anatomy, output quality/);
  assert.match(high, /do not render all strengths identically/);
});

test('every supported filter uses distinct style-specific low, medium and high guidance', () => {
  const items = [...catalogFixtures.styles, ...catalogFixtures.filters];
  for (const slug of [
    'studio',
    'natural-light',
    'cinematic',
    'vintage',
    'black-white',
    'hdr',
    'bokeh',
    'cyberpunk',
    'drip-art',
    'pop-art',
    'watercolor',
    'sketch',
    'cartoon',
  ]) {
    const filter = items.find((entry) => entry.slug === slug);
    assert.ok(filter, slug);
    const directions = [25, 60, 100].map((value) =>
      intensityPrompt(value, filter).split('. ').slice(1, -2).join('. '),
    );
    assert.equal(new Set(directions).size, 3, `${slug} has three different treatment instructions`);
  }
  const mono = items.find((entry) => entry.slug === 'black-white')!;
  assert.match(intensityPrompt(25, mono), /partial desaturation/);
  assert.match(intensityPrompt(100, mono), /true neutral black-and-white/);
});

test('zero and invalid intensity are bounded without disabling the scene', () => {
  assert.match(intensityPrompt(-10), /STRENGTH 0\/100/);
  assert.match(intensityPrompt(0), /Still perform the selected scene/);
  assert.match(intensityPrompt(150), /STRENGTH 100\/100/);
  assert.match(intensityPrompt(NaN), /STRENGTH 60\/100/);
  const recipe = normalizeGenerationRecipe(
    {
      version: 1,
      filterIntensity: NaN,
      character: null,
      composition: {
        shotType: 'PORTRAIT',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      },
    },
    'SELFIE',
  );
  assert.equal(recipe.filterIntensity, 60);
});

test('background prompt preserves pose and immutable selection; bounds user text', () => {
  const generation = {
    preserveFace: true,
    preserveClothes: false,
    aspectRatio: '16:9',
    userInstruction: 'a'.repeat(1100),
    recipe: {
      version: 1,
      filterIntensity: 60,
      character: null,
      composition: {
        shotType: 'FULL_BODY',
        cameraAngle: 'SLIGHTLY_LOW',
        subjectPosition: 'LEFT',
        backgroundDepth: 'DEEP',
      },
      selection: {
        sceneTemplateId: scene('coastal-terrace').id,
        stylePresetId: null,
        featuredPersonId: null,
      },
    },
  } as GenerationRecord;
  const project = {
    mode: 'BACKGROUND_REPLACE',
    sceneTemplateId: scene('neon-drive').id,
    stylePresetId: null,
    featuredPersonId: null,
    composition: 'WIDE',
  } as ProjectRecord;
  const prompt = buildGenerationPrompt({ generation, project, catalog: catalogFixtures });
  assert.match(prompt, /Mediterranean/);
  assert.doesNotMatch(prompt, /sports coupe|Use a full-body|Adapt clothing/);
  assert.match(prompt, /Retain the source camera angle/);
  assert.match(prompt, /16:9/);
  assert.match(prompt, /contains no person/);
  assert.ok(prompt.includes('a'.repeat(1000)));
  assert.ok(!prompt.includes('a'.repeat(1001)));
});

test('generation uses captured style and intensity together, not current project style', () => {
  const studio = catalogFixtures.styles.find((entry) => entry.slug === 'studio')!;
  const vintage = [...catalogFixtures.styles, ...catalogFixtures.filters].find(
    (entry) => entry.slug === 'vintage',
  )!;
  const generation = {
    preserveFace: true,
    preserveClothes: true,
    aspectRatio: '4:5',
    userInstruction: null,
    recipe: {
      version: 1,
      filterIntensity: 25,
      character: null,
      composition: {
        shotType: 'PORTRAIT',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      },
      selection: { sceneTemplateId: null, stylePresetId: studio.id, featuredPersonId: null },
    },
  } as GenerationRecord;
  const project = {
    mode: 'AI_FILTER',
    stylePresetId: vintage.id,
    sceneTemplateId: null,
    featuredPersonId: null,
    composition: 'SELFIE',
  } as ProjectRecord;
  const prompt = buildGenerationPrompt({ generation, project, catalog: catalogFixtures });
  assert.match(prompt, /faint warm key-light lift/);
  assert.match(prompt, /25\/100/);
  assert.match(prompt, /specifically a filter transformation/);
  assert.ok(
    prompt.indexOf('MANDATORY SELECTED VISUAL TREATMENT') < prompt.indexOf('PRIMARY USER'),
    'selected filter must appear near the start of the instruction',
  );
  assert.doesNotMatch(prompt, /understated analog film response/);
  assert.match(prompt, /Keep the original setting/);
  const legacyRecipe = generation.recipe;
  assert.ok(legacyRecipe?.version === 1);
  const cartoon = [...catalogFixtures.styles, ...catalogFixtures.filters].find(
    (entry) => entry.slug === 'cartoon',
  )!;
  const cartoonPrompt = buildGenerationPrompt({
    generation: {
      ...generation,
      recipe: {
        ...legacyRecipe,
        filterIntensity: 100,
        selection: { sceneTemplateId: null, stylePresetId: cartoon.id, featuredPersonId: null },
      },
    },
    project,
    catalog: catalogFixtures,
  });
  assert.match(cartoonPrompt, /complete polished cartoon treatment/);
  assert.match(cartoonPrompt, /not a requirement to keep a fully photographic surface/);
  assert.doesNotMatch(cartoonPrompt, /Preserve natural pores, individual hair strands/);
});
