import { describe, expect, it } from 'vitest';
import {
  EIGHTIES_TREND_IDS,
  getTrendPreset,
  isEightiesTrend,
  trendCreationSelection,
  trendPresets,
} from './presets';
import { TREND_PRESET_IDS } from '../../../../../packages/shared/src/trends';

describe('curated trends', () => {
  it('contains nine collections and two server-owned 80s variants', () => {
    expect(trendPresets.map((trend) => trend.id)).toEqual([
      'kpop_star',
      'pop_icon_80s',
      'romantic_dinner_80s',
      'romantic_closeup_80s',
      'analog_90s',
      'y2k_celebrity',
      'red_carpet_glam',
      'editorial_cover',
      'old_money_portrait',
      'streetwear_editorial',
      'neon_club_night',
    ]);
    expect(new Set(trendPresets.map((trend) => trend.id)).size).toBe(11);
    expect(trendPresets.map((trend) => trend.id)).toEqual(TREND_PRESET_IDS);
    expect(getTrendPreset('dreamy_soft_idol')).toBeNull();
    expect(getTrendPreset(undefined)).toBeNull();
  });

  it('groups the three 80s looks without treating unrelated trends as variants', () => {
    expect(EIGHTIES_TREND_IDS).toEqual([
      'pop_icon_80s',
      'romantic_dinner_80s',
      'romantic_closeup_80s',
    ]);
    expect(isEightiesTrend('romantic_dinner_80s')).toBe(true);
    expect(isEightiesTrend('analog_90s')).toBe(false);
  });

  it.each(trendPresets)(
    'sets the identity-preserving transformation contract for $name',
    (trend) => {
      expect(trendCreationSelection(trend.id)).toEqual({
        mode: 'filter',
        toolId: 'trend',
        trendPreset: trend.id,
        beauty: null,
        transformation: null,
        sourceKind: 'photo',
        sourceCharacterId: null,
        sceneId: null,
        personId: null,
        styleId: 'filter-natural',
        preserveFace: true,
        preserveClothes: false,
        customInstruction: '',
        filterIntensity: 60,
      });
      // These display-only cards must never choose the catalogue model as the source.
      expect(trendCreationSelection(trend.id)).not.toHaveProperty('sourceUri');
    },
  );

  it.each([
    { sourceKind: 'fictional' as const, sourceCharacterId: null },
    { sourceKind: 'photo' as const, sourceCharacterId: 'persona-nova' },
  ])('removes fictional source images even from a stale mixed state: %j', (source) => {
    expect(trendCreationSelection('kpop_star', source)).toMatchObject({
      sourceKind: 'photo',
      sourceCharacterId: null,
      sourceUri: null,
      sourceName: null,
      sourceRightsConfirmed: false,
    });
  });
});
