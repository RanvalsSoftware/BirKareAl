import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton, OnboardingHeader, StepProgress } from '@/features/onboarding/components';
import {
  filterGroups,
  filters,
  resolveOnboardingPhoto,
  type FilterGroup,
} from '@/features/onboarding/data';
import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, shadows, spacing } from '@/theme';

/** See the matching category helper: avoid iOS hot-reload cropping on absolute Images. */
function FittedArtwork({ source }: { source: ImageSourcePropType }) {
  return (
    <View pointerEvents="none" style={styles.fittedArtworkCanvas}>
      <Image fadeDuration={0} source={source} style={styles.fittedArtwork} />
    </View>
  );
}

export default function FiltersOnboardingScreen() {
  const { selectedFilterId, setSelectedFilterId, selectedPhoto } = useOnboarding();
  const [group, setGroup] = useState<FilterGroup>('all');
  const visibleFilters = useMemo(
    () => (group === 'all' ? filters : filters.filter((item) => item.group === group)),
    [group],
  );
  const selected = filters.find((item) => item.id === selectedFilterId) ?? filters[0];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(onboarding)/categories');
          }}
          onSkip={() => router.replace('/(auth)/login')}
          step="3 / 4"
          title="AI ile oluştur"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(440)}>
            <Text accessibilityRole="header" style={styles.title}>
              Tarzını seç,{`\n`}AI görselleştirsin.
            </Text>
            <Text style={styles.subtitle}>
              Sahnene uygun bir görünüm belirle. Bu ekran temsilî bir önizlemedir; gerçek üretim
              için ayarların kaydedilir.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(520)} style={styles.preview}>
            <FittedArtwork source={selected.source} />
            <LinearGradient
              colors={['rgba(5,5,5,0.06)', 'rgba(5,5,5,0.16)', 'rgba(5,5,5,0.93)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.previewTop}>
              <View style={styles.aiBadge}>
                <Ionicons color={colors.background} name="sparkles" size={14} />
                <Text style={styles.aiBadgeText}>AI önizlemesi</Text>
              </View>
              <View style={styles.originalThumb}>
                <FittedArtwork source={resolveOnboardingPhoto(selectedPhoto)} />
                <View style={styles.originalCaption}>
                  <Text style={styles.originalCaptionText}>Orijinal</Text>
                </View>
              </View>
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>{selected.title}</Text>
              <Text style={styles.previewSubtitle}>
                4:5 mobil önizleme · seçim değiştirilebilir
              </Text>
            </View>
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.groupRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
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
                  style={[styles.groupPill, active && styles.groupPillActive]}
                >
                  <Text style={[styles.groupLabel, active && styles.groupLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.filterRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {visibleFilters.map((item, index) => {
              const active = item.id === selectedFilterId;
              return (
                <Animated.View
                  entering={FadeInDown.delay(65 + index * 42).duration(360)}
                  key={item.id}
                >
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => {
                      setSelectedFilterId(item.id);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [styles.filterWrap, pressed && styles.pressed]}
                  >
                    <View style={[styles.filterImage, active && styles.filterImageActive]}>
                      <FittedArtwork source={item.source} />
                      {active ? (
                        <View style={styles.filterCheck}>
                          <Ionicons color={colors.background} name="checkmark" size={14} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.filterTitle, active && styles.filterTitleActive]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.filterMeta}>AI filtre</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
          <View style={styles.notice}>
            <Ionicons color={colors.accentYellow} name="information-circle-outline" size={19} />
            <Text style={styles.noticeText}>
              Seçilen tarz, oluşturma ekranındaki filtre ayarına aktarılır. Sonuçlar AI ile üretildi
              olarak etiketlenir.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <StepProgress active={2} />
          <GoldButton label="Sonucu gör" onPress={() => router.push('/(onboarding)/fan-moment')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  content: { paddingBottom: 22, paddingTop: 18 },
  title: {
    color: colors.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -1.15,
    lineHeight: 35,
  },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  preview: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    height: 280,
    marginTop: 21,
    overflow: 'hidden',
    ...shadows.floating,
  },
  fittedArtworkCanvas: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fittedArtwork: { height: '100%', resizeMode: 'contain', width: '100%' },
  previewTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 13,
    position: 'absolute',
    right: 13,
    top: 13,
  },
  aiBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  aiBadgeText: { color: colors.background, fontSize: 10, fontWeight: '900' },
  originalThumb: {
    borderColor: 'rgba(255,255,255,0.60)',
    borderRadius: 12,
    borderWidth: 1,
    height: 75,
    overflow: 'hidden',
    width: 57,
  },
  originalCaption: {
    backgroundColor: 'rgba(5,5,5,0.76)',
    bottom: 0,
    left: 0,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
  },
  originalCaptionText: {
    color: colors.textPrimary,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  previewCopy: { bottom: 0, left: 0, padding: 17, position: 'absolute', right: 0 },
  previewTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  previewSubtitle: { color: '#D2D2D5', fontSize: 11, marginTop: 5 },
  groupRow: { gap: 8, paddingRight: 20, paddingTop: 17 },
  groupPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  groupPillActive: {
    backgroundColor: colors.accentYellowSoft,
    borderColor: 'rgba(255,196,0,0.55)',
  },
  groupLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  groupLabelActive: { color: colors.accentYellow },
  filterRow: { gap: 10, paddingRight: 20, paddingTop: 16 },
  filterWrap: { width: 104 },
  filterImage: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 126,
    overflow: 'hidden',
    width: 104,
  },
  filterImageActive: { borderColor: colors.accentYellow, borderWidth: 2 },
  filterCheck: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 27,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 27,
  },
  filterTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 8 },
  filterTitleActive: { color: colors.accentYellow },
  filterMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 3 },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#15130D',
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 20,
    padding: 13,
  },
  noticeText: { color: '#C9BFA7', flex: 1, fontSize: 11, lineHeight: 16 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 8 },
  pressed: { opacity: 0.78 },
});
