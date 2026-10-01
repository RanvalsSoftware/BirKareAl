import { useLanguageRevision } from '@/i18n/use-language';
import { getLocale as getAppLocale, tr as translateCopy } from '@/i18n/engine';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  CategoryChip,
  CreditBadge,
  EmptyState,
  SectionHeader,
  VisualTile,
} from '@/components';
import { apiBaseUrl } from '@/api/client';
import { projectCategories } from '@/constants/catalog';
import { colors, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useAuthStore } from '@/features/auth/auth-store';
import { useUserProjects, type UserProject } from '@/features/projects/use-user-projects';

type ProjectCategory = 'Sahneler' | 'Filtreler' | 'Ürünler' | 'Kıyafet' | 'Tırnak';

const MODE_DISPLAY: Record<
  UserProject['mode'],
  {
    category: ProjectCategory;
    fallbackTitle: string;
    palette: readonly [string, string];
    icon: string;
  }
> = {
  FULL_SCENE: {
    category: 'Sahneler',
    fallbackTitle: 'Yeni sahne',
    palette: ['#27104C', '#135E73'],
    icon: '◈',
  },
  FAN_MOMENT: {
    category: 'Sahneler',
    fallbackTitle: 'Kurgusal sahne',
    palette: ['#183A4E', '#50621B'],
    icon: '⚽',
  },
  AI_FILTER: {
    category: 'Filtreler',
    fallbackTitle: 'AI filtre',
    palette: ['#5F243D', '#B78258'],
    icon: '◌',
  },
  PRO_PORTRAIT: {
    category: 'Sahneler',
    fallbackTitle: 'Profesyonel portre',
    palette: ['#202020', '#565656'],
    icon: '◐',
  },
  BACKGROUND_REPLACE: {
    category: 'Sahneler',
    fallbackTitle: 'Arka plan değiştir',
    palette: ['#2C4559', '#BF8339'],
    icon: '◈',
  },
  PRODUCT_STUDIO: {
    category: 'Ürünler',
    fallbackTitle: 'Ürün çekimi',
    palette: ['#33230E', '#B68738'],
    icon: '◫',
  },
  VIRTUAL_TRY_ON: {
    category: 'Kıyafet',
    fallbackTitle: 'Kıyafet deneme',
    palette: ['#3B2C41', '#9A6F91'],
    icon: '◇',
  },
  NAIL_PREVIEW: {
    category: 'Tırnak',
    fallbackTitle: 'Manikür önizleme',
    palette: ['#4A0D1F', '#B14469'],
    icon: '✦',
  },
};

function formatProjectDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return translateCopy('Yakın zamanda');

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfProjectDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfToday.getTime() - startOfProjectDay.getTime()) / 86_400_000);
  if (daysAgo === 0) return translateCopy('Bugün');
  if (daysAgo === 1) return translateCopy('Dün');
  return new Intl.DateTimeFormat(getAppLocale(), { day: 'numeric', month: 'long' }).format(date);
}

const emptyProjectArtwork = {
  hero: require('../../assets/projects/top-1.png'),
  trend: require('../../assets/projects/click.png'),
  reference: require('../../assets/projects/add-photo.png'),
  save: require('../../assets/projects/save.png'),
} as const;

