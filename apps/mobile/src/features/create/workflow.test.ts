import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCreateFlow,
  resetCreateFlow,
  standardCreationSelection,
  updateCreateFlow,
  type CreateMode,
} from './createFlow';
import { afterScenePath, afterSourcePath, needsSceneSelection } from './workflow';
import { getToolPreset } from './tool-presets';
import { emptyBeautySettings, withBeautyIntensity } from '../beauty/settings';
import { trendCreationSelection, trendPresets } from '../trends/presets';

describe('source -> editor -> review navigation', () => {
  beforeEach(resetCreateFlow);

  it.each(trendPresets)(
    'returns an uploaded photo directly to the selected $name editor',
    (trend) => {
      updateCreateFlow(trendCreationSelection(trend.id));
      expect(afterSourcePath(getCreateFlow())).toBe('/create/upload');
      updateCreateFlow({ sourceUri: 'file:///original.jpg', sourceRightsConfirmed: true });
      expect(afterSourcePath(getCreateFlow())).toBe(`/trends/${trend.id}`);
      expect(needsSceneSelection(getCreateFlow())).toBe(false);
    },
  );

  it.each(['scene', 'background', 'portrait', 'filter'] as CreateMode[])(
    'clears trends and restores clothes preservation on ordinary %s entry',
    (mode) => {
      updateCreateFlow({
        ...trendCreationSelection('neon_club_night'),
        sourceUri: 'file:///original.jpg',
      });
      updateCreateFlow(standardCreationSelection({ mode, sceneId: null }));
      expect(getCreateFlow()).toMatchObject({
        trendPreset: null,
        preserveFace: true,
        preserveClothes: true,
        toolId: null,
      });
      expect(afterSourcePath(getCreateFlow())).toBe(
        ['scene', 'background'].includes(mode) ? '/create/scene' : '/create/settings',
      );
    },
  );

  it('keeps the original source and intensity while choosing another trend, then fully resets', () => {
    updateCreateFlow({
      ...trendCreationSelection('kpop_star'),
      sourceUri: 'file:///original.jpg',
      sourceRightsConfirmed: true,
      filterIntensity: 25,
    });
    updateCreateFlow({
      ...trendCreationSelection('analog_90s'),
      filterIntensity: getCreateFlow().filterIntensity,
    });
    expect(getCreateFlow()).toMatchObject({
      sourceUri: 'file:///original.jpg',
      sourceRightsConfirmed: true,
      filterIntensity: 25,
      trendPreset: 'analog_90s',
    });
    resetCreateFlow();
    expect(getCreateFlow()).toMatchObject({
      trendPreset: null,
      sourceUri: null,
      sourceRightsConfirmed: false,
      quality: 'Standart',
    });
  });

  it.each(['scene', 'background', 'portrait', 'filter'] as CreateMode[])(
    'clears a beauty draft when explicitly beginning ordinary %s creation',
    (mode) => {
      updateCreateFlow({
        mode: 'filter',
        sourceUri: 'file:///portrait.jpg',
        beauty: withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35),
      });
      updateCreateFlow(standardCreationSelection({ mode, sceneId: null }));
      expect(getCreateFlow().beauty).toBeNull();
      expect(afterSourcePath(getCreateFlow())).toBe(
        ['scene', 'background'].includes(mode) ? '/create/scene' : '/create/settings',
      );
    },
  );

  it('restores identity protection when leaving a gender draft for an ordinary tool', () => {
    updateCreateFlow({
      mode: 'filter',
      sourceUri: 'file:///portrait.jpg',
      transformation: { kind: 'gender-swap', presentation: 'feminine' },
      preserveFace: false,
    });
    updateCreateFlow(getToolPreset('light')!);
    expect(getCreateFlow()).toMatchObject({
      beauty: null,
      transformation: null,
      preserveFace: true,
      preserveClothes: true,
    });
    expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
  });

  it('clears specialized editing on a bare ordinary entry even when filter mode is unchanged', () => {
    updateCreateFlow({
      mode: 'filter',
      sourceUri: 'file:///portrait.jpg',
      toolId: 'beauty',
      filterIntensity: 0,
      beauty: withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35),
    });
    updateCreateFlow(standardCreationSelection());
    expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
    expect(getCreateFlow()).toMatchObject({ toolId: null, filterIntensity: 60 });
  });

  it('returns photo upload directly to the beauty editor without generic filters', () => {
    updateCreateFlow({
      mode: 'filter',
      sourceUri: 'file:///portrait.jpg',
      beauty: withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35),
    });
    expect(afterSourcePath(getCreateFlow())).toBe('/beauty');
    resetCreateFlow();
    expect(getCreateFlow().beauty).toBeNull();
  });

  it('keeps gender transformation separate from beauty and scene selection', () => {
    updateCreateFlow({
      mode: 'filter',
      sourceUri: 'file:///portrait.jpg',
      transformation: { kind: 'gender-swap', presentation: 'feminine' },
    });
    expect(afterSourcePath(getCreateFlow())).toBe('/gender-change');
    resetCreateFlow();
    expect(getCreateFlow().transformation).toBeNull();
  });

  it('requires a source even when a scene was selected from home', () => {
    updateCreateFlow({ sceneId: 'scene-stadium' });
    expect(afterSourcePath(getCreateFlow())).toBe('/create/upload');
  });

  it.each(['scene', 'background', 'character'] as CreateMode[])(
    'asks for a missing scene for %s only once',
    (mode) => {
      updateCreateFlow({ mode, sourceUri: 'file:///source.jpg' });
      expect(needsSceneSelection(getCreateFlow())).toBe(true);
      expect(afterSourcePath(getCreateFlow())).toBe('/create/scene');
      updateCreateFlow({ sceneId: 'scene-stadium' });
      expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
      expect(afterScenePath(mode)).toBe('/create/settings');
    },
  );

  it.each(['filter', 'portrait'] as CreateMode[])(
    'takes %s directly to the combined editor',
    (mode) => {
      updateCreateFlow({ mode, sourceUri: 'file:///source.jpg' });
      expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
    },
  );

  it.each(['background', 'light', 'portrait', 'extend'])(
    'does not repeat scene/character screens for %s tool',
    (tool) => {
      updateCreateFlow({ ...getToolPreset(tool), sourceUri: 'file:///source.jpg' });
      expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
    },
  );

  it('preserves home scene and intensity when a fictional primary source is chosen', () => {
    updateCreateFlow({ sceneId: 'scene-neon', styleId: 'filter-studio', filterIntensity: 25 });
    updateCreateFlow({
      sourceKind: 'fictional',
      sourceCharacterId: 'persona-aras',
      sourceUri: 'file:///demo.png',
      personId: null,
    });
    expect(getCreateFlow()).toMatchObject({
      sceneId: 'scene-neon',
      styleId: 'filter-studio',
      filterIntensity: 25,
      personId: null,
    });
    expect(afterSourcePath(getCreateFlow())).toBe('/create/settings');
  });

  it('resets source choice and consent on a new creation', () => {
    updateCreateFlow({
      sourceKind: 'fictional',
      sourceCharacterId: 'persona-aras',
      sourceUri: 'file:///demo.png',
      sourceRightsConfirmed: true,
    });
    resetCreateFlow();
    expect(getCreateFlow()).toMatchObject({
      sourceKind: 'photo',
      sourceCharacterId: null,
      sourceUri: null,
      sourceRightsConfirmed: false,
    });
  });
});
