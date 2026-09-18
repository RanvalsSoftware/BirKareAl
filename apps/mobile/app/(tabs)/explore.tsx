import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  CategoryChip,
  CreditBadge,
  EmptyState,
  SearchBar,
  SectionHeader,
  VisualTile,
} from '@/components';
import {
  aiTools,
  allCatalogItems,
  filterCategories,
  fictionalPeople,
  filters,
  scenes,
  type CatalogItem,
} from '@/constants/catalog';
import { colors, spacing, typography } from '@/theme';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { resetCreateFlow, updateCreateFlow } from '@/features/create/createFlow';
import { getToolPreset } from '@/features/create/tool-presets';
import { BeautyRail } from '@/features/beauty/BeautyRail';
import { beautyOptions } from '@/features/beauty/catalog';
import { beautySceneImage } from '@/features/trends/catalog';

const categories = ['Tümü', 'Sahneler', 'Güzellik', 'Filtreler', 'Kurgusal', 'AI Araçları'];

export default function ExploreScreen() {
  const router = useRouter();
  const availableCredits = useAvailableCredits();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const items = useMemo(() => {
    const byCategory =
      selectedCategory === 'Tümü'
        ? allCatalogItems
        : selectedCategory === 'Sahneler'
          ? scenes
          : selectedCategory === 'Filtreler'
            ? filters
            : selectedCategory === 'Kurgusal'
              ? fictionalPeople
              : selectedCategory === 'Güzellik'
                ? []
                : aiTools;
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    return normalized
      ? byCategory.filter((item) =>
          `${item.name} ${item.subtitle} ${item.category}`
            .toLocaleLowerCase('tr-TR')
            .includes(normalized),
        )
      : byCategory;
  }, [query, selectedCategory]);
  const showBeautyScene =
    ['Sahneler', 'Tümü'].includes(selectedCategory) &&
    (!query.trim() ||
      'güzellik rötuş cilt makyaj'.includes(query.trim().toLocaleLowerCase('tr-TR')));

  function open(item: CatalogItem) {
    if (item.slug === 'gender-change') {
      resetCreateFlow();
      router.push('/gender-change' as never);
      return;
    }
    if (item.kind === 'filter') router.push(`/filters/${item.slug}` as never);
    else if (item.kind === 'person') {
      resetCreateFlow();
      router.push({ pathname: '/create/person', params: { selected: item.id } } as never);
    } else if (item.kind === 'scene') {
      resetCreateFlow();
      updateCreateFlow({ mode: 'scene', sceneId: item.id, personId: null });
      router.push('/create/upload' as never);
    } else {
      const preset = getToolPreset(item.slug);
      if (!preset) return;
      resetCreateFlow();
      updateCreateFlow(preset);
      router.push('/create/upload' as never);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.headerArea}>
        <AppHeader
          title="Keşfet"
          subtitle="Sahneler, güzellik ve AI araçları"
          right={<CreditBadge credits={availableCredits} />}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Sahne, güzellik, filtre veya araç ara"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="tablist"
        >
          {categories.map((category) => (
            <CategoryChip
              key={category}
              label={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
            />
          ))}
        </ScrollView>

        {selectedCategory === 'Güzellik' || selectedCategory === 'Tümü' ? (
          <>
            <SectionHeader
              title="Güzellik Stüdyosu"
              action="Aç"
              onActionPress={() => {
                resetCreateFlow();
                router.push('/beauty' as never);
              }}
            />
            <Text style={styles.filterHintText}>
              Rötuş, yüz hatları ve makyaj · Yoğunluğu sen ayarla
            </Text>
            <BeautyRail
              options={beautyOptions.filter(
                (option) =>
                  !query ||
                  `${option.name} ${option.description}`
                    .toLocaleLowerCase('tr-TR')
                    .includes(query.toLocaleLowerCase('tr-TR')),
              )}
              onSelect={(option) => {
                resetCreateFlow();
                router.push({ pathname: '/beauty', params: { selected: option.id } } as never);
              }}
            />
          </>
        ) : null}

        {selectedCategory === 'Filtreler' ? (
          <View style={styles.filterHint}>
            <Text style={styles.filterHintTitle}>Filtre koleksiyonu</Text>
            <Text style={styles.filterHintText}>{filterCategories.slice(1, 5).join(' · ')}</Text>
          </View>
        ) : null}
        {selectedCategory !== 'Güzellik' ? (
          <>
            <SectionHeader
              title={
                query
                  ? 'Arama sonuçları'
                  : selectedCategory === 'Tümü'
                    ? 'Öne çıkanlar'
                    : selectedCategory
              }
              accessory={
                <Text style={styles.resultCount}>
                  {items.length + Number(showBeautyScene)} seçenek
                </Text>
              }
            />
            {items.length || showBeautyScene ? (
              <View style={styles.grid}>
                {showBeautyScene ? (
                  <VisualTile
                    title="Güzellik"
                    subtitle="Rötuş, cilt ve makyaj"
                    imageSource={beautySceneImage}
                    palette={['#3A2830', '#B38A5B']}
                    icon="sparkles-outline"
                    badge="10 görünüm"
                    onPress={() => {
                      resetCreateFlow();
                      router.push('/beauty' as never);
                    }}
                  />
                ) : null}
                {items.map((item) => (
                  <VisualTile
                    key={item.id}
                    title={item.name}
                    subtitle={
                      item.kind === 'person'
                        ? 'Kurgusal karakter'
                        : item.kind === 'filter' || item.slug === 'gender-change'
                          ? 'AI filtre'
                          : item.subtitle
                    }
                    palette={item.palette}
                    icon={item.icon}
                    imageSource={item.previewSource}
                    badge={
                      item.isPro
                        ? 'PRO'
                        : item.kind === 'filter' || item.slug === 'gender-change'
                          ? 'AI'
                          : item.creditCost
                            ? `+${item.creditCost} kredi`
                            : 'Ücretsiz'
                    }
                    onPress={() => open(item)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="search-outline"
                title="Sonuç bulunamadı"
                detail="Başka bir kelime deneyin veya tüm koleksiyonu keşfedin."
                action="Tümünü göster"
                onAction={() => {
                  setQuery('');
                  setSelectedCategory('Tümü');
                }}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerArea: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  chips: { gap: 8, paddingVertical: spacing.md, paddingRight: spacing.lg },
  filterHint: {
    marginTop: 2,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterHintTitle: { ...typography.label, color: colors.textSecondary },
  filterHintText: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  resultCount: { ...typography.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
});
