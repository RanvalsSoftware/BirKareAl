import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IOS_PUBLIC_KEY,
  ENTITLEMENT_ID,
  OFFERING_ID,
  resolveRevenueCatConfig,
} from './revenuecat.cjs';

describe('RevenueCat public build configuration', () => {
  it('uses Test Store keys only in development', () => {
    const config = resolveRevenueCatConfig({});
    expect(config.iosApiKey.startsWith('test_')).toBe(true);
    expect(config.androidApiKey).toBe(config.iosApiKey);
    expect(config.entitlementId).toBe(ENTITLEMENT_ID);
    expect(config.offeringId).toBe(OFFERING_ID);
  });

  it('uses BirKare iOS public key for an iOS store build', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'staging',
      EAS_BUILD_PROFILE: 'staging',
      EAS_BUILD_PLATFORM: 'ios',
    });
    expect(config.iosApiKey).toBe(DEFAULT_IOS_PUBLIC_KEY);
    expect(config.androidApiKey).toBe('');
  });

  it('allows a local iOS staging build without requiring the future Android key', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'staging',
      BIRKARE_IOS_RELEASE: '1',
    });
    expect(config.iosApiKey).toBe(DEFAULT_IOS_PUBLIC_KEY);
    expect(config.androidApiKey).toBe('');
  });

  it('supports distinct platform public SDK keys', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'production',
      EAS_BUILD_PLATFORM: 'android',
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
        EAS_BUILD_PLATFORM: 'ios',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_example',
      }),
    ).toThrow(/Test Store/);
  });

  it('requires a Google public key for an Android store build', () => {
    expect(() =>
      resolveRevenueCatConfig({
        EXPO_PUBLIC_APP_ENV: 'production',
        EAS_BUILD_PLATFORM: 'android',
      }),
    ).toThrow(/ANDROID_API_KEY/);
  });

  it('requires every platform key for a generic release validation', () => {
    expect(() => resolveRevenueCatConfig({ BIRKARE_RELEASE_BUILD: '1' })).toThrow(/ANDROID/);
  });

  it('rejects secret keys instead of shipping them in public Expo extras', () => {
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'sk_never_public' }),
    ).toThrow(/never a secret/);
  });

  it('rejects swapped platform keys', () => {
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'goog_wrong_platform' }),
    ).toThrow(/swapped/);
  });

  it('accepts an explicit offering identifier', () => {
    expect(
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_OFFERING_ID: 'birkare_pro_v2' })
        .offeringId,
    ).toBe('birkare_pro_v2');
  });
});
