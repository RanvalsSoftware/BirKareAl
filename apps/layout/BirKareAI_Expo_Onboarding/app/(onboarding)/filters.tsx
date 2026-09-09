import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterCard } from '@/src/components/FilterCard';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StepDots } from '@/src/components/StepDots';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { filterGroups, filters } from '@/src/data/filters';
import { colors } from '@/src/theme/colors';
import { radius, shadow } from '@/src/theme/metrics';
import type { FilterGroup } from '@/src/types/onboarding';
import { resolvePhotoSource } from '@/src/utils/images';

const fallback = require('../../assets/images/onboarding/before-portrait.jpg');

export default function FiltersScreen() {
  const { selectedFilterId, setSelectedFilterId, selectedPhoto } = useOnboarding();
  const [group, setGroup] = useState<FilterGroup>('all');

  const visibleFilters = useMemo(
    () => (group === 'all' ? filters : filters.filter((item) => item.group === group)),
    [group],
  );
  const selected = filters.find((item) => item.id === selectedFilterId) ?? filters[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader onSkip={() => router.replace('/(auth)/login')} step="4 / 5" title="Filtreler" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(460)}>
            <Text accessibilityRole="header" style={styles.title}>Tarzını tek dokunuşla{`\n`}değiştir.</Text>
            <Text style={styles.subtitle}>Aşağıdaki mobil uyumlu örneklerden birini seç. Gerçek uygulamada seçtiğin filtre, yüklediğin fotoğrafla backend üzerinden üretilecek.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(520)} style={styles.preview}>
            {selected ? <Image contentFit="cover" source={selected.image} style={StyleSheet.absoluteFill} transition={190} /> : null}
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.10)', 'rgba(5,5,5,0.90)']} style={StyleSheet.absoluteFill} />
            <View style={styles.previewTop}>
              <View style={styles.aiBadge}><Ionicons color={colors.black} name="sparkles" size={14} /><Text style={styles.aiBadgeText}>AI filtre</Text></View>
              <View style={styles.originalThumb}>
                <Image contentFit="cover" source={resolvePhotoSource(selectedPhoto, fallback)} style={StyleSheet.absoluteFill} />
                <View style={styles.originalLabel}><Text style={styles.originalLabelText}>Orijinal</Text></View>
              </View>
            </View>
            <View style={styles.previewBottom}>
              <Text style={styles.previewTitle}>{selected?.title}</Text>
              <Text style={styles.previewMeta}>Mobil 4:5 önizleme · seçim değiştirilebilir</Text>
            </View>
          </Animated.View>

          <ScrollView contentContainerStyle={styles.groupRow} horizontal showsHorizontalScrollIndicator={false}>
            {filterGroups.map((item) => {
              const active = item.id === group;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  key={item.id}
                  onPress={() => {
                    setGroup(item.id);
                    void Haptics.selectionAsync();
                  }}
                  style={[styles.groupPill, active && styles.groupActive]}
                >
                  <Text style={[styles.groupText, active && styles.groupTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
            {visibleFilters.map((item, index) => (
              <Animated.View entering={FadeInDown.delay(60 + index * 40).duration(380)} key={item.id}>
                <FilterCard
                  item={item}
                  onPress={() => {
                    setSelectedFilterId(item.id);
                    void Haptics.selectionAsync();
                  }}
                  selected={selectedFilterId === item.id}
                />
              </Animated.View>
            ))}
          </ScrollView>

          <View style={styles.tip}>
            <Ionicons color={colors.accent} name="bulb-outline" size={18} />
            <Text style={styles.tipText}>Filtre kartlarının tamamı ZIP içindeki <Text style={styles.tipStrong}>assets/images/filters</Text> klasöründe ayrı dosyalar halinde bulunur.</Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <StepDots active={3} total={5} />
          <PrimaryButton label="Fan sahnesini gör" onPress={() => router.push('/(onboarding)/fan-moment')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 24, paddingTop: 20 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, lineHeight: 36 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  preview: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.xl, borderWidth: 1, height: 310, marginTop: 22, overflow: 'hidden', ...shadow.card },
  previewTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', left: 14, position: 'absolute', right: 14, top: 14 },
  aiBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  aiBadgeText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  originalThumb: { backgroundColor: colors.surface, borderColor: 'rgba(255,255,255,0.40)', borderRadius: 14, borderWidth: 1, height: 76, overflow: 'hidden', position: 'relative', width: 60 },
  originalLabel: { backgroundColor: 'rgba(5,5,5,0.72)', bottom: 0, left: 0, paddingVertical: 4, position: 'absolute', right: 0 },
  originalLabelText: { color: colors.text, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  previewBottom: { bottom: 0, left: 0, padding: 17, position: 'absolute', right: 0 },
  previewTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  previewMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  groupRow: { gap: 8, paddingRight: 20, paddingTop: 18 },
  groupPill: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  groupActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  groupText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  groupTextActive: { color: colors.black },
  filterRow: { gap: 11, paddingRight: 20, paddingTop: 16 },
  tip: { alignItems: 'flex-start', backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 22, padding: 14 },
  tipText: { color: '#D8CFB7', flex: 1, fontSize: 11, lineHeight: 17 },
  tipStrong: { color: colors.text, fontWeight: '900' },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 8 },
});
