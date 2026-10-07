import { useLanguageRevision } from '@/i18n/use-language';
import { Redirect } from 'expo-router';
import { useCreateFlow } from '@/features/create/createFlow';
import { afterSourcePath } from '@/features/create/workflow';

/** No fabricated quality checks: source validation happens on upload at the API. */
export default function QualityCheckScreen() {
  const languageRevision = useLanguageRevision();

  const { flow } = useCreateFlow();
  return <Redirect href={afterSourcePath(flow)} />;
}
