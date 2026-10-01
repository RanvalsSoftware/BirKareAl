import { SettingsPage } from '@/features/settings/components';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { useLanguageRevision } from '@/i18n/use-language';
import { t } from '@/i18n/engine';
export default function LanguageScreen() {
  const languageRevision = useLanguageRevision();

  useLanguageRevision();
  return (
    <SettingsPage title={t('language.title')} subtitle={t('language.subtitle')}>
      <LanguagePicker />
    </SettingsPage>
  );
}
