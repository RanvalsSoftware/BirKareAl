import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native';

import { apiBaseUrl } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useUserProjects, type UserProject } from '@/features/projects/use-user-projects';
import { useCopy } from '@/features/settings/language-store';
import { getLocale, tr as translateCopy } from '@/i18n/engine';
import { formatPrice } from '@/features/projects/product-api';
import { resetProductStudioFlow } from '@/features/studio/productFlow';
import { brand } from '@/theme/brand';
import {
  BrandNav,
  CreditBadge,
  Group,
  Page,
  PrimaryAction,
  Row,
  SecondaryAction,
  SectionLabel,
  TabHeader,
  useLayout,
  type IconName,
} from '@/ui/kit';

type CatalogView = 'products' | 'all';
type CatalogFilter = 'all' | 'ready' | 'favorites' | 'unpriced';

const catalogFilters: readonly { id: CatalogFilter; tr: string; en: string }[] = [
  { id: 'all', tr: 'Tümü', en: 'All' },
  { id: 'ready', tr: 'Hazır', en: 'Ready' },
  { id: 'favorites', tr: 'Favoriler', en: 'Favorites' },
  { id: 'unpriced', tr: 'Fiyatsız', en: 'No price' },
];

const modeLabels: Record<UserProject['mode'], { tr: string; en: string; icon: IconName }> = {
  PRODUCT_STUDIO: { tr: 'Ürün çekimi', en: 'Product shoot', icon: 'cube-outline' },
  FULL_SCENE: { tr: 'Sahne', en: 'Scene', icon: 'image-outline' },
  FAN_MOMENT: { tr: 'Kurgusal sahne', en: 'Fictional scene', icon: 'images-outline' },
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
  const { width, wide, gutter } = useLayout();
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
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const filtered = useMemo(
    () =>
      visible.filter((project) =>
        filter === 'ready'
          ? Boolean(project.outputAssetId)
          : filter === 'favorites'
            ? project.isFavorite
            : filter === 'unpriced'
              ? typeof project.priceAmount !== 'number'
              : true,
      ),
    [filter, visible],
  );
  const pageWidth = Math.min(Math.max(width - gutter * 2, 280), 1120);
  const columns = pageWidth >= 960 ? 4 : pageWidth >= 620 ? 3 : 2;
  const gap = 12;
  const cardWidth = Math.floor((pageWidth - gap * (columns - 1)) / columns);
  const startProject = () => {
    resetProductStudioFlow();
    router.push('/studio/product' as never);
  };

  return (
    <Page width="workspace">
      <BrandNav
        trailing={
          <CreditBadge
            accessibilityLabel={translateCopy('{{p0}} kredi', { p0: availableCredits })}
            amount={availableCredits}
            onPress={() => router.push('/(tabs)/credits' as never)}
          />
        }
      />
      <TabHeader
        subtitle={copy(
          'Ürünlerin, çekimlerin ve tüm alternatiflerin.',
          'Your products, shoots and every alternative.',
        )}
        title={copy('Katalog', 'Catalog')}
      />

      {hasArchivedProjects ? (
        <View accessibilityRole="tablist" style={styles.segment}>
          <SegmentButton
            label={copy('Ürün kataloğu', 'Product catalog')}
            onPress={() => setView('products')}
            selected={catalogView === 'products'}
          />
          <SegmentButton
            label={copy('Tüm projeler', 'All projects')}
            onPress={() => setView('all')}
            selected={catalogView === 'all'}
          />
        </View>
      ) : null}

      <Group>
        <Row
          detail={copy(
            'Hazır ürünlerinden fiyatlı, paylaşılabilir katalog',
            'A priced, shareable catalog of your finished products',
          )}
          icon="document-text-outline"
          onPress={() => router.push('/catalog-pdf' as never)}
          title={copy('PDF katalog oluştur', 'Create a PDF catalog')}
        />
      </Group>

      {visible.length ? (
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={[styles.filters, { paddingHorizontal: gutter }]}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
        >
          {catalogFilters.map((item) => {
            const selected = filter === item.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={({ pressed }) => [
                  styles.filter,
                  selected && styles.filterSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {copy(item.tr, item.en)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <SectionLabel trailing={`${filtered.length} ${copy('proje', 'projects')}`}>
        {catalogView === 'products'
          ? copy('Ürün projeleri', 'Product projects')
          : copy('Tüm projeler', 'All projects')}
      </SectionLabel>

      {projectsQuery.isLoading ? (
        <Group padding={24} style={styles.state}>
          <ActivityIndicator color={brand.gold} />
          <Text style={styles.stateBody}>{copy('Katalog yükleniyor…', 'Loading catalog…')}</Text>
        </Group>
      ) : projectsQuery.isError ? (
        <>
          <Group padding={24} style={styles.state}>
            <Ionicons color={brand.gold} name="cloud-offline-outline" size={32} />
            <Text style={styles.stateTitle}>
              {copy('Kataloğa ulaşılamadı', 'Catalog unavailable')}
            </Text>
            <Text style={styles.stateBody}>
              {copy(
                'Bağlantını kontrol edip tekrar deneyebilirsin.',
                'Check your connection and try again.',
              )}
            </Text>
          </Group>
          <SecondaryAction
            icon="refresh"
            label={copy('Tekrar dene', 'Try again')}
            onPress={() => void projectsQuery.refetch()}
          />
        </>
      ) : visible.length ? (
        <>
          <View style={[styles.grid, { gap }]}>
            {filtered.map((project) => {
              const source = outputUri(project.outputAssetId);
              const label = modeLabels[project.mode];
              return (
                <Pressable
                  accessibilityLabel={project.title || copy(label.tr, label.en)}
                  accessibilityRole="button"
                  key={project.id}
                  onPress={() => router.push(`/projects/${project.id}` as never)}
                  style={({ pressed }) => [{ width: cardWidth }, pressed && styles.pressed]}
                >
                  <View style={[styles.cardVisual, { height: Math.round(cardWidth * 1.25) }]}>
                    {source ? (
                      <Image
                        resizeMode="cover"
                        source={{
                          uri: source,
                          headers: accessToken
                            ? { authorization: `Bearer ${accessToken}` }
                            : undefined,
                        }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : (
                      <>
                        <Ionicons color={brand.textMuted} name={label.icon} size={28} />
                        <Text style={styles.cardPending}>
                          {project.latestGenerationStatus
                            ? copy('Çıktı hazırlanıyor', 'Preparing output')
                            : copy('Henüz çıktı yok', 'No output yet')}
                        </Text>
                      </>
                    )}
                    {project.isFavorite ? (
                      <View style={styles.favorite}>
                        <Ionicons color={brand.gold} name="star" size={13} />
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {project.title?.trim() || copy(label.tr, label.en)}
                  </Text>
                  <Text numberOfLines={1} style={styles.cardMeta}>
                    {formatPrice(project.priceAmount, project.priceCurrency, getLocale()) ??
                      formatDate(project.updatedAt)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {filtered.length ? null : (
            <Text style={styles.note}>
              {copy('Bu filtreye uyan ürün yok.', 'No products match this filter.')}
            </Text>
          )}
          <PrimaryAction
            icon="add"
            label={copy('Yeni ürün projesi', 'New product project')}
            onPress={startProject}
          />
        </>
      ) : (
        <>
          <Group padding={wide ? 48 : 28} style={styles.state}>
            <View style={styles.emptyMark}>
              <Ionicons color={brand.gold} name="cube-outline" size={40} />
            </View>
            <Text style={styles.stateTitle}>
              {copy('İlk ürününe yer açtık.', 'We saved a spot for your first product.')}
            </Text>
            <Text style={styles.stateBody}>
              {copy(
                'Ürününü adlandır, bir fotoğraf ekle. Ürettiğin alternatifler burada bir arada dursun.',
                'Name your product and add a photo. Every alternative you generate stays together here.',
              )}
            </Text>
          </Group>
          <PrimaryAction
            icon="add"
            label={copy('İlk ürününü ekle', 'Add your first product')}
            onPress={startProject}
          />
          <Group>
            <Text style={styles.note}>
              {copy(
                'Her ürünün kendi projesi vardır. Sahnelerini ve yeni versiyonlarını aynı projede yönetirsin.',
                'Each product has its own project. You manage its scenes and new versions in one place.',
              )}
            </Text>
          </Group>
        </>
      )}
    </Page>
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
  segment: { flexDirection: 'row', gap: 8 },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: brand.surfaceRaised,
    borderColor: brand.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  segmentButtonSelected: { borderColor: brand.gold },
  segmentText: { color: brand.textSecondary, fontSize: 13 },
  segmentTextSelected: { color: brand.gold, fontWeight: '600' },
  state: { alignItems: 'center', gap: 12 },
  stateTitle: { color: brand.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stateBody: { color: brand.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyMark: {
    alignItems: 'center',
    backgroundColor: brand.surfaceRaised,
    borderRadius: 24,
    height: 96,
    justifyContent: 'center',
    marginBottom: 8,
    width: 96,
  },
  note: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  filters: { gap: 8 },
  filter: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 100,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 16,
  },
  filterSelected: { borderColor: brand.gold },
  filterText: { color: brand.text, fontSize: 15 },
  filterTextSelected: { color: brand.gold, fontWeight: '600' },
  cardVisual: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 16,
    gap: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  cardPending: { color: brand.textMuted, fontSize: 12, textAlign: 'center' },
  favorite: {
    alignItems: 'center',
    backgroundColor: brand.background,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
  },
  cardTitle: { color: brand.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
  cardMeta: {
    color: brand.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  pressed: { opacity: 0.65 },
});
