import { readFile, stat } from 'node:fs/promises';
import { ApiError } from '@birkare/shared';
import { isGuardedTrend, type GuardedTrend } from './trend-quality-policy.js';
import type { ImageReference } from './types.js';

// Server-owned copies of the SAME artwork used by the mobile trend cards.
// The client cannot supply a path or turn a catalogue face into an identity reference.
export const TREND_STYLE_FILES: Record<GuardedTrend, string> = {
  kpop_star: 'kpop.webp',
  pop_icon_80s: '80-pop.webp',
  romantic_dinner_80s: '80-romantik-yemek.webp',
  romantic_closeup_80s: '80-yakin-portre.webp',
  analog_90s: '90-analog.webp',
  y2k_celebrity: 'celebrity.webp',
  red_carpet_glam: 'red-carpet.webp',
  old_money_portrait: 'old-money.webp',
  streetwear_editorial: 'streetwear.webp',
  neon_club_night: 'neon.webp',
};

export async function loadTrendStyleReference(preset: GuardedTrend): Promise<ImageReference> {
  if (!isGuardedTrend(preset)) throw new Error('Invalid server trend reference');
  const file = new URL(`../assets/trends/${TREND_STYLE_FILES[preset]}`, import.meta.url);
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size < 12 || info.size > 2 * 1024 * 1024)
      throw new Error('Invalid reference size');
    const buffer = await readFile(file);
    if (
      buffer.length !== info.size ||
      buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) throw new Error('Invalid reference image');
    return { buffer, mimeType: 'image/webp', role: 'STYLE_REFERENCE' };
  } catch {
    throw new ApiError({
      statusCode: 503,
      code: 'TREND_REFERENCE_UNAVAILABLE',
      message: 'Akımın stil referansı yüklenemedi. Ayrılan krediniz iade edildi.',
      expose: true,
    });
  }
}
