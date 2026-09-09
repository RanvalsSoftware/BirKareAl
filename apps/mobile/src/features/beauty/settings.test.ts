import { describe, expect, it } from 'vitest';
import {
  beautyIntensity,
  emptyBeautySettings,
  hasBeautyAdjustments,
  intensityDescription,
  toggleBeautyOption,
  withBeautyIntensity,
} from './settings';

describe('layered beauty selections', () => {
  it('resets all layers and preserves natural protections by default', () => {
    const settings = emptyBeautySettings();
    expect(hasBeautyAdjustments(settings)).toBe(false);
    expect(settings.makeup).toEqual({ preset: 'none', intensity: 0 });
    expect(settings.preserveSkinTexture).toBe(true);
    expect(settings.preserveFrecklesAndMoles).toBe(true);
  });
  it('combines independent retouch layers without mutating the original', () => {
    const original = emptyBeautySettings();
    const next = withBeautyIntensity(
      withBeautyIntensity(original, 'naturalBalance', 35),
      'blemishRemoval',
      65,
    );
    expect(beautyIntensity(next, 'naturalBalance')).toBe(35);
    expect(beautyIntensity(next, 'blemishRemoval')).toBe(65);
    expect(hasBeautyAdjustments(next)).toBe(true);
    expect(hasBeautyAdjustments(original)).toBe(false);
  });
  it('makes makeup mutually exclusive while retaining retouch', () => {
    const natural = withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35);
    const first = withBeautyIntensity(natural, 'nude', 40);
    const second = withBeautyIntensity(first, 'soft-glam', 50);
    expect(beautyIntensity(second, 'nude')).toBe(0);
    expect(beautyIntensity(second, 'soft-glam')).toBe(50);
    expect(beautyIntensity(second, 'naturalBalance')).toBe(35);
    const off = withBeautyIntensity(second, 'soft-glam', 0);
    expect(off.makeup).toEqual({ preset: 'none', intensity: 0 });
  });
  it.each([
    [25.5, 26],
    [-1, 0],
    [125, 100],
    [NaN, 0],
  ])('bounds slider value %s to %s', (value, expected) => {
    expect(
      beautyIntensity(withBeautyIntensity(emptyBeautySettings(), 'skinGlow', value), 'skinGlow'),
    ).toBe(expected);
  });
  it('uses meaningful different intensity labels', () => {
    expect([0, 20, 40, 60, 80, 100].map(intensityDescription)).toEqual([
      'Kapalı',
      'Çok hafif',
      'Doğal',
      'Dengeli',
      'Belirgin',
      'Güçlü',
    ]);
  });
  it('toggles the last adjustment to none and restores its default only on a new tap', () => {
    const on = toggleBeautyOption(emptyBeautySettings(), 'naturalBalance', 35);
    const off = toggleBeautyOption(on, 'naturalBalance', 35);
    expect(off).toEqual(emptyBeautySettings());
    expect(hasBeautyAdjustments(off)).toBe(false);
    expect(beautyIntensity(toggleBeautyOption(off, 'naturalBalance', 35), 'naturalBalance')).toBe(
      35,
    );
  });
  it('removes one layer while preserving the other intensities and protections', () => {
    const original = {
      ...withBeautyIntensity(emptyBeautySettings(), 'skinGlow', 70),
      preserveSkinTexture: false,
    };
    const on = toggleBeautyOption(original, 'nude', 40);
    const off = toggleBeautyOption(on, 'nude', 40);
    expect(off).toEqual(original);
    expect(off.makeup).toEqual({ preset: 'none', intensity: 0 });
    expect(beautyIntensity(on, 'nude')).toBe(40);
  });
});
