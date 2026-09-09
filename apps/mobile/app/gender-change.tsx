import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditBadge, Notice, Screen } from '@/components';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { genderPreview } from '@/features/beauty/catalog';
import { useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, MiniChoice, WizardFooter } from '@/features/create/components';
import { colors, typography } from '@/theme';

export default function GenderChangeScreen() {
  return (
    <RequireAuthenticated>
      <GenderChangeEditor />
    </RequireAuthenticated>
  );
}
function GenderChangeEditor() {
  const router = useRouter();
  const credits = useAvailableCredits();
  const { flow, set } = useCreateFlow();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    set({
      toolId: 'gender-change',
      mode: 'filter',
      beauty: null,
      trendPreset: null,
      sceneId: null,
      personId: null,
      styleId: 'filter-natural',
      filterIntensity: 0,
      preserveFace: false,
      preserveClothes: true,
      customInstruction: '',
      transformation: flow.transformation ?? null,
    });
    if (flow.sourceKind === 'fictional')
      set({
        sourceKind: 'photo',
        sourceCharacterId: null,
        sourceUri: null,
        sourceName: null,
        sourceRightsConfirmed: false,
      });
  }, [flow.transformation, flow.sourceKind, set]);
  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        title="Cinsiyet değiştirme"
        subtitle="Yaratıcı AI görünüm dönüşümü"
        fallback="/(tabs)/explore"
      />
      <View style={styles.credit}>
        <Text style={styles.hint}>Güzellik rötuşundan ayrı bir AI araçtır.</Text>
        <CreditBadge credits={credits} />
      </View>
      <View style={styles.preview}>
        <Image
          source={flow.sourceUri ? { uri: flow.sourceUri } : genderPreview}
          resizeMode="contain"
          style={styles.image}
        />
      </View>
      <Text style={styles.hint}>
        {flow.sourceUri
          ? 'Kaynak fotoğrafın · Dönüşüm oluşturduğunda uygulanır.'
          : 'Temsili dönüşüm görseli · Kendi fotoğrafını yükle.'}
      </Text>
      <Text style={styles.title}>Nasıl bir görünüm istersin?</Text>
      <View style={styles.row}>
        {(['feminine', 'masculine'] as const).map((presentation) => (
          <MiniChoice
            key={presentation}
            label={presentation === 'feminine' ? 'Kadınsı görünüm' : 'Erkeksi görünüm'}
            selected={flow.transformation?.presentation === presentation}
            onPress={() => set({ transformation: { kind: 'gender-swap', presentation } })}
          />
        ))}
      </View>
      <Notice tone="neutral" title="Sen seçersin">
        Fotoğraftan cinsiyetin veya kimliğin tahmin edilmez. Seçtiğin sunuma göre yetişkin yüz
        görünümü yaratıcı biçimde düzenlenir; kıyafet, poz ve arka plan korunur. Sonuç kimliğin
        hakkında bir çıkarım değildir.
      </Notice>
      <WizardFooter
        label={
          flow.sourceUri && flow.sourceRightsConfirmed ? 'Üretim özetini gör' : 'Fotoğrafını seç'
        }
        disabled={!flow.transformation}
        onPress={() =>
          router.push(
            (flow.sourceUri && flow.sourceRightsConfirmed
              ? '/create/review'
              : '/create/upload') as never,
          )
        }
        hint={
          flow.transformation
            ? 'Kredi maliyetini üretimden önce görüp onaylarsın.'
            : 'Devam etmek için istediğin görünümü seç.'
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  credit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  preview: {
    height: 390,
    backgroundColor: '#151416',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: { width: '100%', height: '100%' },
  hint: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  title: { ...typography.h2, color: '#fff', marginTop: 25, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
});
