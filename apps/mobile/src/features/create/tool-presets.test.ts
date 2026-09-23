import { describe, expect, it } from 'vitest';
import { getToolPreset } from './tool-presets';
import { afterQualityPath } from './workflow';

describe('AI tool presets', () => {
  it.each(['background', 'light', 'portrait', 'extend'])(
    '%s opens a valid configured editing flow',
    (slug) => {
      const preset = getToolPreset(slug)!;
      expect(preset).not.toBeNull();
      expect(['background', 'filter', 'portrait']).toContain(preset.mode);
      expect(preset.preserveFace).toBe(true);
      expect(preset.preserveClothes).toBe(true);
      expect(preset.personId).toBeNull();
      expect(preset.toolId).toBe(slug);
      expect(preset.customInstruction).toBe('');
      expect(afterQualityPath(preset.mode!, preset.toolId)).toBe('/create/settings');
    },
  );
  it('keeps relighting and expansion out of scene replacement', () => {
    expect(getToolPreset('light')?.sceneId).toBeNull();
    expect(getToolPreset('extend')?.sceneId).toBeNull();
    expect(getToolPreset('extend')?.aspectRatio).toBe('16:9');
    expect(getToolPreset('background')?.sceneId).toBe('scene-alpine-lake');
  });
  it('rejects unknown and inherited names; returns a fresh selection', () => {
    expect(getToolPreset('invalid')).toBeNull();
    expect(getToolPreset('toString')).toBeNull();
    expect(getToolPreset('light')).not.toBe(getToolPreset('light'));
    expect(afterQualityPath('filter')).toBe('/create/settings');
  });
});
