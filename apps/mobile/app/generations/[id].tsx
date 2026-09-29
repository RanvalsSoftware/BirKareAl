import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/components';
import { tr } from '@/i18n/engine';
import { useLanguageRevision } from '@/i18n/use-language';

export default function GenerationDetailScreen() {
  useLanguageRevision();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const generationId = typeof id === 'string' ? id : undefined;
  if (!generationId) return <Screen><Text>{tr('Üretim bulunamadı.')}</Text></Screen>;
  return <Redirect href={{ pathname: '/generations/[id]/results', params: { id: generationId } } as never} />;
}