function FirstProjectEmptyState({
  onCreate,
  onExplore,
}: {
  onCreate: () => void;
  onExplore: () => void;
}) {
  const languageRevision = useLanguageRevision();

  const reducedMotion = useReducedMotion();
  const features = [
    { image: emptyProjectArtwork.trend, label: translateCopy('Trend akımlarını dene') },
    { image: emptyProjectArtwork.reference, label: translateCopy('Referans görsel ekle') },
    { image: emptyProjectArtwork.save, label: translateCopy('Sonuçlarını kaydet') },
  ];

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(160) : FadeInDown.duration(420).springify()}
      style={styles.firstProject}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={emptyProjectArtwork.hero}
        style={styles.firstProjectHero}
      />
      <Text style={styles.firstProjectTitle}>{translateCopy('Henüz projen yok')}</Text>
      <Text style={styles.firstProjectDetail}>
        {translateCopy('İlk projeni oluşturarak yapay zeka ile harika görseller üretmeye başla.')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onCreate}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
      >
        <LinearGradient
          colors={['#FFE66E', '#FFD51F', '#F5BF00']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>{translateCopy('İlk Projeyi Oluştur')}</Text>
        </LinearGradient>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onExplore}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.secondaryButtonText}>{translateCopy('Örnek projeleri keşfet')}</Text>
      </Pressable>
      <View style={styles.featureStrip}>
        {features.map((feature, index) => (
          <View key={feature.label} style={[styles.feature, index > 0 && styles.featureDivider]}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={feature.image}
              style={styles.featureImage}
            />
            <Text style={styles.featureLabel}>{feature.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function projectOutputSource(
  assetId: string | null,
  accessToken: string | null,
): ImageSourcePropType | undefined {
  if (!assetId) return undefined;
  const uri = `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content`;
  return accessToken ? { uri, headers: { authorization: `Bearer ${accessToken}` } } : { uri };
}

function queryErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : translateCopy('Projelerin şu anda yüklenemedi.');
}

export default function ProjectsScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const availableCredits = useAvailableCredits();
  const accessToken = useAuthStore((store) => store.accessToken);
  const projectsQuery = useUserProjects();
  const [selected, setSelected] = useState('Tümü');
  const [visibleError, setVisibleError] = useState<string | null>(null);
  const projects = projectsQuery.data;
  const cards = useMemo(
    () =>
      (projects ?? []).map((project) => {
        const display = MODE_DISPLAY[project.mode];
        return {
          ...project,
          ...display,
          title: project.title?.trim() || translateCopy(display.fallbackTitle),
          date: formatProjectDate(project.updatedAt),
          source: projectOutputSource(project.outputAssetId, accessToken),
        };
      }),
    [accessToken, projects, languageRevision],
  );
  const visible = cards.filter(
    (project) =>
      selected === 'Tümü' ||
      (selected === 'Favoriler' ? project.isFavorite : project.category === selected),
  );

  useEffect(() => {
    if (!projectsQuery.error) return;
    const timeout = setTimeout(() => setVisibleError(queryErrorMessage(projectsQuery.error)), 0);
    return () => clearTimeout(timeout);
  }, [projectsQuery.error]);

  useEffect(() => {
    if (!visibleError) return;
    const timeout = setTimeout(() => setVisibleError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [visibleError]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerArea}>
        <AppHeader
          title={translateCopy('Projelerim')}
          subtitle={translateCopy('Üretimlerin ve versiyonların')}
          right={<CreditBadge credits={availableCredits} />}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="tablist"
        >
          {projectCategories.map((category) => (
            <CategoryChip
              key={category}
              label={translateCopy(category)}
              selected={selected === category}
              onPress={() => setSelected(category)}
            />
          ))}
        </ScrollView>
        {visibleError ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorTitle}>{translateCopy('Projeler yüklenemedi')}</Text>
            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}
        {projectsQuery.isLoading ? (
          <View accessibilityRole="progressbar" style={styles.loading}>
            <ActivityIndicator color={colors.accentYellow} />
            <Text style={styles.loadingText}>{translateCopy('Projelerin yükleniyor…')}</Text>
          </View>
        ) : projectsQuery.isError && !(projects?.length ?? 0) ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={translateCopy('Projelerine ulaşılamadı')}
            detail={translateCopy('Bağlantını kontrol edip tekrar deneyebilirsin.')}
            action={translateCopy('Tekrar dene')}
            onAction={() => void projectsQuery.refetch()}
          />
        ) : visible.length ? (
          <>
            <SectionHeader
              title={selected === 'Tümü' ? translateCopy('Son projeler') : translateCopy(selected)}
              accessory={
                <Text style={styles.count}>
                  {visible.length} {translateCopy('proje')}
                </Text>
              }
            />
            <View style={styles.grid}>
              {visible.map((project) => (
                <View key={project.id} style={styles.projectWrap}>
                  <VisualTile
                    title={project.title}
                    subtitle={project.date}
                    palette={project.palette}
                    icon={project.icon}
                    imageSource={project.source}
                    badge={project.isFavorite ? '★' : undefined}
                    onPress={() => router.push(`/projects/${project.id}` as never)}
                  />
                  <Text style={styles.projectMeta}>
                    {project.outputAssetId
                      ? translateCopy(project.category)
                      : project.latestGenerationStatus
                        ? translateCopy('Üretim hazırlanıyor')
                        : translateCopy(project.category)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : !(projects?.length ?? 0) ? (
          <FirstProjectEmptyState
            onCreate={() => router.push('/create' as never)}
            onExplore={() => router.push('/(tabs)/explore' as never)}
          />
        ) : (
          <EmptyState
            title={translateCopy('Bu alanda henüz proje yok')}
            detail={translateCopy('Bir sahne ya da filtre seçerek ilk projenizi oluşturun.')}
            action={translateCopy('Oluşturmaya başla')}
            onAction={() => router.push('/create' as never)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerArea: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  chips: { gap: 8, paddingBottom: 3, paddingRight: spacing.lg },
  count: { ...typography.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  projectWrap: { gap: 5 },
  projectMeta: { ...typography.caption, color: colors.textMuted, paddingLeft: 2 },
  loading: { alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 260 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  errorNotice: {
    backgroundColor: 'rgba(255, 159, 10, 0.10)',
    borderColor: 'rgba(255, 159, 10, 0.48)',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: 12,
  },
  errorTitle: { ...typography.label, color: colors.warning },
  errorText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginTop: 3 },
  firstProject: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  firstProjectHero: { width: 210, height: 190, marginBottom: 2 },
  firstProjectTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  firstProjectDetail: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
    marginTop: 10,
    maxWidth: 330,
    textAlign: 'center',
  },
  primaryButton: { alignSelf: 'stretch', borderRadius: 28, marginTop: 28, overflow: 'hidden' },
  primaryButtonGradient: {
    alignItems: 'center',
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#090909', fontSize: 18, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.accentYellow,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: { color: colors.accentYellow, fontSize: 16, fontWeight: '700' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  featureStrip: {
    alignSelf: 'stretch',
    backgroundColor: '#151515',
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 30,
    minHeight: 132,
    overflow: 'hidden',
    paddingVertical: 14,
  },
  feature: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  featureDivider: { borderLeftColor: colors.border, borderLeftWidth: StyleSheet.hairlineWidth },
  featureImage: { height: 48, marginBottom: 8, width: 48 },
  featureLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
