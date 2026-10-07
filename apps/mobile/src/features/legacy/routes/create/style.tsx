import { useLanguageRevision } from '@/i18n/use-language';
import { Redirect } from 'expo-router';

/** Filters now live directly below the source photo in the single editor. */
export default function StyleScreen() {
  const languageRevision = useLanguageRevision();

  return <Redirect href="/create/settings" />;
}
