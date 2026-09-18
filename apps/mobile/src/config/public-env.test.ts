import { describe, expect, it } from 'vitest';
import { resolvePublicMobileConfig } from '../../config/public-env.cjs';
import eas from '../../eas.json';

const release = {
  EXPO_PUBLIC_APP_ENV: 'staging',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.birkare.ai',
  EXPO_PUBLIC_SUPPORT_EMAIL: 'birkareal@ranvals.com',
};

describe('mobile release configuration', () => {
  it('retains development defaults without requiring deployment credentials', () => {
    expect(resolvePublicMobileConfig({})).toEqual({
      appEnv: 'development',
      apiBaseUrl: 'http://localhost:4000',
      supportEmail: 'birkareal@ranvals.com',
    });
  });

  it('accepts explicit staging and production public config', () => {
    for (const environment of ['staging', 'production']) {
      expect(
        resolvePublicMobileConfig({
          ...release,
          EXPO_PUBLIC_APP_ENV: environment,
          EAS_BUILD_PROFILE: environment,
        }),
      ).toEqual({
        appEnv: environment,
        apiBaseUrl: release.EXPO_PUBLIC_API_BASE_URL,
        supportEmail: release.EXPO_PUBLIC_SUPPORT_EMAIL,
      });
    }
  });

  it.each([
    '',
    'http://api.birkare.ai',
    'https://localhost:4000',
    'https://127.0.0.1',
    'https://10.0.2.2',
    'https://192.168.1.4',
    'https://172.16.0.1',
    'https://[::1]',
    'https://api.local',
    'https://api.internal',
    'https://example.com',
    'https://api.example.org',
    'https://your-domain.com',
    'https://senindomainin.com',
    'https://api.senindomainin.com',
    'https://api.invalid',
    'https://user:secret@api.birkare.ai',
    'https://api.birkare.ai?token=secret',
    'https://api.birkare.ai#fragment',
  ])('rejects a non-release-safe API address: %s', (api) => {
    expect(() => resolvePublicMobileConfig({ ...release, EXPO_PUBLIC_API_BASE_URL: api })).toThrow(
      'EXPO_PUBLIC_API_BASE_URL',
    );
  });

  it.each([
    '',
    'not-an-email',
    'support@localhost',
    'support@example.com',
    'Name <support@birkare.ai>',
  ])('requires an explicit non-placeholder support mailbox: %s', (email) => {
    expect(() =>
      resolvePublicMobileConfig({ ...release, EXPO_PUBLIC_SUPPORT_EMAIL: email }),
    ).toThrow('EXPO_PUBLIC_SUPPORT_EMAIL');
  });

  it('does not let store profiles or native release flags fall back to development', () => {
    for (const settings of [
      { EAS_BUILD_PROFILE: 'production' },
      { EAS_BUILD_PROFILE: 'staging' },
      { BIRKARE_ANDROID_RELEASE: '1' },
      { BIRKARE_RELEASE_BUILD: '1' },
    ]) {
      expect(() => resolvePublicMobileConfig(settings)).toThrow('EXPO_PUBLIC_APP_ENV');
    }
    expect(() =>
      resolvePublicMobileConfig({ ...release, EAS_BUILD_PROFILE: 'production' }),
    ).toThrow('same release environment');
    expect(() => resolvePublicMobileConfig({ EXPO_PUBLIC_APP_ENV: 'prodution' })).toThrow(
      'EXPO_PUBLIC_APP_ENV',
    );
  });

  it('rejects optional local public link endpoints in releases', () => {
    expect(() =>
      resolvePublicMobileConfig({
        ...release,
        EXPO_PUBLIC_SHARE_BASE_URL: 'http://localhost:3002',
      }),
    ).toThrow('EXPO_PUBLIC_SHARE_BASE_URL');
  });

  it('returns only explicit public config and never echoes accidental public secrets', () => {
    const secret = 'NEVER_LOG_THIS_SECRET';
    expect(
      resolvePublicMobileConfig({ ...release, OPENAI_API_KEY: secret, DATABASE_URL: secret }),
    ).toEqual({
      appEnv: 'staging',
      apiBaseUrl: release.EXPO_PUBLIC_API_BASE_URL,
      supportEmail: release.EXPO_PUBLIC_SUPPORT_EMAIL,
    });
    try {
      resolvePublicMobileConfig({ ...release, EXPO_PUBLIC_OPENAI_API_KEY: secret });
      throw new Error('Expected unsafe public key to be rejected');
    } catch (error) {
      expect(String(error)).toContain('EXPO_PUBLIC_OPENAI_API_KEY');
      expect(String(error)).not.toContain(secret);
    }
  });

  it('allows RevenueCat public identifiers consumed separately by app.config', () => {
    expect(
      resolvePublicMobileConfig({
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_public',
        EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'test_public',
        EXPO_PUBLIC_REVENUECAT_OFFERING_ID: 'birkare_pro',
      }),
    ).toEqual({
      appEnv: 'development',
      apiBaseUrl: 'http://localhost:4000',
      supportEmail: 'birkareal@ranvals.com',
    });
  });

  it('uses explicit store AAB profiles with distinct EAS environments', () => {
    expect(eas.cli.appVersionSource).toBe('local');
    expect(eas.build.staging).toMatchObject({
      distribution: 'store',
      credentialsSource: 'local',
      autoIncrement: false,
      environment: 'preview',
      env: { EXPO_PUBLIC_APP_ENV: 'staging' },
      android: { buildType: 'app-bundle' },
    });
    expect(eas.build.production).toMatchObject({
      distribution: 'store',
      credentialsSource: 'local',
      autoIncrement: false,
      environment: 'production',
      env: { EXPO_PUBLIC_APP_ENV: 'production' },
      android: { buildType: 'app-bundle' },
    });
  });
});
