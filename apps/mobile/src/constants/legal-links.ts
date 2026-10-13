import { Linking } from 'react-native';

import { getLanguage } from '@/i18n/engine';

const privacyPolicyPaths = {
  tr: '/birkare/gizlilik-politikasi/',
  en: '/en/birkare/privacy-policy/',
  de: '/de/birkare/privacy-policy/',
  es: '/es/birkare/privacy-policy/',
  ar: '/ar/birkare/privacy-policy/',
} as const;

/**
 * Apple's standard End User License Agreement. The App Store listing points
 * at the same document, so the in-app link and the store metadata agree.
 */
export const appleStandardEulaUrl =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** The website is the single published source for BirKare's privacy policy. */
export function birkarePrivacyPolicyUrl() {
  return `https://ai.ranvals.com${privacyPolicyPaths[getLanguage()]}`;
}

async function openExternal(url: string, failureMessage: string) {
  if (!(await Linking.canOpenURL(url))) throw new Error(failureMessage);
  await Linking.openURL(url);
}

export async function openBirkarePrivacyPolicy() {
  await openExternal(
    birkarePrivacyPolicyUrl(),
    'Gizlilik politikası açılamadı. Lütfen daha sonra tekrar dene.',
  );
}

export async function openAppleStandardEula() {
  await openExternal(
    appleStandardEulaUrl,
    'Lisans sözleşmesi açılamadı. Lütfen daha sonra tekrar dene.',
  );
}
