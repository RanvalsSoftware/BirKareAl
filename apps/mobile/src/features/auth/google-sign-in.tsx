import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useCopy } from '@/features/settings/language-store';
import { SocialButton } from './auth-ui';
import { GoogleAuthError, googleConfigurationError, googleSignInError } from './google-errors';

type NativeGoogleSignIn = typeof import('@react-native-google-signin/google-signin');

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
  onSuccess: (idToken: string, profile: GoogleProfileHint) => Promise<void>;
};

export type GoogleProfileHint = {
  firstName: string | null;
  lastName: string | null;
};

const INSTANT_CANCEL_MS = 1500;

/**
 * Release builds keep console output (visible with `adb logcat -s ReactNativeJS`).
 * Only status codes and timings are logged: never tokens, emails or names.
 */
function logGoogleDiagnostic(event: string, details: Record<string, unknown>): void {
  console.warn(`[BirKare Google] ${event}`, JSON.stringify({ platform: Platform.OS, ...details }));
}

function describeError(error: unknown): Record<string, unknown> {
  const object = error && typeof error === 'object' ? (error as { code?: unknown; message?: unknown }) : {};
  return {
    code: typeof object.code === 'string' || typeof object.code === 'number' ? object.code : undefined,
    message: typeof object.message === 'string' ? object.message.slice(0, 200) : undefined,
  };
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  const extra = Constants.expoConfig?.extra as GoogleConfigExtra | undefined;

  return {
    iosClientId:
      nonEmpty(extra?.googleIosClientId) ?? nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    iosUrlScheme:
      nonEmpty(extra?.googleIosUrlScheme) ??
      nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME),
    webClientId:
      nonEmpty(extra?.googleWebClientId) ?? nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
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
    translateCopy(
      'Google ile giriş için yeni bir iOS/Android development build gerekir. Bu özellik Expo Go’da çalışmaz.',
    ),
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
      return new Error(
        translateCopy('Bu cihazda Google Play Hizmetleri kullanılamıyor veya güncel değil.'),
      );
    }
    if (error.code === google.statusCodes.IN_PROGRESS) {
      return new Error(
        translateCopy('Google ile giriş zaten başlatıldı. Lütfen işlemi tamamlayın.'),
      );
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
  label = translateCopy('Google ile giriş yap'),
  forceReauthentication = false,
  disabled = false,
  onError,
  onSuccess,
}: GoogleSignInButtonProps) {
  const languageRevision = useLanguageRevision();

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

        const startedAt = Date.now();
        const response = await google.GoogleSignin.signIn();
        if (!google.isSuccessResponse(response)) {
          const elapsedMs = Date.now() - startedAt;
          logGoogleDiagnostic('sign-in returned without success', { type: response.type, elapsedMs });
          // Android reports an unregistered package/SHA-1 as an instant
          // "cancelled" result (status 12501) without showing any account
          // picker. A real user cancellation needs the picker to be shown first.
          if (Platform.OS === 'android' && elapsedMs < INSTANT_CANCEL_MS) {
            onError(
              new GoogleAuthError(
                'GOOGLE_CLIENT_CONFIGURATION',
                translateCopy(
                  'Google ile giriş şu anda kullanılamıyor. E-posta ve şifrenle giriş yapabilir veya daha sonra tekrar deneyebilirsin.',
                ),
              ),
            );
          }
          return;
        }

        // Some restored native sessions expose the account before returning a
        // refreshed ID token. Ask the SDK for current tokens once; never send
        // a user ID or access token to the backend as an identity substitute.
        const idToken = response.data.idToken ?? (await google.GoogleSignin.getTokens()).idToken;
        if (!idToken) {
          throw new GoogleAuthError(
            'GOOGLE_ID_TOKEN_MISSING',
            translateCopy(
              'Google bu uygulama için kimlik belirteci vermedi. Web Client ID ile yeni native derlemenin eşleştiğini kontrol edin.',
            ),
          );
        }
        // The ID token remains the only identity proof. Native profile fields
        // are merely a form-prefill fallback for Android accounts whose token
        // omits optional given_name/family_name claims; the user reviews and
        // submits them on the protected profile-completion screen.
        await onSuccess(idToken, {
          firstName: nonEmpty(response.data.user.givenName) ?? null,
          lastName: nonEmpty(response.data.user.familyName) ?? null,
        });
      } catch (error) {
        logGoogleDiagnostic('sign-in failed', describeError(error));
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
      icon={<Ionicons name="logo-google" color="#111111" size={20} />}
      loading={isWorking}
      loadingLabel={copy('Google açılıyor…', 'Opening Google…')}
      onPress={startGoogleSignIn}
      tone="light"
    >
      {label}
    </SocialButton>
  );
}
