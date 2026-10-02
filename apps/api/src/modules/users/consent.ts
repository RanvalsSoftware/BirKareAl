import type { ApiDependencies } from '../../services/dependencies.js';
import type { ConsentEventRecord } from '@birkare/database';
import { forbidden } from '@birkare/shared';

export const IMAGE_PROCESSING_CONSENT_VERSION = 'v1.0';

export async function latestImageProcessingConsent(
  deps: ApiDependencies,
  userId: string,
): Promise<ConsentEventRecord | null> {
  const events = await deps.repository.listUserConsentEvents(userId, 'IMAGE_PROCESSING_EXPLICIT');
  return (
    events.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
    )[0] ?? null
  );
}

export async function requireImageProcessingConsent(deps: ApiDependencies, userId: string) {
  const latest = await latestImageProcessingConsent(deps, userId);
  if (
    !latest ||
    latest.action !== 'GRANTED' ||
    latest.version !== IMAGE_PROCESSING_CONSENT_VERSION
  ) {
    throw forbidden(
      'IMAGE_CONSENT_REQUIRED',
      'Fotoğraf işlemeden önce açık rıza vermeniz gerekir.',
    );
  }
}
