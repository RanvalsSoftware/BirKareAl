const clientIdPattern = /^(\d+)-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

/** @param {string | undefined} value @param {string} label */
function requiredClient(value, label) {
  const normalized = value?.trim() ?? '';
  const match = normalized.match(clientIdPattern);
  if (!match) throw new Error(`${label} must be a valid public Google OAuth client ID.`);
  return { id: normalized, projectNumber: match[1] };
}

/**
 * Android still passes the Web client ID to GoogleSignin.configure(). The
 * Android client is required here as release evidence that package + SHA-1 was
 * registered in the same Google Cloud project; it is never used as a secret.
 * @param {{webClientId?: string, iosClientId?: string, androidClientId?: string, requireAndroid?: boolean}} input
 */
function validateGoogleOAuthClients(input) {
  const web = requiredClient(input.webClientId, 'Google Web client ID');
  const ios = requiredClient(input.iosClientId, 'Google iOS client ID');
  if (web.id === ios.id)
    throw new Error('Google Web and iOS OAuth clients must be different client types.');
  if (web.projectNumber !== ios.projectNumber)
    throw new Error('Google Web and iOS OAuth clients must belong to the same project.');

  const androidValue = input.androidClientId?.trim() ?? '';
  if (input.requireAndroid && !androidValue)
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is required for Android store builds. Register the package and signing SHA-1 in the same Google Cloud project first.',
    );
  if (androidValue) {
    const android = requiredClient(androidValue, 'Google Android client ID');
    if (web.projectNumber !== android.projectNumber)
      throw new Error('Google Web and Android OAuth clients must belong to the same project.');
  }
}

module.exports = { validateGoogleOAuthClients };
