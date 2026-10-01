import { useLanguageRevision } from '@/i18n/use-language';
import { getLocale as getAppLocale } from '@/i18n/engine';
import { tr as translateCopy } from '@/i18n/engine';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
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
import { beautySceneImage, trends } from '@/features/trends/catalog';

const categories = [
  'Tümü',
  'Akımlar',
  'Sahneler',
  'Güzellik',
  'Filtreler',
  'Kurgusal',
  'AI Araçları',
];

export default function ExploreScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const availableCredits = useAvailableCredits();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const matchingTrends = trends.filter((trend) =>
    `${trend.name} ${trend.description}`
      .toLocaleLowerCase(getAppLocale())
      .includes(query.trim().toLocaleLowerCase(getAppLocale())),
  );
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
    const normalized = query.trim().toLocaleLowerCase(getAppLocale());
    return normalized
      ? byCategory.filter((item) =>
          `${item.name} ${item.subtitle} ${item.category}`
            .toLocaleLowerCase(getAppLocale())
            .includes(normalized),
        )
      : byCategory;
  }, [query, selectedCategory, languageRevision]);
  const showBeautyScene =
    ['Sahneler', 'Tümü'].includes(selectedCategory) &&
    (!query.trim() ||
      translateCopy('güzellik rötuş cilt makyaj').toLocaleLowerCase(getAppLocale()).includes(query.trim().toLocaleLowerCase(getAppLocale())));

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
          title={translateCopy('Keşfet')}
          subtitle={translateCopy('Sahneler, güzellik ve AI araçları')}
          right={<CreditBadge credits={availableCredits} />}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={translateCopy('Sahne, güzellik, filtre veya araç ara')}
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
              label={translateCopy(category)}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
            />
          ))}
        </ScrollView>

        {selectedCategory === 'Güzellik' || selectedCategory === 'Tümü' ? (
          <>
            <SectionHeader
              title={translateCopy('Güzellik Stüdyosu')}
              action={translateCopy('Aç')}
              onActionPress={() => {
                resetCreateFlow();
                router.push('/beauty' as never);
              }}
            />
            <Text style={styles.filterHintText}>
              {translateCopy('Rötuş, yüz hatları ve makyaj · Yoğunluğu sen ayarla')}
            </Text>
            <BeautyRail
              options={beautyOptions
                .filter(
                  (option) =>
                    !query ||
                    `${option.name} ${option.description}`
                      .toLocaleLowerCase(getAppLocale())
                      .includes(query.toLocaleLowerCase(getAppLocale())),
                )
                .slice(0, selectedCategory === 'Tümü' ? 3 : undefined)}
              onSelect={(option) => {
                resetCreateFlow();
                router.push({ pathname: '/beauty', params: { selected: option.id } } as never);
              }}
            />
          </>
        ) : null}

        {selectedCategory === 'Filtreler' ? (
          <View style={styles.filterHint}>
            <Text style={styles.filterHintTitle}>{translateCopy('Filtre koleksiyonu')}</Text>
            <Text style={styles.filterHintText}>
              {filterCategories
                .slice(1, 5)
                .map((category) => translateCopy(category))
                .join(' · ')}
            </Text>
          </View>
        ) : null}
        {selectedCategory === 'Akımlar' ? (
          <>
            <SectionHeader
              title={translateCopy('Akımlar')}
              accessory={
                <Text style={styles.resultCount}>
                  {translateCopy('{{p0}} seçenek', { p0: matchingTrends.length })}
                </Text>
              }
            />
            {matchingTrends.length ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.grid}>
                {matchingTrends.map((trend) => (
                  <VisualTile
                    key={trend.id}
                    title={trend.name}
                    subtitle={trend.description}
                    imageSource={trend.source}
                    palette={['#35233D', '#B38A5B']}
                    icon="sparkles-outline"
                    onPress={() => {
                      resetCreateFlow();
                      router.push(`/trends/${trend.id}` as never);
                    }}
                  />
                ))}
              </Animated.View>
            ) : (
              <EmptyState
                icon="search-outline"
                title={translateCopy('Sonuç bulunamadı')}
                detail={translateCopy('Başka bir kelime deneyin veya tüm koleksiyonu keşfedin.')}
                action={translateCopy('Tümünü göster')}
                onAction={() => setQuery('')}
              />
            )}
          </>
        ) : null}
        {selectedCategory !== 'Güzellik' && selectedCategory !== 'Akımlar' ? (
          <>
            <SectionHeader
              title={
                query
                  ? translateCopy('Arama sonuçları')
                  : selectedCategory === 'Tümü'
                    ? translateCopy('Öne çıkanlar')
                    : translateCopy(selectedCategory)
              }
              accessory={
                <Text style={styles.resultCount}>
                  {translateCopy('{{p0}} seçenek', { p0: items.length + Number(showBeautyScene) })}
                </Text>
              }
            />
            {items.length || showBeautyScene ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                layout={Layout.springify()}
                style={styles.grid}
              >
                {showBeautyScene ? (
                  <VisualTile
                    title={translateCopy('Güzellik')}
                    subtitle={translateCopy('Rötuş, cilt ve makyaj')}
                    imageSource={beautySceneImage}
                    palette={['#3A2830', '#B38A5B']}
                    icon="sparkles-outline"
                    badge={translateCopy('10 görünüm')}
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
                        ? translateCopy('Kurgusal karakter')
                        : item.kind === 'filter' || item.slug === 'gender-change'
                          ? translateCopy('AI filtre')
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
                            ? translateCopy('+{{p0}} kredi', { p0: item.creditCost })
                            : translateCopy('Ücretsiz')
                    }
                    onPress={() => open(item)}
                  />
                ))}
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(360).springify()}>
                <EmptyState
                  icon="search-outline"
                  title={translateCopy('Sonuç bulunamadı')}
                  detail={translateCopy('Başka bir kelime deneyin veya tüm koleksiyonu keşfedin.')}
                  action={translateCopy('Tümünü göster')}
                  onAction={() => {
                    setQuery('');
                    setSelectedCategory('Tümü');
                  }}
                />
              </Animated.View>
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
