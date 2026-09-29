import { useLanguageRevision } from '@/i18n/use-language';
import { CustomProPaywall } from '@/features/billing/CustomProPaywall';

export default function ProScreen() {
  const languageRevision = useLanguageRevision();

  return <CustomProPaywall />;
}
