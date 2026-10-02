import { Linking } from 'react-native';

import { getLanguage } from '@/i18n/engine';

const privacyPolicyPaths = {
  tr: '/birkare/gizlilik-politikasi/',
  en: '/en/birkare/privacy-policy/',
  de: '/de/birkare/privacy-policy/',
  es: '/es/birkare/privacy-policy/',
  ar: '/ar/birkare/privacy-policy/',
} as const;

/** The website is the single published source for BirKare's privacy policy. */
export function birkarePrivacyPolicyUrl() {
  return `https://ai.ranvals.com${privacyPolicyPaths[getLanguage()]}`;
}

export async function openBirkarePrivacyPolicy() {
  const url = birkarePrivacyPolicyUrl();
  if (!(await Linking.canOpenURL(url))) throw new Error('Gizlilik politikası açılamadı. Lütfen daha sonra tekrar dene.');
  await Linking.openURL(url);
}
