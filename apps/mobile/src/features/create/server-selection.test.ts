import { describe, expect, it, vi } from 'vitest';

// Keep these deterministic selection tests independent of Expo, credentials and network calls.
vi.mock('@/api/client', () => ({ apiBaseUrl: 'http://localhost:4000', apiRequest: vi.fn() }));
vi.mock('react-native', () => ({
  Image: { resolveAssetSource: (source: number) => ({ uri: `asset://fictional-${source}.png` }) },
}));
vi.mock('@/constants/catalog', () => ({
  fictionalPeople: [{ id: 'persona-nova', slug: 'nova', previewSource: 2 }],
}));

import { resolveCreateFlow } from './server';
import { fictionalSourceSelection } from './source-selection';
import type { CreateFlow } from './createFlow';
import { emptyBeautySettings, withBeautyIntensity } from '../beauty/settings';
import { trendCreationSelection, trendPresets } from '../trends/presets';
import { getToolPreset } from './tool-presets';

const flow = (update: Partial<CreateFlow> = {}): CreateFlow => ({
  mode: 'scene',
  sourceUri: 'file:///source.jpg',
  sourceName: 'source.jpg',
  sourceKind: 'photo',
  sourceCharacterId: null,
  toolId: null,
  sceneId: 'scene-coastal-day',
  styleId: 'filter-studio',
  personId: 'persona-aras',
  composition: 'Orta',
  aspectRatio: '4:5',
  quality: 'Önizleme',
  numberOfImages: 1,
  filterIntensity: 60,
  preserveFace: true,
  preserveClothes: true,
  saveSource: true,
  sourceRightsConfirmed: true,
  onboardingDraftPending: false,
  customInstruction: '',
  ...update,
});

