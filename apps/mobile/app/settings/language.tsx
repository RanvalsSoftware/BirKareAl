import { SettingsPage } from '@/features/settings/components';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { useLanguageRevision } from '@/i18n/use-language';
import { t, tr as translateCopy } from '@/i18n/engine';
export default function LanguageScreen() {
  const languageRevision = useLanguageRevision();

  useLanguageRevision();
  return (
    <SettingsPage
      backLabel={translateCopy('Ayarlar')}
      title={t('language.title')}
      subtitle={t('language.subtitle')}
    >
      <LanguagePicker />
    </SettingsPage>
  );
}
