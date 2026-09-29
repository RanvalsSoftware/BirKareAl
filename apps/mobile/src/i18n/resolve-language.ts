export type Language = 'tr' | 'en';
export type LanguagePreference = 'system' | Language;
export type DeviceLocale = { languageTag?: string | null; languageCode?: string | null };

export function parseLanguagePreference(value: unknown): LanguagePreference {
  return value === 'tr' || value === 'en' ? value : 'system';
}

/** Use the ordered OS/app language preferences, never location, IP or store country. */
export function resolveLanguage(preference: LanguagePreference, locales: readonly DeviceLocale[]): Language {
  if (preference !== 'system') return preference;
  for (const locale of locales) {
    const language = (locale.languageTag || locale.languageCode || '').trim().split(/[-_]/)[0]?.toLowerCase();
    if (language === 'tr' || language === 'en') return language;
  }
  return 'en';
}

export function formattingLocale(language: Language, locales: readonly DeviceLocale[] = []): string {
  const tag = locales.find((locale) => (locale.languageTag || '').split(/[-_]/)[0]?.toLowerCase() === language)?.languageTag;
  try {
    if (tag && Intl.getCanonicalLocales(tag.replace(/_/g, '-')).length) return Intl.getCanonicalLocales(tag.replace(/_/g, '-'))[0]!;
  } catch { /* A malformed native locale must not break launch. */ }
  return language === 'tr' ? 'tr-TR' : 'en-US';
}
