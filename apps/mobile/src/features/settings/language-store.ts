import { tr } from '@/i18n/engine';
import { useLanguage } from '@/i18n/use-language';
import { useCallback } from 'react';
/** Compatibility for reviewed bilingual copy while screens use shared resources. */
export function useCopy() {
  const { language } = useLanguage();
  return useCallback(
    (turkish: string, english: string) => {
      if (language === 'tr') return turkish;
      if (language === 'en') return english;
      const translated = tr(turkish);
      // Newly added commerce copy may not have completed de/es/ar review yet.
      // Falling back to English is clearer than leaking Turkish into those UIs.
      return translated === turkish.replace(/\s+/g, ' ').trim() ? english : translated;
    },
    [language],
  );
}
export { useLanguage } from '@/i18n/use-language';
export { setLanguagePreference } from '@/i18n/engine';
