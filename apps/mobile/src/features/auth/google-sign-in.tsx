import Constants from 'expo-constants';
import { useState } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import { useCopy } from '@/features/settings/language-store';
import { SocialButton } from './auth-ui';
import { GoogleAuthError, googleConfigurationError, googleSignInError } from './google-errors';

type NativeGoogleSignIn = typeof import('@react-native-google-signin/google-signin');

const GOOGLE_BRAND_ICON = require('../../../assets/auth/google-g.png');

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
