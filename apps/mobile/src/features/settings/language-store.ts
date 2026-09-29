import { useLanguage } from '@/i18n/use-language';
/** Compatibility for reviewed bilingual copy while screens use shared resources. */
export function useCopy() {
  const { language } = useLanguage();
  return (turkish: string, english: string) => language === 'tr' ? turkish : english;
}
export { useLanguage } from '@/i18n/use-language';
export { setLanguagePreference } from '@/i18n/engine';
