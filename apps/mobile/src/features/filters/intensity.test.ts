import { describe, expect, it } from 'vitest';
import {
  FILTER_INTENSITIES,
  clampFilterIntensity,
  filterPreviewStrength,
  getFilterPreviewProfile,
  nearestIntensityValue,
} from './intensity';

describe('filter intensity', () => {
  it('gives low, medium and high clearly separated visible strengths', () => {
    const values = FILTER_INTENSITIES.map(({ value }) => filterPreviewStrength(value));
    expect(values[0]).toBeLessThan(0.2);
    expect(values[1]).toBeGreaterThan(0.45);
    expect(values[1]).toBeLessThan(0.6);
    expect(values[2]).toBe(1);
    expect(filterPreviewStrength(0)).toBe(0);
  });
  it('bounds bad persisted values and restores the closest preset', () => {
    expect(clampFilterIntensity(-20)).toBe(0);
    expect(clampFilterIntensity(120)).toBe(100);
    expect(clampFilterIntensity(NaN)).toBe(60);
    expect(nearestIntensityValue(62)).toBe(60);
    expect(nearestIntensityValue(90)).toBe(100);
  });
  it('uses the same warm studio treatment in onboarding and the editor', () => {
    const profile = getFilterPreviewProfile('filter-studio');
    expect(profile).toEqual(getFilterPreviewProfile('warm-studio'));
    expect(profile.tintOpacity).toBeGreaterThan(
      getFilterPreviewProfile('filter-natural').tintOpacity,
    );
    for (const layer of ['tintOpacity', 'lightOpacity', 'shadowOpacity'] as const) {
      const values = FILTER_INTENSITIES.map(
        ({ value }) => profile[layer] * filterPreviewStrength(value),
      );
      expect(values[0]).toBeLessThan(values[1]!);
      expect(values[1]).toBeLessThan(values[2]!);
    }
  });
  it('has distinct tone profiles and fails safely for unknown identifiers', () => {
    expect(getFilterPreviewProfile('filter-mono').monochrome).toBe(true);
    expect(getFilterPreviewProfile('filter-cyberpunk').tint).not.toEqual(
      getFilterPreviewProfile('filter-studio').tint,
    );
    expect(getFilterPreviewProfile('toString')).toEqual(getFilterPreviewProfile('natural'));
  });
});
