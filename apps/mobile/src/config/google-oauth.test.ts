import { describe, expect, it } from 'vitest';
import { validateGoogleOAuthClients } from '../../config/google-oauth.cjs';

const clients = {
  webClientId: '197394599682-web.apps.googleusercontent.com',
  iosClientId: '197394599682-ios.apps.googleusercontent.com',
  androidClientId: '197394599682-android.apps.googleusercontent.com',
};

describe('Google OAuth release configuration', () => {
  it('accepts distinct client types from one Google Cloud project', () => {
    expect(() => validateGoogleOAuthClients({ ...clients, requireAndroid: true })).not.toThrow();
  });

  it('accepts every active Play signing client from the same Google Cloud project', () => {
    expect(() => validateGoogleOAuthClients({
      ...clients,
      androidClientId: [
        clients.androidClientId,
        '197394599682-play-hybrid.apps.googleusercontent.com',
      ].join(','),
      requireAndroid: true,
    })).not.toThrow();
  });

  it('blocks an Android store build without its package and certificate client evidence', () => {
    expect(() =>
      validateGoogleOAuthClients({ ...clients, androidClientId: '', requireAndroid: true }),
    ).toThrow('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
  });

  it('blocks client IDs from a different Google Cloud project', () => {
    expect(() =>
      validateGoogleOAuthClients({
        ...clients,
        androidClientId: '999999999999-android.apps.googleusercontent.com',
        requireAndroid: true,
      }),
    ).toThrow('same project');
  });

  it('rejects empty entries and oversized Android client lists', () => {
    expect(() => validateGoogleOAuthClients({
      ...clients, androidClientId: `${clients.androidClientId},`, requireAndroid: true,
    })).toThrow('comma-separated');
    expect(() => validateGoogleOAuthClients({
      ...clients,
      androidClientId: Array.from({ length: 7 }, (_, index) => `197394599682-a${index}.apps.googleusercontent.com`).join(','),
      requireAndroid: true,
    })).toThrow('at most six');
  });

  it('allows iOS-only builds to omit the Android diagnostic client', () => {
    expect(() =>
      validateGoogleOAuthClients({ ...clients, androidClientId: '', requireAndroid: false }),
    ).not.toThrow();
  });
});
