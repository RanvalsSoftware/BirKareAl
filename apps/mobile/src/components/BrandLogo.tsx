import { useEffect } from 'react';
import { Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { brand } from '@/theme/brand';

const layerLeft = require('../../assets/brand/logo-layer-left.png');
const layerRight = require('../../assets/brand/logo-layer-right.png');
const layerStreak = require('../../assets/brand/logo-layer-streak.png');
const fullMark = require('../../assets/brand/logo-mark-640.png');

/** Total length of the assembly sequence in milliseconds. */
export const BRAND_LOGO_ASSEMBLY_DURATION = 1_400;

/**
 * The BirKare mark split into three layers so it can assemble on screen: the
 * picture half slides in from the left, the shutter half from the right and
 * the gold streak sweeps through the seam last. `assemble` plays that
 * sequence once; otherwise the mark is shown complete with a soft breathing
 * glow. Reduced-motion users always get the static mark.
 */
export function BrandLogo({
  size = 160,
  assemble = false,
  glow = true,
  style,
}: {
  size?: number;
  assemble?: boolean;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const animated = assemble && !reduceMotion;
  const left = useSharedValue(animated ? 0 : 1);
  const right = useSharedValue(animated ? 0 : 1);
  const streak = useSharedValue(animated ? 0 : 1);
  const breath = useSharedValue(0.5);

  useEffect(() => {
    if (!animated) {
      left.value = 1;
      right.value = 1;
      streak.value = 1;
      return undefined;
    }
    const spring = { damping: 16, stiffness: 150, mass: 0.9 };
    left.value = withDelay(80, withSpring(1, spring));
    right.value = withDelay(220, withSpring(1, spring));
    streak.value = withDelay(620, withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) }));
    return undefined;
  }, [animated, left, right, streak]);

  useEffect(() => {
    cancelAnimation(breath);
    if (reduceMotion || !glow) {
      breath.value = 0.5;
      return undefined;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 2_600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [breath, glow, reduceMotion]);

  const leftStyle = useAnimatedStyle(() => ({
    opacity: left.value,
    transform: [
      { translateX: interpolate(left.value, [0, 1], [-size * 0.28, 0]) },
      { scale: interpolate(left.value, [0, 1], [0.92, 1]) },
    ],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: right.value,
    transform: [
      { translateX: interpolate(right.value, [0, 1], [size * 0.28, 0]) },
      { rotate: `${interpolate(right.value, [0, 1], [-28, 0])}deg` },
      { scale: interpolate(right.value, [0, 1], [0.92, 1]) },
    ],
  }));
  const streakStyle = useAnimatedStyle(() => ({
    opacity: streak.value,
    transform: [
      { translateX: interpolate(streak.value, [0, 1], [size * 0.18, 0]) },
      { translateY: interpolate(streak.value, [0, 1], [-size * 0.18, 0]) },
      { scale: interpolate(streak.value, [0, 1], [1.25, 1]) },
    ],
  }));
  // iOS derives the shadow from the image alpha, so the glow follows the mark
  // itself instead of a disc behind it.
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow ? interpolate(breath.value, [0, 1], [0.35, 0.75]) * streak.value : 0,
  }));

  const box = { height: size, width: size };
  const glowShadow = { shadowRadius: size * 0.16 };
  if (!animated) {
    return (
      <Animated.View style={[styles.wrap, styles.glow, box, glowShadow, glowStyle, style]}>
        <Image accessibilityIgnoresInvertColors source={fullMark} style={box} />
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.wrap, styles.glow, box, glowShadow, glowStyle, style]}>
      <Animated.Image accessibilityIgnoresInvertColors source={layerLeft} style={[styles.layer, box, leftStyle]} />
      <Animated.Image accessibilityIgnoresInvertColors source={layerRight} style={[styles.layer, box, rightStyle]} />
      <Animated.Image accessibilityIgnoresInvertColors source={layerStreak} style={[styles.layer, box, streakStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  glow: {
    shadowColor: brand.gold,
    shadowOffset: { height: 0, width: 0 },
  },
});
