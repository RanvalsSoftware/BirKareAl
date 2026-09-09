import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppleGlassButton, Icon, Notice, Screen } from '@/components';
import { filters } from '@/constants/catalog';
import { standardCreationSelection, useCreateFlow } from '@/features/create/createFlow';
import { FilterPreview } from '@/features/filters/FilterPreview';
import { FILTER_INTENSITIES, nearestIntensityValue } from '@/features/filters/intensity';
import { colors, radii, spacing, typography } from '@/theme';

export default function FilterDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { flow, set } = useCreateFlow();
  const filter = useMemo(() => filters.find((item) => item.slug === slug) ?? filters[0], [slug]);
  const [intensity, setIntensity] = useState(() => nearestIntensityValue(flow.filterIntensity));
  const [showAfter, setShowAfter] = useState(true);
  const apply = () => {
    set(standardCreationSelection({
      mode: 'filter',
      beauty: null,
      transformation: null,
      styleId: filter.id,
      filterIntensity: intensity,
      sceneId: null,
      personId: null,
      toolId: null,
      customInstruction: '',
    }));
    router.push(flow.sourceUri ? ('/create/settings' as never) : ('/create/upload' as never));
  };
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/filters');
          }}
          style={styles.back}
        >
          <Icon name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{filter.name}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FilterPreview
        sourceUri={flow.sourceUri}
        filterId={filter.id}
        intensity={intensity}
        showOriginal={!showAfter}
        style={styles.preview}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Önce ve sonra görünümünü değiştir"
        onPress={() => setShowAfter((value) => !value)}
        style={styles.holdButton}
      >
        <Icon name="hand-left-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.holdText}>
          {showAfter ? 'Orijinali görmek için dokun' : 'Filtreyi görmek için dokun'}
        </Text>
      </Pressable>
      <Text style={styles.filterTitle}>{filter.name}</Text>
      <Text style={styles.filterText}>
        {filter.subtitle}. Yoğunluğu değiştirdiğinde ton ve ışık önizlemesi anında güncellenir.
        Gerçek AI dokusu ve detayları üretim onayından sonra oluşturulur.
      </Text>
      <Text style={styles.label}>Yoğunluk</Text>
      <View style={styles.intensities} accessibilityRole="radiogroup">
        {FILTER_INTENSITIES.map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: intensity === item.value }}
            accessibilityLabel={`${item.label} yoğunluk, yüzde ${item.value}`}
            onPress={() => {
              setIntensity(item.value);
              setShowAfter(true);
            }}
            style={[styles.intensity, intensity === item.value && styles.intensitySelected]}
          >
            <Text
              style={[
                styles.intensityText,
                intensity === item.value && styles.intensityTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.meta}>
        <View>
          <Text style={styles.metaLabel}>TÜR</Text>
          <Text style={styles.metaValue}>AI filtre</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>KREDİ</Text>
          <Text style={styles.metaValue}>Onayda hesaplanır</Text>
        </View>
      </View>
      <Notice tone="neutral" title="Önizleme ücretsizdir">
        Seçimler fotoğrafını değiştirmez veya kredi harcamaz. AI üretiminde yüz özelliklerini
        koruyan, seçtiğin yoğunluğa özel yönergeler kullanılır.
      </Notice>
      <View style={styles.apply}>
        <AppleGlassButton
          label="Bu filtreyle devam et"
          accessibilityHint={
            flow.sourceUri
              ? 'Seçili filtreyle görsel ayarlarına geçer.'
              : 'Önce kaynak fotoğrafını seçmeye yönlendirir.'
          }
          onPress={apply}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  header: {
    minHeight: 54,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSpacer: { width: 44 },
  preview: {
    marginTop: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.xl,
  },
  holdButton: {
    minHeight: 46,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holdText: { ...typography.caption, color: colors.textSecondary },
  filterTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xl },
  filterText: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: 9,
  },
  intensities: { flexDirection: 'row', gap: 8 },
  intensity: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensitySelected: { borderColor: colors.accentYellow, backgroundColor: colors.accentYellowSoft },
  intensityText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  intensityTextSelected: { color: colors.accentYellow },
  meta: {
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 50,
  },
  metaLabel: { ...typography.overline, color: colors.textMuted, fontSize: 10 },
  metaValue: { ...typography.label, color: colors.textPrimary, marginTop: 3 },
  apply: { marginTop: spacing.xl },
});
