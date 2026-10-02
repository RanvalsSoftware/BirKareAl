import type { ConfigContext, ExpoConfig } from 'expo/config';
import { validateGoogleOAuthClients } from './config/google-oauth.cjs';
import { resolvePublicMobileConfig } from './config/public-env.cjs';
import { resolveRevenueCatConfig } from './config/revenuecat.cjs';

const appName = 'BirKare AI';
const googleClientIdSuffix = '.apps.googleusercontent.com';
// OAuth client IDs identify the app and are safe to ship. These defaults make
// EAS builds deterministic; environment values can override them per stage.
// Never add the Web client secret here.
const suppliedGoogleWebClientId =
  '197394599682-a7897p3rt9i9ocgbmou6pbf1p3hjrepv.apps.googleusercontent.com';
const suppliedGoogleIosClientId =
  '197394599682-vnlj6rrm6iq3nshtnikohohiq0q9gpa2.apps.googleusercontent.com';

function nonEmpty(value: string | undefined): string {
  return value?.trim() ?? '';
}

function reversedGoogleClientId(clientId: string): string {
  if (!clientId.endsWith(googleClientIdSuffix)) return '';
  return `com.googleusercontent.apps.${clientId.slice(0, -googleClientIdSuffix.length)}`;
}

const googleWebClientId =
  nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.GOOGLE_WEB_CLIENT_ID) ||
  suppliedGoogleWebClientId;
const googleIosClientId =
  nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? process.env.GOOGLE_IOS_CLIENT_ID) ||
  suppliedGoogleIosClientId;
const googleAndroidClientId = nonEmpty(
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? process.env.GOOGLE_ANDROID_CLIENT_ID,
);
const googleIosUrlScheme =
  nonEmpty(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) ||
  reversedGoogleClientId(googleIosClientId);
const publicConfig = resolvePublicMobileConfig(process.env);
const androidStoreBuild =
  (process.env.EAS_BUILD_PLATFORM === 'android' || process.env.BIRKARE_ANDROID_RELEASE === '1') &&
  ['staging', 'production'].includes(publicConfig.appEnv);

validateGoogleOAuthClients({
  webClientId: googleWebClientId,
  iosClientId: googleIosClientId,
  androidClientId: googleAndroidClientId,
  requireAndroid: androidStoreBuild,
});

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  ['expo-localization', {
    supportedLocales: { ios: ['tr', 'en', 'de', 'es', 'ar'], android: ['tr', 'en', 'de', 'es', 'ar'] },
    supportsRTL: true,
  }],
  'expo-font',
  [
    'expo-build-properties',
    {
      ios: {
        // Xcode 27 / iOS 27 requires UIKit's scene-based lifecycle. Expo SDK
        // 57 keeps the legacy lifecycle unless this compatibility flag is set.
        enableSceneSupport: true,
      },
    },
  ],
  './plugins/with-development-url-scheme',
  './plugins/with-android-code-optimization',
  './plugins/with-android-release-signing',
  './plugins/with-revenuecat',
  [
    'expo-splash-screen',
    {
      image: './assets/onboarding/images/brand/logo-gold-icon.png',
      imageWidth: 196,
      resizeMode: 'contain',
      backgroundColor: '#000000',
      dark: {
        image: './assets/onboarding/images/brand/logo-gold-icon.png',
        backgroundColor: '#000000',
      },
    },
  ],
  [
    'expo-image-picker',
    {
      photosPermission:
        'BirKare AI, seçtiğiniz fotoğrafı yalnızca oluşturma işleminiz için kullanır.',
      cameraPermission: 'BirKare AI ile yeni bir kaynak fotoğraf çekebilirsiniz.',
    },
  ],
  'expo-secure-store',
  'expo-sharing',
  'expo-apple-authentication',
  './plugins/with-ios-release-environment',
];

if (googleIosUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'birkare-ai',
  scheme: 'birkareai',
  locales: {
    tr: './locales/tr.json',
    en: './locales/en.json',
    de: './locales/de.json',
    es: './locales/es.json',
    ar: './locales/ar.json',
  },
  version: '1.0',
  // App icons must be opaque. Keeping the transparent gold mark here makes
  // iOS flatten it over white, which is why the installed icon looked like a
  // white tile even though the application itself uses a black theme.
  icon: './assets/onboarding/images/brand/logo-gold-icon-black.png',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#050505',
  ios: {
    icon: './assets/onboarding/images/brand/logo-gold-icon-black.png',
    supportsTablet: true,
    bundleIdentifier: 'com.birkareai.mobile',
    buildNumber: '11',
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      UIUserInterfaceStyle: 'Dark',
      NSPhotoLibraryUsageDescription:
        'BirKare AI, seçtiğiniz fotoğrafı sahne ve filtre önizlemesi oluşturmak için kullanır.',
      NSCameraUsageDescription:
        'BirKare AI, yeni bir kaynak fotoğraf çekebilmeniz için kamerayı kullanır.',
      NSPhotoLibraryAddUsageDescription:
        'BirKare AI, ürettiğiniz görselleri Fotoğraflarınıza kaydedebilir.',
    },
  },
  android: {
    package: 'com.birkareai.mobile',
    // BirKare only needs user-selected media. Prevent Expo/native dependencies
    // from merging broad Android 13+ photo/video/audio read permissions into
    // the release manifest; ImagePicker uses the system picker instead.
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      // BirKare captures still images only; neither microphone access nor the
      // development client's draw-over-other-apps permission belongs in a
      // store release.
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    permissions: ['com.android.vending.BILLING'],
    // New Play upload with R8 code/resource optimization enabled.
    versionCode: 8,
    adaptiveIcon: {
      foregroundImage: './assets/onboarding/images/brand/logo-gold-icon.png',
      backgroundColor: '#050505',
    },
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '1a82d36d-7d54-46ef-b63b-919e195e832d',
    },
    appName,
    ...publicConfig,
    revenueCat: resolveRevenueCatConfig(process.env),
    // Client IDs are public application identifiers. Accept the server-style
    // variable names as a build-time fallback so one EAS environment can power
    // both the API verifier and this mobile config. OAuth client secrets stay
    // server-only and are deliberately not referenced here.
    googleWebClientId,
    googleIosClientId,
    googleIosUrlScheme,
    // Android's native Google SDK reads its app identity from the Android
    // package + registered SHA-1 in Google Cloud. This is retained for build
    // diagnostics only; it is never passed to GoogleSignin.configure().
    googleAndroidClientId,
  },
});
