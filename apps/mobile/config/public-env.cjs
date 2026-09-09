// Deliberately plain CommonJS: Expo evaluates app.config.ts before Metro runs.
// This shared build-time module must not import server config or load dotenv.
const DEFAULT_SUPPORT_EMAIL = 'birkareal@ranvals.com';
const PUBLIC_MOBILE_KEYS = Object.freeze([
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_WEB_BASE_URL',
  'EXPO_PUBLIC_SHARE_BASE_URL',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
  'EXPO_PUBLIC_MINIMUM_USER_AGE',
  'EXPO_PUBLIC_SUPPORT_EMAIL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
]);

const publicKeySet = new Set(PUBLIC_MOBILE_KEYS);
const releaseEnvironments = new Set(['staging', 'production']);
const appEnvironments = new Set(['development', 'staging', 'production']);
const placeholderLabels = new Set([
  'example',
  'placeholder',
  'changeme',
  'change-me',
  'your-domain',
  'yourdomain',
  'senindomainin',
  'your-api',
  'your-backend',
  'replace-me',
  'todo',
]);
const localSuffixes = new Set([
  'localhost',
  'local',
  'localdomain',
  'lan',
  'internal',
  'home',
  'corp',
  'test',
  'invalid',
  'example',
]);

/** @param {Record<string, string | undefined>} values */
function assertKnownPublicKeys(values) {
  const unknown = Object.keys(values).filter(
    (key) => key.startsWith('EXPO_PUBLIC_') && !publicKeySet.has(key),
  );
  if (unknown.length) {
    // Report variable names only. Never print an accidentally public secret.
    throw new Error(`Unsupported mobile public variable(s): ${unknown.sort().join(', ')}`);
  }
}

/** @param {string} hostname */
function isPublicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const labels = host.split('.');
  if (labels.length < 2 || host.includes(':') || /^[\d.]+$/.test(host)) return false;
  if (localSuffixes.has(labels.at(-1)) || /^(.+\.)?example\.(com|org|net)$/.test(host))
    return false;
  return labels.every(
    (label) =>
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label) &&
      !placeholderLabels.has(label),
  );
}

/** @param {string} key @param {string | undefined} value */
function requirePublicHttpsUrl(key, value) {
  let parsed;
  try {
    parsed = new URL(value?.trim() ?? '');
  } catch {
    throw new Error(`${key} must be an explicit public HTTPS URL for store builds.`);
  }
  if (
    parsed.protocol !== 'https:' ||
    !isPublicHostname(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `${key} must use a public HTTPS hostname without credentials, query or fragment.`,
    );
  }
  return parsed.toString().replace(/\/$/, '');
}

/**
 * Validate without resolving DNS or making network calls. Endpoint ownership,
 * TLS reachability and support mailbox delivery remain release smoke checks.
 * @param {Record<string, string | undefined>} values
 * @param {{release?: boolean}} [options]
 */
function resolvePublicMobileConfig(values, options = {}) {
  assertKnownPublicKeys(values);
  const explicitEnvironment = values.EXPO_PUBLIC_APP_ENV?.trim();
  const profile = values.EAS_BUILD_PROFILE?.trim();
  const storeProfile = releaseEnvironments.has(profile);
  const release =
    options.release === true ||
    storeProfile ||
    releaseEnvironments.has(explicitEnvironment) ||
    values.BIRKARE_RELEASE_BUILD === '1' ||
    values.BIRKARE_ANDROID_RELEASE === '1';
  if (release && !releaseEnvironments.has(explicitEnvironment)) {
    throw new Error(
      'EXPO_PUBLIC_APP_ENV must explicitly be staging or production for store builds.',
    );
  }
  const appEnv = explicitEnvironment || 'development';
  if (!appEnvironments.has(appEnv)) {
    throw new Error('EXPO_PUBLIC_APP_ENV must be development, staging or production.');
  }
  if (storeProfile && profile !== appEnv) {
    throw new Error(
      'EAS_BUILD_PROFILE and EXPO_PUBLIC_APP_ENV must use the same release environment.',
    );
  }
  const supportEmail =
    values.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || (release ? '' : DEFAULT_SUPPORT_EMAIL);
  if (
    release &&
    (supportEmail.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+$/.test(supportEmail) ||
      !isPublicHostname(supportEmail.split('@')[1] ?? ''))
  ) {
    throw new Error(
      'EXPO_PUBLIC_SUPPORT_EMAIL must be an explicit valid support mailbox for store builds.',
    );
  }
  if (release) {
    for (const key of ['EXPO_PUBLIC_WEB_BASE_URL', 'EXPO_PUBLIC_SHARE_BASE_URL']) {
      if (values[key]?.trim()) requirePublicHttpsUrl(key, values[key]);
    }
  }
  return {
    appEnv,
    apiBaseUrl: release
      ? requirePublicHttpsUrl('EXPO_PUBLIC_API_BASE_URL', values.EXPO_PUBLIC_API_BASE_URL)
      : values.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000',
    supportEmail,
  };
}

module.exports = {
  DEFAULT_SUPPORT_EMAIL,
  PUBLIC_MOBILE_KEYS,
  assertKnownPublicKeys,
  resolvePublicMobileConfig,
};
