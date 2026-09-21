import type { ConfigContext, ExpoConfig } from 'expo/config';
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

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  'expo-font',
  './plugins/with-development-url-scheme',
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
  [
    'expo-camera',
    {
      cameraPermission: 'BirKare AI ile yeni bir kaynak fotoğraf çekebilirsiniz.',
    },
  ],
  'expo-secure-store',
  'expo-sharing',
  'expo-apple-authentication',
  'expo-notifications',
];

if (googleIosUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'birkare-ai',
  scheme: 'birkareai',
  version: '0.1.0',
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
    usesAppleSignIn: true,
    infoPlist: {
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
    permissions: ['com.android.vending.BILLING'],
    // First Play upload. Increment manually and sync native Gradle before each
    // new upload; eas.json intentionally does not rewrite this dynamic config.
    versionCode: 1,
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
