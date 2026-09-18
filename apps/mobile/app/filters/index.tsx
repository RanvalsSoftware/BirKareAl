import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  CategoryChip,
  CreditBadge,
  EmptyState,
  SearchBar,
  Screen,
  VisualTile,
} from '@/components';
import { filterCategories, filters } from '@/constants/catalog';
import { colors, spacing, typography } from '@/theme';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { resetCreateFlow } from '@/features/create/createFlow';
import { BeautyRail } from '@/features/beauty/BeautyRail';
import { beautyOptions, genderPreview } from '@/features/beauty/catalog';

export default function FiltersScreen() {
  const router = useRouter();
  const availableCredits = useAvailableCredits();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tümü');
  const items = useMemo(
    () =>
      filters.filter((item) => {
        const queryMatch =
          !query ||
          `${item.name} ${item.subtitle}`
            .toLocaleLowerCase('tr-TR')
            .includes(query.toLocaleLowerCase('tr-TR'));
        const categoryMatch =
          category === 'Tümü' || category === 'Popüler' || item.category === category;
        return queryMatch && categoryMatch;
      }),
    [category, query],
  );
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        back
        title="Filtreler"
        subtitle="Görseline uygun atmosferi bul"
        right={<CreditBadge credits={availableCredits} />}
      />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Filtre ara…" />
      <ScrollView
        horizontal
        style={styles.chipScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole="tablist"
      >
        {[...filterCategories, 'Güzellik', 'Dönüşüm'].map((item) => (
          <CategoryChip
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </ScrollView>
      {category === 'Güzellik' ? (
        <BeautyRail
          options={beautyOptions.filter(
            (option) =>
              !query ||
              option.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')),
          )}
          onSelect={(option) => {
            resetCreateFlow();
            router.push({ pathname: '/beauty', params: { selected: option.id } } as never);
          }}
        />
      ) : null}
      {category === 'Tümü' || category === 'Dönüşüm' ? (
        <View style={styles.grid}>
          <VisualTile
            title="Cinsiyet değiştirme"
            subtitle="Yaratıcı AI görünüm dönüşümü"
            imageSource={genderPreview}
            icon="✧"
            palette={['#18151D', '#BBA476']}
            badge="AI"
            onPress={() => {
              resetCreateFlow();
              router.push('/gender-change' as never);
            }}
          />
        </View>
      ) : null}
      {category !== 'Güzellik' && category !== 'Dönüşüm' ? (
        <>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{category === 'Tümü' ? 'Tüm filtreler' : category}</Text>
            <Text style={styles.count}>{items.length} filtre</Text>
          </View>
          {items.length ? (
            <View style={styles.grid}>
              {items.map((item) => (
                <VisualTile
                  key={item.id}
                  title={item.name}
                  subtitle="AI filtre"
                  palette={item.palette}
                  icon={item.icon}
                  imageSource={item.previewSource}
                  badge={item.isPro ? 'PRO' : 'AI'}
                  onPress={() => router.push(`/filters/${item.slug}` as never)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="search-outline"
              title="Filtre bulunamadı"
              detail="Farklı bir arama veya kategori seçmeyi dene."
              action="Tüm filtreleri gör"
              onAction={() => {
                setQuery('');
                setCategory('Tümü');
              }}
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 8, paddingVertical: spacing.md, paddingRight: spacing.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.textPrimary },
  count: { ...typography.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
});
