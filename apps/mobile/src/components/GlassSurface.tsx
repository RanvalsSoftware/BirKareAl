import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useAppearanceStore } from '@/features/settings/appearance-store';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

export type GlassSurfaceProps = ViewProps & {
  radius?: number;
  tone?: 'gold' | 'iridescent' | 'neutral';
  selected?: boolean;
  glow?: boolean;
  intensity?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

/** A continuous glass rim, not a coloured card or a detached glow stripe.
 * Material is decorative: accessibility and touches belong to the content.
 * Older iOS / Android use the same specular layers above a BlurView fallback.
 */
export function GlassSurface({
  children,
  radius = 24,
  tone = 'gold',
  selected = false,
  glow = true,
  intensity = 40,
  style,
  contentStyle,
  ...props
}: GlassSurfaceProps) {
  const glassEffects = useAppearanceStore((state) => state.glassEffects);
  // Start opaque until the accessibility setting has been read; never flash a
  // translucent native material for someone who requested reduced transparency.
  const [reduceTransparency, setReduceTransparency] = useState(Platform.OS === 'ios');
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (mounted) setReduceTransparency(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const translucent = glassEffects && !reduceTransparency;
  const nativeGlass =
    translucent && Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const gold = tone === 'gold';
  const iridescent = tone === 'iridescent';
  const accent = gold ? '#FFC400' : iridescent ? '#BD80F1' : '#C4C5C8';
  const rim: readonly [string, string, string, string, string] = selected
    ? ['#FFF3B4', '#B4A477', '#584C2C', '#9E7929', '#FFD65B']
    : gold
      ? ['#D5D4CF', '#777772', '#383934', '#746438', '#D5B452']
      : iridescent
        ? ['#DCDDDF', '#77777B', '#33343A', '#9560BE', '#D19E56']
        : ['#D5D6D8', '#77787B', '#37383C', '#55565A', '#98999A'];

  return (
    <View
      {...props}
      style={[
        styles.outer,
        { borderRadius: radius },
        glow &&
          translucent && {
            shadowColor: accent,
            shadowOpacity: selected ? 0.2 : 0.09,
            shadowRadius: selected ? 14 : 10,
            shadowOffset: { width: 0, height: 3 },
          },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}
      >
        <LinearGradient
          colors={rim}
          locations={[0, 0.25, 0.55, 0.8, 1]}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.78, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.inner, { borderRadius: Math.max(radius - 1.15, 0) }]}>
          {nativeGlass ? (
            <GlassView
              colorScheme="dark"
              glassEffectStyle="regular"
              isInteractive={false}
              tintColor={selected ? 'rgba(255,196,0,0.07)' : 'rgba(12,12,13,0.35)'}
              style={[StyleSheet.absoluteFill, { borderRadius: Math.max(radius - 1.15, 0) }]}
            />
          ) : translucent ? (
            <BlurView
              intensity={intensity}
              tint="dark"
              style={[StyleSheet.absoluteFill, { borderRadius: Math.max(radius - 1.15, 0) }]}
            />
          ) : null}
          <LinearGradient
            colors={
              !translucent
                ? ['#202022', '#101012', '#09090A']
                : ['rgba(29,29,31,0.86)', 'rgba(10,10,12,0.93)', 'rgba(6,6,7,0.94)']
            }
            locations={[0, 0.58, 1]}
            start={{ x: 0.18, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {translucent ? (
            <>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.10)',
                  'rgba(255,255,255,0.018)',
                  'rgba(255,255,255,0)',
                ]}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  gold
                    ? `rgba(255,196,0,${selected ? 0.11 : 0.035})`
                    : iridescent
                      ? 'rgba(175,117,234,0.04)'
                      : 'rgba(255,255,255,0.015)',
                ]}
                start={{ x: 0.4, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.innerBevel, { borderRadius: Math.max(radius - 5, 0) }]} />
            </>
          ) : null}
        </View>
      </View>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: '#0B0B0C' },
  clip: { overflow: 'hidden' },
  inner: { position: 'absolute', inset: 1.15, overflow: 'hidden', backgroundColor: '#101012' },
  innerBevel: {
    position: 'absolute',
    inset: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.045)',
  },
});
