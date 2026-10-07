import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiBaseUrl } from '@/api/client';
import { CreditBadge, Icon } from '@/components';
import { useAuthStore } from '@/features/auth/auth-store';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useUserProjects, type UserProject } from '@/features/projects/use-user-projects';
import { useCopy } from '@/features/settings/language-store';
import { getLocale } from '@/i18n/engine';
import { spacing } from '@/theme';

type CatalogView = 'products' | 'all';

const modeLabels: Record<
  UserProject['mode'],
  { tr: string; en: string; icon: React.ComponentProps<typeof Icon>['name'] }
> = {
  PRODUCT_STUDIO: { tr: 'Ürün çekimi', en: 'Product shoot', icon: 'cube-outline' },
  FULL_SCENE: { tr: 'Sahne', en: 'Scene', icon: 'image-outline' },
  FAN_MOMENT: { tr: 'Kurgusal sahne', en: 'Fictional scene', icon: 'sparkles-outline' },
  AI_FILTER: { tr: 'AI filtre', en: 'AI filter', icon: 'color-filter-outline' },
  PRO_PORTRAIT: { tr: 'Portre', en: 'Portrait', icon: 'person-outline' },
  BACKGROUND_REPLACE: { tr: 'Arka plan', en: 'Background', icon: 'layers-outline' },
  VIRTUAL_TRY_ON: { tr: 'Kıyafet deneme', en: 'Virtual try-on', icon: 'shirt-outline' },
  NAIL_PREVIEW: { tr: 'Tırnak önizleme', en: 'Nail preview', icon: 'color-palette-outline' },
};

