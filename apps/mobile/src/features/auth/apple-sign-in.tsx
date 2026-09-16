import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useCopy } from '@/features/settings/language-store';

type AppleSignInButtonProps = {
  disabled?: boolean;
  onError: (error: Error) => void;
  onSuccess: (input: { idToken: string; firstName?: string; lastName?: string }) => Promise<void>;
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
        if ((error as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED') return;
        onError(
          error instanceof Error
            ? error
            : new Error(
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
      style={disabled ? styles.disabled : null}
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
  button: { height: 54, width: '100%' },
  disabled: { opacity: 0.55 },
});
