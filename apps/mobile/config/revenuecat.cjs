// Public SDK keys only. Never put a RevenueCat secret (sk_...) here.
const ENTITLEMENT_ID = 'create_an_app_called_birkare_pro';
const DEVELOPMENT_TEST_KEY = 'test_jemSfADmikBxJuxsDsxIIdWMdec';

function resolveRevenueCatConfig(values) {
  const appEnv = values.EXPO_PUBLIC_APP_ENV?.trim() || 'development';
  const release =
    appEnv !== 'development' ||
    ['production', 'staging'].includes(values.EAS_BUILD_PROFILE) ||
    values.BIRKARE_RELEASE_BUILD === '1' ||
    values.BIRKARE_ANDROID_RELEASE === '1';
  function key(name, prefix) {
    const value = values[name]?.trim() || (release ? '' : DEVELOPMENT_TEST_KEY);
    if (!value) throw new Error(`${name} is required for a store build.`);
    if (value.startsWith('test_')) {
      if (release) throw new Error('RevenueCat Test Store keys cannot be used in store builds.');
    } else if (!value.startsWith(prefix)) {
      throw new Error(`${name} must be the platform public SDK key, never a secret API key.`);
    }
    return value;
  }
  return {
    appEnv,
    entitlementId: ENTITLEMENT_ID,
    iosApiKey: key('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', 'appl_'),
    androidApiKey: key('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', 'goog_'),
  };
}

module.exports = { ENTITLEMENT_ID, resolveRevenueCatConfig };