function outputUri(assetId: string | null): string | null {
  return assetId ? `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content` : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function ProjectsScreen() {
  const copy = useCopy();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const availableCredits = useAvailableCredits();
  const accessToken = useAuthStore((store) => store.accessToken);
  const projectsQuery = useUserProjects();
  const [view, setView] = useState<CatalogView>('products');
  const projects = projectsQuery.data ?? [];
  const hasArchivedProjects = useMemo(
    () => projects.some((project) => project.mode !== 'PRODUCT_STUDIO'),
    [projects],
  );
  const catalogView: CatalogView = hasArchivedProjects ? view : 'products';
  const visible = useMemo(
    () =>
      catalogView === 'products'
        ? projects.filter((project) => project.mode === 'PRODUCT_STUDIO')
        : projects,
    [catalogView, projects],
  );
  const pageWidth = Math.min(Math.max(width - spacing.lg * 2, 280), 1080);
  const columns = pageWidth >= 960 ? 4 : pageWidth >= 680 ? 3 : 2;
  const gap = 11;
  const cardWidth = Math.max(136, (pageWidth - gap * (columns - 1)) / columns);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{copy('ÜRÜN KÜTÜPHANESİ', 'PRODUCT LIBRARY')}</Text>
              <Text style={styles.title}>{copy('Katalog', 'Catalog')}</Text>
              <Text style={styles.subtitle}>
                {copy(
                  'Ürün çekimlerin, çıktılar ve yeni versiyonlar.',
                  'Your product shoots, outputs, and new versions.',
                )}
              </Text>
            </View>
            <CreditBadge credits={availableCredits} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/studio' as never)}
            style={({ pressed }) => [styles.newProject, pressed && styles.pressed]}
          >
            <View style={styles.newProjectIcon}>
              <Icon name="add" size={23} color="#0A2118" />
            </View>
            <View style={styles.newProjectCopy}>
              <Text style={styles.newProjectTitle}>
                {copy('Yeni ürün projesi', 'New product project')}
              </Text>
              <Text style={styles.newProjectDetail}>
                {copy(
                  'Kaynak fotoğrafla yeni bir çekim planla',
                  'Plan a new shoot from a source photo',
                )}
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#B8F1CD" />
          </Pressable>

          {hasArchivedProjects ? (
            <View style={styles.segment} accessibilityRole="tablist">
              <SegmentButton
                label={copy('Ürün kataloğu', 'Product catalog')}
                selected={catalogView === 'products'}
                onPress={() => setView('products')}
              />
              <SegmentButton
                label={copy('Tüm projeler', 'All projects')}
                selected={catalogView === 'all'}
                onPress={() => setView('all')}
              />
            </View>
          ) : null}

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {catalogView === 'products'
                ? copy('Ürün projeleri', 'Product projects')
                : copy('Tüm projeler', 'All projects')}
            </Text>
            <Text style={styles.listCount}>
              {visible.length} {copy('proje', 'projects')}
            </Text>
          </View>

          {projectsQuery.isLoading ? (
            <View accessibilityRole="progressbar" style={styles.stateBox}>
              <ActivityIndicator color="#B8F1CD" />
              <Text style={styles.stateText}>
                {copy('Katalog yükleniyor…', 'Loading catalog…')}
              </Text>
            </View>
          ) : projectsQuery.isError ? (
            <View style={styles.stateBox}>
              <View style={styles.stateIcon}>
                <Icon name="cloud-offline-outline" size={28} color="#FFB65C" />
              </View>
              <Text style={styles.stateTitle}>
                {copy('Kataloğa ulaşılamadı', 'Catalog unavailable')}
              </Text>
              <Text style={styles.stateText}>
                {copy(
                  'Bağlantını kontrol edip tekrar deneyebilirsin.',
                  'Check your connection and try again.',
                )}
              </Text>
              <Pressable onPress={() => void projectsQuery.refetch()} style={styles.retryButton}>
                <Text style={styles.retryText}>{copy('Tekrar dene', 'Try again')}</Text>
              </Pressable>
            </View>
          ) : visible.length ? (
            <View style={[styles.grid, { gap }]}>
              {visible.map((project) => {
                const source = outputUri(project.outputAssetId);
                const label = modeLabels[project.mode];
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={project.title || copy(label.tr, label.en)}
                    key={project.id}
                    onPress={() => router.push(`/projects/${project.id}` as never)}
                    style={({ pressed }) => [
                      styles.card,
                      { width: cardWidth },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.cardVisual, { height: cardWidth * 1.02 }]}>
                      {source ? (
                        <Image
                          source={{
                            uri: source,
                            headers: accessToken
                              ? { authorization: `Bearer ${accessToken}` }
                              : undefined,
                          }}
                          resizeMode="cover"
                          style={styles.cardImage}
                        />
                      ) : (
                        <View style={styles.cardPlaceholder}>
                          <Icon name={label.icon} size={31} color="#68766E" />
                          <Text style={styles.preparingText}>
                            {project.latestGenerationStatus
                              ? copy('Çıktı hazırlanıyor', 'Preparing output')
                              : copy('Henüz çıktı yok', 'No output yet')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.modeBadge}>
                        <Icon name={label.icon} size={12} color="#D7F7E3" />
                        <Text style={styles.modeBadgeText}>{copy(label.tr, label.en)}</Text>
                      </View>
                      {project.isFavorite ? (
                        <View style={styles.favoriteBadge}>
                          <Icon name="star" size={13} color="#FFE29A" />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardBody}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {project.title?.trim() || copy(label.tr, label.en)}
                      </Text>
                      <Text style={styles.cardDate}>{formatDate(project.updatedAt)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyVisual}>
                <Icon name="cube-outline" size={36} color="#B8F1CD" />
                <View style={styles.emptyMiniCard}>
                  <Icon name="image-outline" size={18} color="#799087" />
                </View>
              </View>
              <Text style={styles.emptyTitle}>
                {catalogView === 'products'
                  ? copy('Ürün kataloğun hazır', 'Your product catalog is ready')
                  : copy('Henüz projen yok', 'No projects yet')}
              </Text>
              <Text style={styles.emptyDetail}>
                {catalogView === 'products'
                  ? copy(
                      'İlk ürününü adlandır, fotoğrafını ekle ve kullanım amacına göre çekimini planla.',
                      'Name your first product, add its photo, and plan the shoot around its intended use.',
                    )
                  : copy(
                      'İlk ürün projenle düzenli bir katalog oluşturmaya başla.',
                      'Start an organized catalog with your first product project.',
                    )}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/studio' as never)}
                style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}
              >
                <Icon name="add" size={20} color="#0A2118" />
                <Text style={styles.emptyActionText}>
                  {copy('İlk ürünü ekle', 'Add first product')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={[styles.segmentText, selected && styles.segmentTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0B0F0D', flex: 1 },
  scrollContent: { paddingBottom: 105, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  page: { alignSelf: 'center', maxWidth: 1080, width: '100%' },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#8FCFA7', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  title: { color: '#F4F8F5', fontSize: 31, fontWeight: '900', letterSpacing: -0.8, marginTop: 5 },
  subtitle: { color: '#87948C', fontSize: 13, lineHeight: 18, marginTop: 4 },
  newProject: {
    alignItems: 'center',
    backgroundColor: '#15221B',
    borderColor: '#355443',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 14,
  },
  newProjectIcon: {
    alignItems: 'center',
    backgroundColor: '#B8F1CD',
    borderRadius: 13,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  newProjectCopy: { flex: 1 },
  newProjectTitle: { color: '#ECF5EF', fontSize: 15, fontWeight: '800' },
  newProjectDetail: { color: '#87948C', fontSize: 11, marginTop: 3 },
  segment: {
    backgroundColor: '#101613',
    borderColor: '#252F29',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: 17,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  segmentButtonSelected: { backgroundColor: '#1B2B22' },
  segmentText: { color: '#78857D', fontSize: 12, fontWeight: '700' },
  segmentTextSelected: { color: '#D9F7E4' },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 25,
  },
  listTitle: { color: '#EEF4F0', fontSize: 19, fontWeight: '800' },
  listCount: { color: '#7B8880', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: '#111815',
    borderColor: '#26322B',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardVisual: { backgroundColor: '#18211D', overflow: 'hidden', width: '100%' },
  cardImage: { height: '100%', width: '100%' },
  cardPlaceholder: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', padding: 12 },
  preparingText: { color: '#728078', fontSize: 10, textAlign: 'center' },
  modeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,17,12,0.84)',
    borderRadius: 9,
    bottom: 7,
    flexDirection: 'row',
    gap: 4,
    left: 7,
    maxWidth: '82%',
    paddingHorizontal: 7,
    paddingVertical: 5,
    position: 'absolute',
  },
  modeBadgeText: { color: '#D7F7E3', fontSize: 9, fontWeight: '800' },
  favoriteBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,17,12,0.84)',
    borderRadius: 11,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 26,
  },
  cardBody: { padding: 11 },
  cardTitle: { color: '#E8F0EB', fontSize: 13, fontWeight: '800' },
  cardDate: { color: '#77837C', fontSize: 10, marginTop: 4 },
  stateBox: {
    alignItems: 'center',
    borderColor: '#28342D',
    borderRadius: 22,
    borderWidth: 1,
    gap: 9,
    justifyContent: 'center',
    minHeight: 270,
    padding: 24,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#21180D',
    borderRadius: 18,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  stateTitle: { color: '#EDF4EF', fontSize: 18, fontWeight: '800', marginTop: 4 },
  stateText: { color: '#839087', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#1C2D25',
    borderRadius: 13,
    marginTop: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryText: { color: '#B8F1CD', fontSize: 12, fontWeight: '800' },
  emptyState: {
    alignItems: 'center',
    borderColor: '#2A3830',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 26,
  },
  emptyVisual: {
    alignItems: 'center',
    backgroundColor: '#16241C',
    borderRadius: 22,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  emptyMiniCard: {
    alignItems: 'center',
    backgroundColor: '#26342D',
    borderColor: '#3D5045',
    borderRadius: 8,
    borderWidth: 1,
    bottom: 9,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    width: 35,
  },
  emptyTitle: {
    color: '#F0F5F2',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  emptyDetail: {
    color: '#839087',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 430,
    textAlign: 'center',
  },
  emptyAction: {
    alignItems: 'center',
    backgroundColor: '#B8F1CD',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 7,
    marginTop: 20,
    minHeight: 49,
    paddingHorizontal: 18,
  },
  emptyActionText: { color: '#0A2118', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.77, transform: [{ scale: 0.99 }] },
});
