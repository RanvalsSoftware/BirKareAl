import * as SecureStore from 'expo-secure-store';

// A new practical, four-step experience is intentionally shown once to
// existing preview installs. After the user accepts consent it is persisted
// under this versioned key and is never shown again on subsequent launches.
const COMPLETED_KEY = 'birkare.onboarding.completed.v4';

/** Onboarding is intentionally kept separately from auth tokens. */
export async function getOnboardingCompleted() {
  try {
    return (await SecureStore.getItemAsync(COMPLETED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(value: boolean) {
  try {
    if (value) await SecureStore.setItemAsync(COMPLETED_KEY, 'true');
    else await SecureStore.deleteItemAsync(COMPLETED_KEY);
  } catch {
    // The intro remains usable even if secure local storage is unavailable.
  }
}
