// RevenueCat public SDK identifiers. These values are safe to ship in a mobile
// binary; never put a RevenueCat secret (sk_...), App Store .p8, or webhook
// authorization token here.
const ENTITLEMENT_ID = 'create_an_app_called_birkare_pro';
const OFFERING_ID = 'birkare_pro';
const DEVELOPMENT_TEST_KEY = 'test_jemSfADmikBxJuxsDsxIIdWMdec';
const DEFAULT_IOS_PUBLIC_KEY = 'appl_MbKttQjNGBgBFiVaQUnwzZHgOce';

function resolveRevenueCatConfig(values) {
  const appEnv = values.EXPO_PUBLIC_APP_ENV?.trim() || 'development';
  const release =
    appEnv !== 'development' ||
    ['production', 'staging'].includes(values.EAS_BUILD_PROFILE) ||
    values.BIRKARE_RELEASE_BUILD === '1' ||
    values.BIRKARE_IOS_RELEASE === '1' ||
    values.BIRKARE_ANDROID_RELEASE === '1';
  const buildPlatform = values.EAS_BUILD_PLATFORM?.trim();

  function validate(value, name, prefix) {
    if (!value) return '';
    if (value.startsWith('sk_'))
      throw new Error(`${name} must be a public SDK key, never a secret API key.`);
    if (value.startsWith('test_')) {
      if (release) throw new Error('RevenueCat Test Store keys cannot be used in store builds.');
      return value;
    }
    if (!value.startsWith(prefix))
      throw new Error(`${name} must be the platform public SDK key, never a swapped key.`);
    return value;
  }

  const iosApiKey = validate(
    values.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
      DEFAULT_IOS_PUBLIC_KEY,
    'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
    'appl_',
  );
  const androidApiKey = validate(
    values.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ||
      (release ? '' : DEVELOPMENT_TEST_KEY),
    'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
    'goog_',
  );

  const genericRelease = values.BIRKARE_RELEASE_BUILD === '1';
  const needsIos =
    release &&
    (buildPlatform === 'ios' || values.BIRKARE_IOS_RELEASE === '1' || genericRelease);
  const needsAndroid =
    release &&
    (buildPlatform === 'android' || values.BIRKARE_ANDROID_RELEASE === '1' || genericRelease);

  if (needsIos && !iosApiKey)
    throw new Error('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is required for an iOS store build.');
  if (needsAndroid && !androidApiKey)
    throw new Error(
      'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is required for an Android store build.',
    );

  const offeringId = values.EXPO_PUBLIC_REVENUECAT_OFFERING_ID?.trim() || OFFERING_ID;
  if (!/^[A-Za-z0-9_.$-]{1,128}$/.test(offeringId))
    throw new Error('EXPO_PUBLIC_REVENUECAT_OFFERING_ID is invalid.');

  return {
    appEnv,
    entitlementId: ENTITLEMENT_ID,
    offeringId,
    iosApiKey,
    androidApiKey,
  };
}

module.exports = {
  DEFAULT_IOS_PUBLIC_KEY,
  DEVELOPMENT_TEST_KEY,
  ENTITLEMENT_ID,
  OFFERING_ID,
  resolveRevenueCatConfig,
};
