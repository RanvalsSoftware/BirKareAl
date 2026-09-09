import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Notice, Screen, VisualTile } from '@/components';
import { scenes } from '@/constants/catalog';
import { standardCreationSelection, useCreateFlow } from '@/features/create/createFlow';
import { beautySceneImage } from '@/features/trends/catalog';
import { CreateHeader, WizardFooter } from '@/features/create/components';
import { afterScenePath } from '@/features/create/workflow';
import { colors, spacing, typography } from '@/theme';

export default function SceneScreen() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const { flow, set } = useCreateFlow();
  const selectedId = Array.isArray(selected) ? selected[0] : selected;
  useEffect(() => {
    if (selectedId && scenes.some((scene) => scene.id === selectedId))
      set(standardCreationSelection({ mode: 'scene', sceneId: selectedId }));
  }, [selectedId, set]);
  const chosen = scenes.some((scene) => scene.id === flow.sceneId) ? flow.sceneId! : scenes[0].id;

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader title="Sahne seç" subtitle="Seçtiğin kaynak bu sahneye taşınacak" step={2} />
      <Text style={styles.heading}>Sahneni seç</Text>
      <Text style={styles.intro}>
        Pozunu koruyarak çevreyi üretim sırasında yeniden tasarlayacağız.
      </Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        <VisualTile
          title="Güzellik"
          subtitle="Rötuş, cilt ve makyaj"
          imageSource={beautySceneImage}
          icon="sparkles-outline"
          palette={['#3A2830', '#B38A5B']}
          badge="10 görünüm"
          onPress={() => router.push('/beauty' as never)}
        />
        {scenes.map((scene) => (
          <VisualTile
            key={scene.id}
            title={scene.name}
            subtitle={scene.subtitle}
            palette={scene.palette}
            imageSource={scene.previewSource}
            icon={scene.icon}
            badge={scene.isPro ? 'PRO' : `${scene.creditCost} kredi`}
            selected={chosen === scene.id}
            onPress={() =>
              set(
                standardCreationSelection({
                  mode: flow.mode === 'background' ? 'background' : 'scene',
                  sceneId: scene.id,
                }),
              )
            }
          />
        ))}
      </View>
      <Notice tone="neutral" title="AI sahnesi">
        Seçtiğin sahne yaratıcı bir taslak olarak kullanılır; gerçek bir mekan kaydı değildir.
      </Notice>
      <WizardFooter
        label={flow.sourceUri ? 'Görseli düzenle' : 'Kaynak seç'}
        onPress={() => {
          set(
            standardCreationSelection({
              mode: flow.mode === 'background' ? 'background' : 'scene',
              sceneId: chosen,
            }),
          );
          router.push((flow.sourceUri ? afterScenePath(flow.mode) : '/create/upload') as never);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  heading: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xl },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
});
