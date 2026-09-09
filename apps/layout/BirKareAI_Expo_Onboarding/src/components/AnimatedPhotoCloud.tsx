import { Image } from 'expo-image';
import { useEffect } from 'react';

import type { AppImageSource } from '@/src/types/image';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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

import { colors } from '@/src/theme/colors';
import { shadow } from '@/src/theme/metrics';

type AnimatedPhotoCloudProps = {
  centerSource: AppImageSource;
  surroundingSources: AppImageSource[];
};

type FloatCardProps = {
  source: AppImageSource;
  width: number;
  height: number;
  left: number;
  top: number;
  rotate: number;
  driftX: number;
  driftY: number;
  delay: number;
};

function FloatCard({ source, width, height, left, top, rotate, driftX, driftY, delay }: FloatCardProps) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const r = useSharedValue(rotate);

  useEffect(() => {
    x.value = withDelay(
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
    y.value = withDelay(
      delay + 120,
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
    r.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(rotate + 2.2, { duration: 2400 }),
          withTiming(rotate - 1.5, { duration: 2200 }),
          withTiming(rotate, { duration: 1800 }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(r);
    };
  }, [delay, driftX, driftY, r, rotate, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${r.value}deg` },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(520)}
      style={[
        styles.floatCard,
        { height, left, top, width },
        animatedStyle,
      ]}
    >
      <Image contentFit="cover" source={source} style={StyleSheet.absoluteFill} transition={180} />
    </Animated.View>
  );
}

export function AnimatedPhotoCloud({ centerSource, surroundingSources }: AnimatedPhotoCloudProps) {
  const { width } = useWindowDimensions();
  const canvasWidth = Math.min(width - 32, 420);
  const canvasHeight = 410;
  const centerScale = useSharedValue(1);
  const centerY = useSharedValue(0);

  useEffect(() => {
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
  }, [centerScale, centerY]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: centerY.value }, { scale: centerScale.value }],
  }));

  const items = [
    surroundingSources[0],
    surroundingSources[1],
    surroundingSources[2],
    surroundingSources[3],
  ].filter(Boolean) as AppImageSource[];

  return (
    <View style={[styles.canvas, { height: canvasHeight, width: canvasWidth }]}> 
      <View style={styles.halo} />
      {items[0] ? (
        <FloatCard delay={100} driftX={9} driftY={-8} height={142} left={8} rotate={-10} source={items[0]} top={34} width={108} />
      ) : null}
      {items[1] ? (
        <FloatCard delay={180} driftX={-8} driftY={10} height={128} left={canvasWidth - 118} rotate={9} source={items[1]} top={48} width={105} />
      ) : null}
      {items[2] ? (
        <FloatCard delay={260} driftX={12} driftY={7} height={126} left={17} rotate={8} source={items[2]} top={248} width={104} />
      ) : null}
      {items[3] ? (
        <FloatCard delay={340} driftX={-10} driftY={-9} height={143} left={canvasWidth - 116} rotate={-8} source={items[3]} top={239} width={108} />
      ) : null}

      <Animated.View entering={ZoomIn.delay(120).duration(620)} style={[styles.centerCard, centerStyle]}>
        <Image contentFit="cover" source={centerSource} style={StyleSheet.absoluteFill} transition={220} />
        <View style={styles.centerBorder} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { alignSelf: 'center', position: 'relative' },
  halo: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderRadius: 160,
    height: 300,
    left: '50%',
    marginLeft: -150,
    marginTop: -150,
    position: 'absolute',
    top: '50%',
    width: 300,
  },
  floatCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'absolute',
    ...shadow.card,
  },
  centerCard: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: 30,
    borderWidth: 2,
    height: 250,
    marginTop: 78,
    overflow: 'hidden',
    width: 188,
    ...shadow.accent,
  },
  centerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 28,
    borderWidth: 1,
  },
});
