import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useCopy } from '@/features/settings/language-store';
import { SocialButton } from './auth-ui';

type AppleSignInButtonProps = {
  disabled?: boolean;
  onError: (error: Error) => void;
  onSuccess: (input: { idToken: string; firstName?: string; lastName?: string }) => Promise<void>;
};
type AppleAuthenticationError = { code?: unknown };

export function AppleSignInButton({ disabled = false, onError, onSuccess }: AppleSignInButtonProps) {
  const copy = useCopy();
  const [available, setAvailable] = useState(false);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AppleAuthentication.isAvailableAsync().then((value) => { if (active) setAvailable(value); }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);
  if (!available) return null;

  const signIn = () => {
    if (disabled || working) return;
    setWorking(true);
    void AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    }).then(async (credential) => {
      if (!credential.identityToken) throw new Error(copy('Apple kimlik belirteci alınamadı. Lütfen yeniden deneyin.', 'Could not receive the Apple identity token. Please try again.'));
      await onSuccess({
        idToken: credential.identityToken,
        ...(credential.fullName?.givenName ? { firstName: credential.fullName.givenName } : {}),
        ...(credential.fullName?.familyName ? { lastName: credential.fullName.familyName } : {}),
      });
    }).catch((error: unknown) => {
      const object = error as (AppleAuthenticationError & { message?: unknown }) | null;
      const code = typeof object?.code === 'string' ? object.code : '';
      // A successful Apple exchange may be followed by a precise server policy
      // rejection. Do not hide that under a generic Apple SDK failure.
      if (/^(?:(?:AUTH|NETWORK|EMAIL)_[A-Z0-9_]+|INVALID_EMAIL|DISPOSABLE_EMAIL_NOT_ALLOWED)$/.test(code) && error instanceof Error) {
        onError(error); return;
      }
      if (code === 'ERR_REQUEST_CANCELED') return;
      if (code === 'ERR_REQUEST_UNKNOWN') {
        onError(new Error(copy(
          'Apple ile giriş bu iOS oturumunda başlatılamadı. iOS Simulator kullanıyorsan gerçek bir iPhone’da dene. Gerçek cihazda da sürerse Sign in with Apple yetkisini içeren yeni bir iOS build kur.',
          'Apple Sign In could not start in this iOS session. On the simulator, try a real iPhone. If it also fails there, install a new iOS build with the Sign in with Apple capability.',
        ))); return;
      }
      if (['ERR_REQUEST_FAILED', 'ERR_REQUEST_NOT_HANDLED', 'ERR_REQUEST_NOT_INTERACTIVE', 'ERR_INVALID_RESPONSE', 'ERR_INVALID_OPERATION', 'ERR_INVALID_SCOPE'].includes(code)) {
        onError(new Error(copy('Apple ile giriş şu anda tamamlanamadı. Lütfen tekrar dene veya uygulamanın güncel iOS build’ini kullan.', 'Sign in with Apple could not be completed right now. Please try again or use the latest iOS build of the app.'))); return;
      }
      onError(new Error(copy('Apple ile giriş tamamlanamadı. Lütfen tekrar deneyin.', 'Could not complete Sign in with Apple. Please try again.')));
    }).finally(() => setWorking(false));
  };
  return (
    <SocialButton disabled={disabled || working} icon={<Ionicons name="logo-apple" color="#111111" size={22} />}
      loading={working} loadingLabel={copy('Apple açılıyor…', 'Opening Apple…')} onPress={signIn} tone="light">
      {copy('Apple ile giriş yap', 'Sign in with Apple')}
    </SocialButton>
  );
}
