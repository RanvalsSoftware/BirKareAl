import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { categories } from '@/features/onboarding/data';
import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, spacing } from '@/theme';

/**
 * iOS can crop a directly absolute Image after a hot reload. Keeping the
 * artwork as a regular 100% × 100% child preserves every supplied 4:5 card.
 */
function FittedArtwork({ source }: { source: ImageSourcePropType }) {
  return (
    <View pointerEvents="none" style={styles.fittedArtworkCanvas}>
      <Image fadeDuration={0} source={source} style={styles.fittedArtwork} />
    </View>
  );
}

export default function CategoriesScreen() {
  const { selectedCategoryId, setSelectedCategoryId } = useOnboarding();
  const selected = categories.find((item) => item.id === selectedCategoryId) ?? categories[0];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(onboarding)/welcome');
          }}
          onSkip={() => router.replace('/(auth)/login')}
          step="2 / 4"
          title="Sahne seç"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text accessibilityRole="header" style={styles.title}>
              Sahneni seç.
            </Text>
            <Text style={styles.subtitle}>
              Hayalindeki karenin havasını belirle. Seçimin daha sonra sana uygun sahne ve üretim
              ayarlarını hazırlar.
            </Text>
          </Animated.View>
          <View style={styles.grid}>
            {categories.map((item, index) => {
              const active = item.id === selectedCategoryId;
              return (
                <Animated.View
                  entering={FadeInDown.delay(100 + index * 65).duration(430)}
                  key={item.id}
                  style={styles.gridItem}
                >
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => {
                      setSelectedCategoryId(item.id);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                      styles.card,
                      active && styles.cardActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <FittedArtwork source={item.source} />
                    <LinearGradient
                      colors={['rgba(5,5,5,0.02)', 'rgba(5,5,5,0.92)']}
                      locations={[0.22, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    {active ? (
                      <View style={styles.check}>
                        <Ionicons color={colors.background} name="checkmark" size={15} />
                      </View>
                    ) : null}
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text numberOfLines={2} style={styles.cardDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons color={colors.accentYellow} name="sparkles-outline" size={20} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryOverline}>SEÇİLİ SAHNE</Text>
              <Text style={styles.summaryTitle}>{selected.shortTitle}</Text>
              <Text style={styles.summaryText}>
                {selected.id === 'fan-selfie'
                  ? 'Fan sahneleri yalnızca kurgusal veya lisanslı karakterler kullanır; sonuç AI etiketi taşır.'
                  : selected.description}
              </Text>
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <StepProgress active={1} />
          <GoldButton label="Tarzını seç" onPress={() => router.push('/(onboarding)/filters')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  content: { paddingBottom: 23, paddingTop: 19 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '900', letterSpacing: -1.15 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 23 },
  gridItem: { width: '48.55%' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 204,
    overflow: 'hidden',
  },
  cardActive: { borderColor: colors.accentYellow, borderWidth: 2 },
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
  badge: {
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
    top: 10,
  },
  badgeText: { color: colors.background, fontSize: 9, fontWeight: '900' },
  check: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 28,
  },
  cardCopy: { bottom: 0, left: 0, padding: 13, position: 'absolute', right: 0 },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  cardDescription: { color: '#C9C9CC', fontSize: 10, lineHeight: 14, marginTop: 4 },
  summary: {
    alignItems: 'flex-start',
    backgroundColor: '#15130D',
    borderColor: 'rgba(255,196,0,0.33)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 18,
    padding: 14,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentYellowSoft,
    borderRadius: 13,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  summaryCopy: { flex: 1 },
  summaryOverline: {
    color: colors.accentYellow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 3 },
  summaryText: { color: '#C9BFA7', fontSize: 11, lineHeight: 16, marginTop: 5 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 8 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
