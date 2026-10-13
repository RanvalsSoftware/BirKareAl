import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCopy } from '@/features/settings/language-store';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { brand } from '@/theme/brand';
import type { StudioAspectRatio } from './productFlow';

function ratioValue(ratio: StudioAspectRatio): number {
  const [width, height] = ratio.split(':').map(Number);
  return width && height ? width / height : 1;
}

/**
 * The shoot as it is being planned: the chosen scene in the chosen format with
 * the person's own product placed on it. It is a layout aid drawn on the
 * device; the final images are rendered by the server.
 */
export function StudioPreview({
  ratio,
  sceneId,
  sceneSource,
  photoUri,
  cutoutUri,
  preparing,
  maxHeight,
}: {
  ratio: StudioAspectRatio;
  sceneId: string | null;
  sceneSource?: ImageSourcePropType;
  photoUri: string | null;
  cutoutUri: string | null;
  /** True while the product is being separated from its background. */
  preparing: boolean;
  maxHeight: number;
}) {
  const copy = useCopy();
  const reducedMotion = useReducedMotion();
  const [available, setAvailable] = useState(0);
  const aspect = ratioValue(ratio);
  const width = Math.min(available, maxHeight * aspect);
  const height = width / aspect;
  const card = Math.min(width, height) * 0.54;

  return (
    <View
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
      style={styles.wrap}
    >
      {available > 0 ? (
        <View
          accessibilityLabel={copy(
            `Çekim önizlemesi, ${ratio} format`,
            `Shoot preview, ${ratio} format`,
          )}
          accessible
          style={[styles.frame, { height, width }]}
        >
          {sceneSource ? (
            <Animated.Image
              entering={reducedMotion ? undefined : FadeIn.duration(220)}
              key={sceneId ?? 'scene'}
              resizeMode="cover"
              source={sceneSource}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {cutoutUri ? (
            <Image resizeMode="contain" source={{ uri: cutoutUri }} style={styles.cutout} />
          ) : photoUri ? (
            <View style={styles.center}>
              <View style={[styles.card, { height: card, width: card }]}>
                <Image resizeMode="cover" source={{ uri: photoUri }} style={styles.fill} />
              </View>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.placeholder}>
                <Ionicons color={brand.text} name="cube-outline" size={26} />
                <Text style={styles.placeholderText}>
                  {copy('Ürünün burada görünecek', 'Your product appears here')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tagRow}>
            <View style={styles.tag}>
              {preparing ? <ActivityIndicator color={brand.text} size="small" /> : null}
              <Text style={styles.tagText}>
                {preparing
                  ? copy('Ürün ayrılıyor…', 'Isolating product…')
                  : copy('Temsili önizleme', 'Illustrative preview')}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{ratio}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  frame: { backgroundColor: brand.surfaceRaised, borderRadius: 20, overflow: 'hidden' },
  fill: { height: '100%', width: '100%' },
  center: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cutout: { bottom: '12%', left: '14%', position: 'absolute', right: '14%', top: '20%' },
  card: {
    backgroundColor: brand.surface,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: 'rgba(10,9,6,0.72)',
    borderRadius: 16,
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  placeholderText: { color: brand.text, fontSize: 13, fontWeight: '500' },
  tagRow: {
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 10,
    position: 'absolute',
    right: 10,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: 'rgba(10,9,6,0.78)',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 6,
    minHeight: 26,
    paddingHorizontal: 10,
  },
  tagText: { color: brand.text, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '500' },
});
