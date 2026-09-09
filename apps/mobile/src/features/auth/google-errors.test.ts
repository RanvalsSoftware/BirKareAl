import { describe, expect, it } from 'vitest';
import { GoogleAuthError, googleConfigurationError, googleSignInError } from './google-errors';

const config = {
  webClientId: '123-web.apps.googleusercontent.com',
  iosClientId: '123-ios.apps.googleusercontent.com',
  iosUrlScheme: 'com.googleusercontent.apps.123-ios',
};
describe('Google sign-in diagnosis', () => {
  it('accepts matching platform client configuration', () => {
    expect(googleConfigurationError('ios', config)).toBeNull();
    expect(googleConfigurationError('android', { webClientId: config.webClientId })).toBeNull();
  });
  it('rejects a stale iOS scheme and swapped client types before invoking native code', () => {
    expect(
      googleConfigurationError('ios', { ...config, iosUrlScheme: 'com.example.old' }),
    ).toMatchObject({ code: 'GOOGLE_IOS_SCHEME_MISMATCH' });
    expect(
      googleConfigurationError('ios', { ...config, webClientId: config.iosClientId }),
    ).toMatchObject({ code: 'GOOGLE_CLIENT_TYPES_MISMATCH' });
    expect(googleConfigurationError('web', config)).toBeInstanceOf(GoogleAuthError);
  });
  it('explains existing email account linking without silently merging accounts', () => {
    const error = googleSignInError({
      code: 'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED',
      message: 'conflict',
    });
    expect(error.message).toContain('Ayarlar > Güvenlik');
    expect(error.message).toContain('E-posta ve şifrenle giriş');
  });
  it('keeps raw native details out of error messages', () => {
    const error = googleSignInError({
      code: 'DEVELOPER_ERROR',
      message: 'internal token=do-not-display',
    });
    expect(error).toMatchObject({ code: 'GOOGLE_CLIENT_CONFIGURATION' });
    expect(error.message).not.toContain('do-not-display');
    expect(googleSignInError(new Error('Network request failed'))).toMatchObject({
      code: 'GOOGLE_NETWORK_ERROR',
    });
  });
});
