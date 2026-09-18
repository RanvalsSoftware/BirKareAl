import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useCopy } from '@/features/settings/language-store';

type AppleSignInButtonProps = {
  disabled?: boolean;
  onError: (error: Error) => void;
  onSuccess: (input: { idToken: string; firstName?: string; lastName?: string }) => Promise<void>;
};

type AppleAuthenticationError = {
  code?: unknown;
};

export function AppleSignInButton({
  disabled = false,
  onError,
  onSuccess,
}: AppleSignInButtonProps) {
  const copy = useCopy();
  const [available, setAvailable] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AppleAuthentication.isAvailableAsync().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  const signIn = () => {
    if (disabled || working) return;
    setWorking(true);
    void AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
      .then(async (credential) => {
        if (!credential.identityToken) {
          throw new Error(
            copy(
              'Apple kimlik belirteci alınamadı. Lütfen yeniden deneyin.',
              'Could not receive the Apple identity token. Please try again.',
            ),
          );
        }
        await onSuccess({
          idToken: credential.identityToken,
          ...(credential.fullName?.givenName ? { firstName: credential.fullName.givenName } : {}),
          ...(credential.fullName?.familyName ? { lastName: credential.fullName.familyName } : {}),
        });
      })
      .catch((error: unknown) => {
        const code = (error as AppleAuthenticationError | null)?.code;
        if (code === 'ERR_REQUEST_CANCELED') return;

        if (code === 'ERR_REQUEST_UNKNOWN') {
          onError(
            new Error(
              copy(
                'Apple ile giriş bu iOS oturumunda başlatılamadı. iOS Simulator kullanıyorsan gerçek bir iPhone’da dene. Gerçek cihazda da sürerse Sign in with Apple yetkisini içeren yeni bir iOS build kur.',
                'Sign in with Apple could not start in this iOS session. If you are using the iOS Simulator, try a real iPhone. If it also happens on a real device, install a new iOS build with the Sign in with Apple capability enabled.',
              ),
            ),
          );
          return;
        }

        if (
          code === 'ERR_REQUEST_FAILED' ||
          code === 'ERR_REQUEST_NOT_HANDLED' ||
          code === 'ERR_REQUEST_NOT_INTERACTIVE' ||
          code === 'ERR_INVALID_RESPONSE' ||
          code === 'ERR_INVALID_OPERATION' ||
          code === 'ERR_INVALID_SCOPE'
        ) {
          onError(
            new Error(
              copy(
                'Apple ile giriş şu anda tamamlanamadı. Lütfen tekrar dene veya uygulamanın güncel iOS build’ini kullan.',
                'Sign in with Apple could not be completed right now. Please try again or use the latest iOS build of the app.',
              ),
            ),
          );
          return;
        }

        onError(
          new Error(
            copy(
              'Apple ile giriş tamamlanamadı. Lütfen tekrar deneyin.',
              'Could not complete Sign in with Apple. Please try again.',
            ),
          ),
        );
      })
      .finally(() => setWorking(false));
  };

  return (
    <View
      pointerEvents={disabled || working ? 'none' : 'auto'}
      style={[styles.container, disabled ? styles.disabled : null]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel={copy('Apple ile devam et', 'Continue with Apple')}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        cornerRadius={16}
        onPress={signIn}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  button: { height: 54, width: '100%' },
  disabled: { opacity: 0.55 },
});
