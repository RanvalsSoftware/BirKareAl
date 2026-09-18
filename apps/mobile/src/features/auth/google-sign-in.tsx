import Constants from 'expo-constants';
import { useState } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import { useCopy } from '@/features/settings/language-store';
import { SocialButton } from './auth-ui';
import { GoogleAuthError, googleConfigurationError, googleSignInError } from './google-errors';

type NativeGoogleSignIn = typeof import('@react-native-google-signin/google-signin');

const GOOGLE_BRAND_ICON =
  'data:image/png;base64,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';


type GoogleConfigExtra = {
  googleIosClientId?: string;
  googleIosUrlScheme?: string;
  googleWebClientId?: string;
};

export type GoogleOAuthClientIds = {
  iosClientId?: string;
  iosUrlScheme?: string;
  webClientId?: string;
};

type GoogleSignInButtonProps = {
  label?: string;
  /** Sensitive actions need a newly issued provider token, not a cached login. */
  forceReauthentication?: boolean;
  disabled?: boolean;
  onError: (error: Error) => void;
  onSuccess: (idToken: string) => Promise<void>;
};

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  const extra = Constants.expoConfig?.extra as GoogleConfigExtra | undefined;

  return {
    iosClientId:
      nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ?? nonEmpty(extra?.googleIosClientId),
    iosUrlScheme:
      nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) ??
      nonEmpty(extra?.googleIosUrlScheme),
    webClientId:
      nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ?? nonEmpty(extra?.googleWebClientId),
  };
}

function getConfigurationError(clientIds: GoogleOAuthClientIds): Error | null {
  return googleConfigurationError(Platform.OS, clientIds);
}

function loadNativeGoogleSignIn(): NativeGoogleSignIn | null {
  // Expo Go cannot contain this third-party native module. Avoid evaluating
  // its package at all there, otherwise the missing TurboModule can throw an
  // invariant before our friendly development-build message is shown.
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return null;

  try {
    // The import must remain lazy: Expo Go does not contain the native module,
    // while an EAS development/production build does. This turns a stale or
    // Expo Go build into a clear in-app message instead of a startup crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not evaluate the native module in Expo Go.
    return require('@react-native-google-signin/google-signin') as NativeGoogleSignIn;
  } catch {
    return null;
  }
}

function nativeModuleUnavailableError(): Error {
  return new GoogleAuthError(
    'GOOGLE_NATIVE_MODULE_MISSING',
    'Google ile giriş için yeni bir iOS/Android development build gerekir. Bu özellik Expo Go’da çalışmaz.',
  );
}

/**
 * Removes only the native SDK's local account selection. This never revokes
 * Google access and is deliberately a no-op on web, Expo Go, or stale builds.
 */
export async function signOutOfNativeGoogleIfAvailable(): Promise<void> {
  const google = loadNativeGoogleSignIn();
  if (!google) return;

  try {
    await google.GoogleSignin.signOut();
  } catch {
    // BirKare's own refresh token is always cleared by the caller. A stale
    // native Google SDK cache must not prevent application sign-out.
  }
}

function formatGoogleError(google: NativeGoogleSignIn, error: unknown): Error {
  if (google.isErrorWithCode(error)) {
    if (error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Bu cihazda Google Play Hizmetleri kullanılamıyor veya güncel değil.');
    }
    if (error.code === google.statusCodes.IN_PROGRESS) {
      return new Error('Google ile giriş zaten başlatıldı. Lütfen işlemi tamamlayın.');
    }
  }

  return googleSignInError(error);
}

function configureGoogle(
  google: NativeGoogleSignIn,
  clientIds: Required<Pick<GoogleOAuthClientIds, 'webClientId'>> & GoogleOAuthClientIds,
): void {
  if (Platform.OS === 'ios') {
    google.GoogleSignin.configure({
      webClientId: clientIds.webClientId,
      iosClientId: clientIds.iosClientId,
      // BirKare only receives the signed ID token. It never asks the mobile
      // app for a Google refresh token or a web-client secret.
      offlineAccess: false,
    });
    return;
  }

  // Android proves the installed app through its package name and registered
  // signing certificate SHA-1 in Google Cloud. Do not pass a web/Android
  // client ID as an Android runtime configuration parameter.
  google.GoogleSignin.configure({
    webClientId: clientIds.webClientId,
    offlineAccess: false,
  });
}

/**
 * Uses Google's native Android/iOS SDK rather than browser redirects. The web
 * OAuth client ID is intentionally used as the audience for an ID token which
 * the BirKare server verifies before granting its own application session.
 */
export function GoogleSignInButton({
  label = 'Google ile giriş yap',
  forceReauthentication = false,
  disabled = false,
  onError,
  onSuccess,
}: GoogleSignInButtonProps) {
  const copy = useCopy();
  const [isWorking, setIsWorking] = useState(false);
  const clientIds = getGoogleOAuthClientIds();
  const configurationError = getConfigurationError(clientIds);

  const startGoogleSignIn = () => {
    if (disabled || isWorking) return;

    if (configurationError) {
      onError(configurationError);
      return;
    }

    const google = loadNativeGoogleSignIn();
    if (!google) {
      onError(nativeModuleUnavailableError());
      return;
    }

    setIsWorking(true);
    void (async () => {
      try {
        configureGoogle(google, clientIds as Required<Pick<GoogleOAuthClientIds, 'webClientId'>>);
        if (Platform.OS === 'android') {
          await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        // Only clear the native SDK's local cache for explicit reauthentication;
        // this never revokes Google access or signs out of the BirKare account.
        if (forceReauthentication) await google.GoogleSignin.signOut();

        const response = await google.GoogleSignin.signIn();
        if (!google.isSuccessResponse(response)) return;

        // Some restored native sessions expose the account before returning a
        // refreshed ID token. Ask the SDK for current tokens once; never send
        // a user ID or access token to the backend as an identity substitute.
        const idToken = response.data.idToken ?? (await google.GoogleSignin.getTokens()).idToken;
        if (!idToken) {
          throw new GoogleAuthError(
            'GOOGLE_ID_TOKEN_MISSING',
            'Google bu uygulama için kimlik belirteci vermedi. Web Client ID ile yeni native derlemenin eşleştiğini kontrol edin.',
          );
        }
        await onSuccess(idToken);
      } catch (error) {
        if (google.isErrorWithCode(error) && error.code === google.statusCodes.SIGN_IN_CANCELLED)
          return;
        onError(formatGoogleError(google, error));
      } finally {
        setIsWorking(false);
      }
    })();
  };

  return (
    <SocialButton
      disabled={disabled || isWorking}
      icon={
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={{ uri: GOOGLE_BRAND_ICON }}
          style={styles.googleIcon}
        />
      }
      loading={isWorking}
      loadingLabel={copy('Google açılıyor…', 'Opening Google…')}
      onPress={startGoogleSignIn}
      tone="light"
    >
      {label}
    </SocialButton>
  );
}

const styles = StyleSheet.create({
  googleIcon: { height: 20, width: 20 },
});
