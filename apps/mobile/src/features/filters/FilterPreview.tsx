import { useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { clampFilterIntensity, filterPreviewStrength, getFilterPreviewProfile } from './intensity';

type ToneProps = { filterId: string | null; intensity: number; showOriginal?: boolean };

/** Local lighting/color approximation only. It does not synthesize AI details or replace the person. */
export function FilterToneLayers({ filterId, intensity, showOriginal = false }: ToneProps) {
  const reducedMotion = useReducedMotion();
  const profile = getFilterPreviewProfile(filterId);
  const canBlend = Platform.OS !== 'android' || Number(Platform.Version) >= 29;
  const tintOpacity = profile.monochrome && !canBlend ? 0.22 : profile.tintOpacity;
  const strength = useSharedValue(showOriginal || !filterId ? 0 : filterPreviewStrength(intensity));
  useEffect(() => {
    strength.set(
      withTiming(showOriginal || !filterId ? 0 : filterPreviewStrength(intensity), {
        duration: reducedMotion ? 0 : 240,
      }),
    );
  }, [filterId, intensity, reducedMotion, showOriginal, strength]);
  const tintStyle = useAnimatedStyle(() => ({ opacity: strength.get() * tintOpacity }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: strength.get() * profile.lightOpacity }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: strength.get() * profile.shadowOpacity }));
  // Native color blending preserves source luminance for a real monochrome tone preview.
  // Older Android keeps a subdued ordinary overlay instead of requesting an unsupported mode.
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          tintStyle,
          profile.monochrome && canBlend ? { mixBlendMode: 'color' } : undefined,
        ]}
      >
        <LinearGradient
          colors={profile.tint}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lightStyle]}>
        <LinearGradient
          colors={[profile.light, 'transparent', 'transparent']}
          locations={[0, 0.57, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadowStyle]}>
        <LinearGradient
          colors={['transparent', 'transparent', '#140E12']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
}

type FilterPreviewProps = ToneProps & {
  sourceUri?: string | null;
  source?: ImageSourcePropType;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
};

/** Always displays the user's source, never substitutes catalogue artwork as their generated result. */
export function FilterPreview({
  sourceUri,
  source,
  filterId,
  intensity,
  aspectRatio = 4 / 5,
  style,
  showOriginal = false,
  showLabel = true,
}: FilterPreviewProps) {
  const imageSource = sourceUri
    ? { uri: sourceUri }
    : (source ?? require('../../../assets/onboarding/images/filters/natural.png'));
  return (
    <View style={[styles.frame, { aspectRatio }, style]}>
      <View style={styles.photoCanvas}>
        <Image
          source={imageSource}
          style={styles.photo}
          resizeMode="contain"
          fadeDuration={0}
          accessibilityLabel={
            showOriginal ? 'Kaynak fotoğraf' : 'Seçili fotoğrafta yaklaşık filtre tonu'
          }
        />
        <FilterToneLayers filterId={filterId} intensity={intensity} showOriginal={showOriginal} />
      </View>
      {showLabel ? (
        <View pointerEvents="none" style={styles.label}>
          <Text style={styles.labelText}>
            {showOriginal
              ? 'Orijinal'
              : `${!sourceUri && !source ? 'Demo · ' : ''}Yaklaşık ton önizlemesi · %${clampFilterIntensity(intensity)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#080808' },
  photoCanvas: { flex: 1, isolation: 'isolate', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  label: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  labelText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
});
