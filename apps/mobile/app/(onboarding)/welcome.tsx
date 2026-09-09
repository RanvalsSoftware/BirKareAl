import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GoldButton,
  OnboardingHeader,
  PhotoChip,
  StepProgress,
} from '@/features/onboarding/components';
import { onboardingImages, resolveOnboardingPhoto } from '@/features/onboarding/data';
import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, shadows, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { selectedPhoto } = useOnboarding();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          onSkip={() => router.replace('/(auth)/login')}
          step="1 / 4"
          title="Fotoğrafını yükle"
        />
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(124,58,237,0.23)', 'rgba(255,196,0,0.06)', 'rgba(5,5,5,0)']}
            style={styles.heroGlow}
          />
          <Animated.View entering={FadeInLeft.duration(550)} style={styles.beforeSlot}>
            <View style={[styles.photoFrame, styles.beforeFrame]}>
              <Image
                fadeDuration={0}
                resizeMode="contain"
                source={resolveOnboardingPhoto(selectedPhoto)}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.84)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.beforeLabel}>
                <Text style={styles.beforeLabelText}>Seçtiğin fotoğraf</Text>
              </View>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(170).duration(580)} style={styles.afterSlot}>
            <View style={[styles.photoFrame, styles.afterFrame]}>
              <Image
                fadeDuration={0}
                resizeMode="contain"
                source={onboardingImages.afterCinematic}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.78)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.afterLabel}>
                <Ionicons color={colors.background} name="sparkles" size={13} />
                <Text style={styles.afterLabelText}>AI sahnesi</Text>
              </View>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400).duration(420)} style={styles.magicBadge}>
            <Ionicons color={colors.accentYellow} name="color-wand-outline" size={22} />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(330).duration(540)} style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            Fotoğrafını sahneye{`\n`}taşımaya hazırız.
          </Text>
          <Text style={styles.description}>
            BirKare AI, seçtiğin fotoğrafı referans alır. Sen sahneyi ve tarzı belirlersin; sistem
            yeni bir kareyi oluşturmak için seçimini hazırlar.
          </Text>
          <View style={styles.featureRow}>
            <PhotoChip icon="person-outline">Yüz odağı</PhotoChip>
            <PhotoChip icon="layers-outline">Sahne seçimi</PhotoChip>
            <PhotoChip icon="sparkles-outline">AI üretim</PhotoChip>
          </View>
        </Animated.View>
        <View style={styles.bottom}>
          <StepProgress active={0} />
          <GoldButton label="Sahne seç" onPress={() => router.push('/(onboarding)/categories')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  hero: { height: 330, marginTop: 12, position: 'relative' },
  heroGlow: {
    borderRadius: 180,
    height: 290,
    left: '50%',
    marginLeft: -145,
    marginTop: -145,
    position: 'absolute',
    top: '50%',
    width: 290,
  },
  beforeSlot: { height: 242, left: 12, position: 'absolute', top: 54, width: 170 },
  afterSlot: { height: 242, position: 'absolute', right: 10, top: 29, width: 170 },
  photoFrame: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
    ...shadows.floating,
  },
  beforeFrame: { transform: [{ rotate: '-8deg' }] },
  afterFrame: { borderColor: 'rgba(255,196,0,0.58)', transform: [{ rotate: '7deg' }] },
  beforeLabel: {
    backgroundColor: 'rgba(5,5,5,0.80)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 11,
    left: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  beforeLabelText: { color: colors.textPrimary, fontSize: 9, fontWeight: '800' },
  afterLabel: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    bottom: 11,
    flexDirection: 'row',
    gap: 5,
    left: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  afterLabelText: { color: colors.background, fontSize: 9, fontWeight: '900' },
  magicBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(255,196,0,0.38)',
    borderRadius: 26,
    borderWidth: 1,
    bottom: 18,
    height: 52,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -26,
    position: 'absolute',
    width: 52,
    ...shadows.yellow,
  },
  copy: { marginTop: 3 },
  title: {
    color: colors.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -1.15,
    lineHeight: 35,
  },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 18 },
  bottom: { gap: 15, marginTop: 'auto', paddingBottom: 8, paddingTop: 14 },
});
