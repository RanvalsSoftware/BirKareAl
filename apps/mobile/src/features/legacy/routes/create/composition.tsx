import { useLanguageRevision } from '@/i18n/use-language';
import { Redirect } from 'expo-router';

/** Framing controls are now part of the unified editor. */
export default function CompositionScreen() {
  const languageRevision = useLanguageRevision();

  return <Redirect href="/create/settings" />;
}
