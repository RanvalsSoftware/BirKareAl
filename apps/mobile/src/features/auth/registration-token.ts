import * as SecureStore from 'expo-secure-store';

const key = 'birkare.registration-token';

/**
 * Proof that this device started the pending registration. The server only
 * keeps the password chosen at sign-up when verification presents it, so an
 * e-mail verified from anywhere else has to set its own password.
 */
export async function saveRegistrationToken(email: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify({ email, token }), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }).catch(() => undefined);
}

export async function readRegistrationToken(email: string): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as { email?: unknown; token?: unknown };
    return value.email === email && typeof value.token === 'string' && value.token
      ? value.token
      : null;
  } catch {
    return null;
  }
}

export async function clearRegistrationToken(): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}
