import type { AppImageSource } from '@/src/types/image';
import type { PhotoSelection } from '@/src/types/onboarding';

export function resolvePhotoSource(
  selection: PhotoSelection | null,
  fallback: AppImageSource,
): AppImageSource {
  if (!selection) return fallback;
  if (selection.kind === 'device') return { uri: selection.uri };
  return selection.source;
}
