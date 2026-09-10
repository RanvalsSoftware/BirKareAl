import { describe, expect, it } from 'vitest';
import { ENTITLEMENT_ID, resolveRevenueCatConfig } from './revenuecat.cjs';

describe('RevenueCat public build configuration', () => {
  it('uses the supplied Test Store key only by default in development', () => {
    const config = resolveRevenueCatConfig({});
    expect(config.iosApiKey.startsWith('test_')).toBe(true);
    expect(config.androidApiKey).toBe(config.iosApiKey);
    expect(config.entitlementId).toBe(ENTITLEMENT_ID);
  });
  it('supports distinct platform public SDK keys', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_example',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_example',
    });
    expect(config.iosApiKey).toBe('appl_example');
    expect(config.androidApiKey).toBe('goog_example');
  });
  it.each(['production', 'staging'])('rejects test keys in %s builds', (environment) => {
    expect(() =>
      resolveRevenueCatConfig({
        EXPO_PUBLIC_APP_ENV: environment,
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_example',
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'test_example',
      }),
    ).toThrow(/Test Store/);
  });
  it.each(['EAS_BUILD_PROFILE', 'BIRKARE_RELEASE_BUILD', 'BIRKARE_ANDROID_RELEASE'])(
    'rejects dev fallback when %s requests a release',
    (flag) => {
      expect(() =>
        resolveRevenueCatConfig({ [flag]: flag === 'EAS_BUILD_PROFILE' ? 'production' : '1' }),
      ).toThrow(/required/);
    },
  );
  it('rejects secret keys instead of shipping them in public Expo extras', () => {
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'sk_never_public' }),
    ).toThrow(/never a secret/);
  });
  it('rejects swapped platform keys', () => {
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'goog_wrong_platform' }),
    ).toThrow(/platform/);
  });
});
