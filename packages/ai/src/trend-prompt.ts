import type { AspectRatio, TrendPreset } from '@birkare/shared';
import { buildTrendPrompt as buildFrozenEditorialPrompt } from './legacy-trend-prompt.js';
import {
  buildQualityTrendPrompt,
  isGuardedTrend,
  normalizeTrendIntensity,
} from './trend-quality-policy.js';

export { trendIntensity } from './trend-quality-policy.js';

/** Keep the proven editorial rendering unchanged; other trends use the v10 contract. */
export function buildTrendPrompt(
  preset: TrendPreset,
  intensity: number,
  aspectRatio: AspectRatio,
  instruction = '',
  hasSecondaryPerson = false,
): string {
  if (preset === 'editorial_cover') {
    if (hasSecondaryPerson) throw new Error('Editorial does not accept a second person source.');
    return buildFrozenEditorialPrompt(
      preset, normalizeTrendIntensity(intensity), aspectRatio, instruction, false,
    );
  }
  if (!isGuardedTrend(preset)) throw new Error('Unknown server trend preset');
  return buildQualityTrendPrompt(preset, intensity, aspectRatio, instruction, hasSecondaryPerson);
}
