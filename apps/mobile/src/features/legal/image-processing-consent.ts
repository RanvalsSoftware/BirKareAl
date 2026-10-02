import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '@/api/client';

const PENDING_CONSENT_KEY = 'birkare.image-processing-consent.pending.v1';

/** Keep a pre-authentication choice until an authenticated request can record it. */
export async function savePendingImageProcessingConsent() {
  await SecureStore.setItemAsync(PENDING_CONSENT_KEY, 'true');
}

export async function clearPendingImageProcessingConsent() {
  await SecureStore.deleteItemAsync(PENDING_CONSENT_KEY);
}

/** Record an onboarding grant after login, then return the server's current state. */
export async function ensureImageProcessingConsent() {
  const pending = await SecureStore.getItemAsync(PENDING_CONSENT_KEY);
  if (pending === 'true') {
    await apiRequest('/v1/me/consents/image-processing', {
      method: 'POST',
      body: JSON.stringify({ accepted: true }),
    });
    await clearPendingImageProcessingConsent();
    return { granted: true };
  }
  return apiRequest<{ granted: boolean }>('/v1/me/consents/image-processing');
}
