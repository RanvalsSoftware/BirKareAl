import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
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
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useAuthStore } from '@/features/auth/auth-store';
import { useUserProjects, type UserProject } from '@/features/projects/use-user-projects';

type ProjectCategory = 'Sahneler' | 'Filtreler';

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
};

function formatProjectDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Yakın zamanda';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfProjectDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfToday.getTime() - startOfProjectDay.getTime()) / 86_400_000);
  if (daysAgo === 0) return 'Bugün';
  if (daysAgo === 1) return 'Dün';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(date);
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
  return error instanceof Error ? error.message : 'Projelerin şu anda yüklenemedi.';
}

export default function ProjectsScreen() {
  const router = useRouter();
  const availableCredits = useAvailableCredits();
  const accessToken = useAuthStore((store) => store.accessToken);
  const projectsQuery = useUserProjects();
  const [selected, setSelected] = useState('Tümü');
  const [visibleError, setVisibleError] = useState<string | null>(null);
  const projects = projectsQuery.data ?? [];
  const cards = useMemo(
    () =>
      projects.map((project) => {
        const display = MODE_DISPLAY[project.mode];
        return {
          ...project,
          ...display,
          title: project.title?.trim() || display.fallbackTitle,
          date: formatProjectDate(project.updatedAt),
          source: projectOutputSource(project.outputAssetId, accessToken),
        };
      }),
    [accessToken, projects],
  );
  const visible = cards.filter(
    (project) =>
      selected === 'Tümü' ||
      (selected === 'Favoriler' ? project.isFavorite : project.category === selected),
  );

  useEffect(() => {
    if (projectsQuery.error) setVisibleError(queryErrorMessage(projectsQuery.error));
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
          title="Projelerim"
          subtitle="Üretimlerin ve versiyonların"
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
              label={category}
              selected={selected === category}
              onPress={() => setSelected(category)}
            />
          ))}
        </ScrollView>
        {visibleError ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorTitle}>Projeler yüklenemedi</Text>
            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}
        {projectsQuery.isLoading ? (
          <View accessibilityRole="progressbar" style={styles.loading}>
            <ActivityIndicator color={colors.accentYellow} />
            <Text style={styles.loadingText}>Projelerin yükleniyor…</Text>
          </View>
        ) : projectsQuery.isError && !projects.length ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Projelerine ulaşılamadı"
            detail="Bağlantını kontrol edip tekrar deneyebilirsin."
            action="Tekrar dene"
            onAction={() => void projectsQuery.refetch()}
          />
        ) : visible.length ? (
          <>
            <SectionHeader
              title={selected === 'Tümü' ? 'Son projeler' : selected}
              accessory={<Text style={styles.count}>{visible.length} proje</Text>}
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
                    onPress={
                      project.outputGenerationId
                        ? () =>
                            router.push(
                              `/generations/${project.outputGenerationId}/results` as never,
                            )
                        : undefined
                    }
                  />
                  <Text style={styles.projectMeta}>
                    {project.outputAssetId
                      ? project.category
                      : project.latestGenerationStatus
                        ? 'Üretim hazırlanıyor'
                        : project.category}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            title="Bu alanda henüz proje yok"
            detail="Bir sahne ya da filtre seçerek ilk projenizi oluşturun."
            action="Oluşturmaya başla"
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
});
