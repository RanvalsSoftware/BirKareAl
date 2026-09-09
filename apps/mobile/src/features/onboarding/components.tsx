import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radii, shadows } from '@/theme';

import { onboardingImages, type OnboardingPhoto, resolveOnboardingPhoto } from './data';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="BirKare AI" style={[styles.brand, compact && styles.brandCompact]}>
      <Image source={onboardingImages.brandMark} style={[styles.brandMark, compact && styles.brandMarkCompact]} />
      <Image source={onboardingImages.brandWordmark} style={[styles.brandWordmark, compact && styles.brandWordmarkCompact]} />
    </View>
  );
}

export function OnboardingHeader({
  step,
  title,
  onBack,
  onSkip,
}: {
  step?: string;
  title?: string;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable accessibilityLabel="Geri" accessibilityRole="button" hitSlop={10} onPress={onBack} style={styles.backButton}>
            <Ionicons color={colors.textPrimary} name="arrow-back" size={21} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerCenter}>
        {step ? <Text style={styles.headerStep}>{step}</Text> : null}
        {title ? <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text> : null}
      </View>
      <View style={[styles.headerSide, styles.headerRight]}>
        {onSkip ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Geç</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function StepProgress({ active, total = 4 }: { active: number; total?: number }) {
  return (
    <View accessibilityLabel={`Onboarding ${active + 1} / ${total}`} style={styles.stepProgress}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.stepDot, active === index && styles.stepDotActive]} />
      ))}
    </View>
  );
}

export function GoldButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon = 'arrow-forward',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
}) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.goldButton, unavailable && styles.goldDisabled, pressed && !unavailable && styles.goldPressed]}
    >
      <LinearGradient colors={['#FFE274', '#FFC400', '#E6A900']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.goldGradient}>
        {loading ? <Ionicons color={colors.background} name="ellipsis-horizontal" size={20} /> : null}
        {!loading ? <Text style={styles.goldLabel}>{label}</Text> : <Text style={styles.goldLabel}>Hazırlanıyor</Text>}
        {!loading && icon ? <Ionicons color={colors.background} name={icon} size={19} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function PhotoChip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View style={styles.photoChip}>
      <Ionicons color={colors.accentYellow} name={icon} size={13} />
      <Text style={styles.photoChipText}>{children}</Text>
    </View>
  );
}

type FloatPhotoProps = {
  source: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  driftX: number;
  driftY: number;
  delay: number;
};

/**
 * Entry animation intentionally lives on the outer wrapper. The inner card owns
 * transform motion, avoiding Reanimated's transform/layout-animation warning.
 */
function FloatPhoto({ source, left, top, width, height, rotate, driftX, driftY, delay }: FloatPhotoProps) {
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(rotate);

  useEffect(() => {
    if (reducedMotion) {
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = rotate;
      return;
    }
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(driftX, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(-driftX * 0.55, { duration: 2100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    translateY.value = withDelay(
      delay + 110,
      withRepeat(
        withSequence(
          withTiming(driftY, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(-driftY * 0.45, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    rotation.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(rotate + 2.2, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          withTiming(rotate - 1.4, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(rotate, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(rotation);
    };
  }, [delay, driftX, driftY, reducedMotion, rotate, rotation, translateX, translateY]);

  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(520)} style={[styles.floatSlot, { height, left, top, width }]}>
      <Animated.View style={[styles.floatCard, motion]}>
        <Image source={source} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </Animated.View>
  );
}

export function AnimatedPhotoCloud() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const canvasWidth = Math.min(width - 32, 420);
  const centerScale = useSharedValue(1);
  const centerY = useSharedValue(0);
  const surrounding = onboardingImages.gallery;

  useEffect(() => {
    if (reducedMotion) {
      centerScale.value = 1;
      centerY.value = 0;
      return;
    }
    centerScale.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 1350, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1350, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    centerY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(centerScale);
      cancelAnimation(centerY);
    };
  }, [centerScale, centerY, reducedMotion]);

  const centerMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: centerY.value }, { scale: centerScale.value }],
  }));

  return (
    <View style={[styles.cloudCanvas, { width: canvasWidth }]}>
      <LinearGradient colors={['rgba(124,58,237,0.05)', 'rgba(124,58,237,0.28)', 'rgba(255,196,0,0.08)']} style={styles.cloudHalo} />
      <FloatPhoto delay={90} driftX={9} driftY={-8} height={139} left={7} rotate={-10} source={surrounding[0] as number} top={32} width={106} />
      <FloatPhoto delay={180} driftX={-8} driftY={9} height={128} left={canvasWidth - 113} rotate={9} source={surrounding[1] as number} top={48} width={104} />
      <FloatPhoto delay={265} driftX={11} driftY={7} height={124} left={18} rotate={8} source={surrounding[2] as number} top={240} width={102} />
      <FloatPhoto delay={340} driftX={-9} driftY={-8} height={140} left={canvasWidth - 111} rotate={-8} source={surrounding[4] as number} top={230} width={104} />
      <Animated.View entering={ZoomIn.delay(110).duration(650)} style={styles.centerSlot}>
        <Animated.View style={[styles.centerCard, centerMotion]}>
          <Image source={surrounding[3]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
          <View style={styles.centerCaption}><Text style={styles.centerCaptionText}>Bir kare, yeni bir hikâye</Text></View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function SourceImage({ photo, style }: { photo: OnboardingPhoto | null; style?: object }) {
  return <Image source={resolveOnboardingPhoto(photo)} style={style} />;
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandCompact: { gap: 6 },
  brandMark: { height: 31, resizeMode: 'contain', width: 31 },
  brandMarkCompact: { height: 23, width: 23 },
  brandWordmark: { height: 29, resizeMode: 'contain', width: 124 },
  brandWordmarkCompact: { height: 22, width: 94 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52 },
  headerSide: { alignItems: 'flex-start', minWidth: 66 },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerStep: { color: colors.accentYellow, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  skipButton: { paddingHorizontal: 5, paddingVertical: 9 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  stepProgress: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center' },
  stepDot: { backgroundColor: '#3A3A3F', borderRadius: 4, height: 6, width: 6 },
  stepDotActive: { backgroundColor: colors.accentYellow, width: 25 },
  goldButton: { borderRadius: radii.md, minHeight: 56, overflow: 'hidden', ...shadows.yellow },
  goldGradient: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 },
  goldLabel: { color: colors.background, fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  goldDisabled: { opacity: 0.36 },
  goldPressed: { opacity: 0.78, transform: [{ scale: 0.988 }] },
  photoChip: { alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.74)', borderColor: 'rgba(255,255,255,0.14)', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  photoChipText: { color: colors.textPrimary, fontSize: 10, fontWeight: '800' },
  cloudCanvas: { alignSelf: 'center', height: 405, position: 'relative' },
  cloudHalo: { borderRadius: 190, height: 310, left: '50%', marginLeft: -155, marginTop: -155, position: 'absolute', top: '50%', width: 310 },
  floatSlot: { overflow: 'visible', position: 'absolute' },
  floatCard: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: 22, borderWidth: 1, overflow: 'hidden', ...shadows.floating },
  centerSlot: { alignSelf: 'center', height: 254, marginTop: 76, width: 190 },
  centerCard: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface, borderColor: colors.accentYellow, borderRadius: 30, borderWidth: 2, overflow: 'hidden', ...shadows.yellow },
  centerCaption: { bottom: 15, left: 13, position: 'absolute', right: 13 },
  centerCaptionText: { color: colors.textPrimary, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
