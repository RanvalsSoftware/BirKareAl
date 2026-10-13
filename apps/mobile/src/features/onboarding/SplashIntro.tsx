import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BRAND_LOGO_ASSEMBLY_DURATION, BrandLogo } from '@/components/BrandLogo';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCopy } from '@/features/settings/language-store';
import { tr as translateCopy } from '@/i18n/engine';
import { brand } from '@/theme/brand';

const INTRO_DURATION = BRAND_LOGO_ASSEMBLY_DURATION + 900;
const REDUCED_MOTION_DURATION = 650;

/**
 * Animated launch screen: the gold mark assembles from its layers, the
 * wordmark rises beneath it and a thin progress line fills while the session
 * boots. The sequence is short on purpose; it covers auth bootstrap, not a wait.
 */
export function SplashIntro({ onFinished }: { onFinished: () => void }) {
  const copy = useCopy();
  const reduceMotion = useReducedMotion();
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(onFinished, reduceMotion ? REDUCED_MOTION_DURATION : INTRO_DURATION);
    return () => clearTimeout(timeout);
  }, [onFinished, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      wordmark.value = 1;
      tagline.value = 1;
      progress.value = 1;
      return;
    }
    const rise = { duration: 520, easing: Easing.out(Easing.cubic) };
    wordmark.value = withDelay(900, withTiming(1, rise));
    tagline.value = withDelay(1_080, withTiming(1, rise));
    progress.value = withDelay(
      200,
      withTiming(1, { duration: INTRO_DURATION - 360, easing: Easing.inOut(Easing.quad) }),
    );
  }, [progress, reduceMotion, tagline, wordmark]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [16, 0]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [10, 0]) }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      accessibilityLabel={copy('BirKare Studio açılıyor', 'BirKare Studio is opening')}
      accessibilityRole="progressbar"
      style={styles.screen}
    >
      <LinearGradient
        colors={['#1A1508', brand.background, brand.background]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.stage}>
        <BrandLogo assemble size={176} />
        <Animated.View style={[styles.wordmark, wordmarkStyle]}>
          <Text style={styles.wordmarkText}>
            {'BirKare '}
            <Text style={styles.wordmarkAccent}>{translateCopy('Studio')}</Text>
          </Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          {copy('Ürün görsel çalışma alanın', 'Your product-image workspace')}
        </Animated.Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: brand.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  wordmark: { marginTop: 30 },
  wordmarkText: { color: brand.text, fontSize: 32, fontWeight: '800', letterSpacing: -1.1 },
  wordmarkAccent: { color: brand.gold, fontWeight: '600' },
  tagline: { color: brand.textSecondary, fontSize: 14, letterSpacing: 0.2, marginTop: 8 },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    bottom: 64,
    height: 3,
    overflow: 'hidden',
    position: 'absolute',
    width: 120,
  },
  progressFill: { backgroundColor: brand.gold, borderRadius: 3, height: '100%' },
});