describe('server selection for the simplified editor', () => {
  it.each(trendPresets)(
    'serializes $name as its own preset, never a generic filter prompt',
    (trend) => {
      const selection = resolveCreateFlow(flow(trendCreationSelection(trend.id)));
      expect(selection).toMatchObject({
        trendPreset: trend.id,
        title: trend.name,
        mode: 'AI_FILTER',
        preserveFace: true,
        preserveClothes: false,
        filterIntensity: 60,
        sceneTemplateId: null,
        featuredPersonId: null,
        stylePresetId: 'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
      });
      expect(selection.beauty).toBeUndefined();
      expect(selection.transformation).toBeUndefined();
      expect(selection.customInstruction).toBeUndefined();
    },
  );

  it.each([
    { sourceKind: 'fictional' as const },
    { sourceCharacterId: 'persona-nova' },
    { preserveFace: false },
    { preserveClothes: true },
    { mode: 'scene' as const },
    { styleId: 'filter-studio' },
    { sceneId: 'scene-coastal-day' },
    { beauty: emptyBeautySettings() },
    { transformation: { kind: 'gender-swap', presentation: 'feminine' } as const },
  ])('rejects incompatible trend choices before upload: %j', (update) => {
    expect(() =>
      resolveCreateFlow(flow({ ...trendCreationSelection('kpop_star'), ...update })),
    ).toThrow('Akımlar için');
  });

  it.each([0, 25, 60, 100])(
    'preserves trend intensity %i without silently replacing it',
    (filterIntensity) => {
      expect(
        resolveCreateFlow(flow({ ...trendCreationSelection('analog_90s'), filterIntensity }))
          .filterIntensity,
      ).toBe(filterIntensity);
    },
  );

  it.each(['background', 'light', 'portrait', 'extend'] as const)(
    'serializes %s as a bounded server tool preset without a client-authored prompt',
    (tool) => {
      const selection = resolveCreateFlow(flow(getToolPreset(tool)!));
      expect(selection.toolPreset).toBe(tool);
      expect(selection.customInstruction).toBeUndefined();
    },
  );

  it('preserves all beauty layers as IDs and intensities instead of client prompts', () => {
    const beauty = withBeautyIntensity(
      withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35),
      'nude',
      40,
    );
    const selection = resolveCreateFlow(
      flow({ mode: 'filter', beauty, styleId: 'filter-natural', filterIntensity: 0 }),
    );
    expect(selection).toMatchObject({
      beauty,
      mode: 'AI_FILTER',
      title: 'Güzellik Stüdyosu',
      preserveFace: true,
      preserveClothes: true,
    });
    expect(selection.stylePresetId).toBe('d38b8c54-9f6b-4e3c-9d7f-9ba532e4d101');
    expect(selection.customInstruction).toBeUndefined();
    expect(selection.transformation).toBeUndefined();
  });
  it('preserves an explicitly selected gender presentation separately from beauty', () => {
    const transformation = { kind: 'gender-swap', presentation: 'feminine' } as const;
    const selection = resolveCreateFlow(
      flow({ mode: 'filter', transformation, styleId: 'filter-natural', preserveFace: false }),
    );
    expect(selection).toMatchObject({
      transformation,
      mode: 'AI_FILTER',
      title: 'Cinsiyet değiştirme',
      preserveFace: false,
    });
    expect(selection.beauty).toBeUndefined();
  });
  it('never carries a previous companion into a full scene', () => {
    const selection = resolveCreateFlow(flow());
    expect(selection.mode).toBe('FULL_SCENE');
    expect(selection.featuredPersonId).toBeNull();
    expect(selection.sceneTemplateId).toBe('ef78bc54-9f6b-4e3c-9d7f-9ba532e4d108');
    expect(selection.stylePresetId).toBe('d38b8c54-9f6b-4e3c-9d7f-9ba532e4d102');
  });

  it('uses fictional artwork as the primary image, not a companion', () => {
    const source = fictionalSourceSelection('persona-nova');
    expect(source).toMatchObject({
      sourceKind: 'fictional',
      sourceCharacterId: 'persona-nova',
      sourceUri: 'asset://fictional-2.png',
      personId: null,
      sourceRightsConfirmed: false,
    });
    const selected = flow({ ...source, mode: 'scene' });
    expect(resolveCreateFlow(selected).mode).toBe('FULL_SCENE');
    expect(resolveCreateFlow(selected).featuredPersonId).toBeNull();
    expect(fictionalSourceSelection('missing')).toBeNull();
  });

  it('defensively normalizes legacy character mode for a fictional primary source', () => {
    for (const primary of [
      { sourceKind: 'fictional' as const, sourceCharacterId: null },
      { sourceKind: 'photo' as const, sourceCharacterId: 'persona-nova' },
    ]) {
      const selection = resolveCreateFlow(
        flow({ ...primary, mode: 'character', personId: 'persona-aras' }),
      );
      expect(selection.mode).toBe('FULL_SCENE');
      expect(selection.featuredPersonId).toBeNull();
      expect(selection.sceneTemplateId).toBe('ef78bc54-9f6b-4e3c-9d7f-9ba532e4d108');
    }
  });

  it('retains explicitly legacy fan mode for a real primary photo', () => {
    const selection = resolveCreateFlow(
      flow({ mode: 'character', sourceKind: 'photo', sourceCharacterId: null }),
    );
    expect(selection.mode).toBe('FAN_MOMENT');
    expect(selection.featuredPersonId).toBe('a18b8c54-9f6b-4e3c-9d7f-9ba532e4d101');
  });

  it.each([25, 60, 100])(
    'sends selected intensity %i unchanged, with selected style',
    (intensity) => {
      const selection = resolveCreateFlow(flow({ mode: 'filter', filterIntensity: intensity }));
      expect(selection.filterIntensity).toBe(intensity);
      expect(selection.sceneTemplateId).toBeNull();
      expect(selection.featuredPersonId).toBeNull();
      expect(selection.stylePresetId).toBe('d38b8c54-9f6b-4e3c-9d7f-9ba532e4d102');
    },
  );

  it('honors an explicit portrait filter instead of silently resetting it to studio', () => {
    const selection = resolveCreateFlow(flow({ mode: 'portrait', styleId: 'filter-mono' }));
    expect(selection.stylePresetId).toBe('438b8c54-9f6b-4e3c-9d7f-9ba532e4d107');
    expect(selection.sceneTemplateId).toBeNull();
    expect(selection.featuredPersonId).toBeNull();
  });

  it('keeps the scene and style together for a background replacement', () => {
    const selection = resolveCreateFlow(flow({ mode: 'background' }));
    expect(selection.sceneTemplateId).toBe('ef78bc54-9f6b-4e3c-9d7f-9ba532e4d108');
    expect(selection.stylePresetId).toBe('d38b8c54-9f6b-4e3c-9d7f-9ba532e4d102');
    expect(selection.featuredPersonId).toBeNull();
  });

  it.each([-1, 101, 1.5, NaN])(
    'rejects invalid intensity %s instead of changing it silently',
    (intensity) => {
      expect(() => resolveCreateFlow(flow({ filterIntensity: intensity }))).toThrow(
        'Filtre yoğunluğu',
      );
    },
  );
});
