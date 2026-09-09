import * as SecureStore from 'expo-secure-store';

const refreshTokenKey = 'birkare.refresh-token';
let pendingWrite: Promise<void> = Promise.resolve();

// SecureStore native calls may finish out of order. Preserve invocation order
// when a previous refresh races with a new login or local sign-out.
function queueWrite(operation: () => Promise<void>): Promise<void> {
  const next = pendingWrite.catch(() => undefined).then(operation);
  pendingWrite = next;
  return next;
}

export async function saveRefreshToken(token: string) {
  await queueWrite(() =>
    SecureStore.setItemAsync(refreshTokenKey, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  );
}

export async function getRefreshToken() {
  await pendingWrite.catch(() => undefined);
  return SecureStore.getItemAsync(refreshTokenKey);
}

export function clearRefreshToken() {
  return queueWrite(() => SecureStore.deleteItemAsync(refreshTokenKey));
}
