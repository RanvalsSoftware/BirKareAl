import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader, Icon, Notice, Screen, SourcePreview } from '@/components';
import { useCreateFlow } from '@/features/create/createFlow';
import { colors, radii, spacing, typography } from '@/theme';

export default function CompareScreen() {
  const router = useRouter();
  const { flow } = useCreateFlow();
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.53);
  const setFromX = useCallback(
    (x: number) => {
      if (width) setSplit(Math.min(0.92, Math.max(0.08, x / width)));
    },
    [width],
  );
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
      }),
    [setFromX],
  );
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Önce / sonra" subtitle="Karedeki dönüşümü karşılaştır" />
      <View
        style={styles.frame}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityLabel="Önce ve sonra görsel karşılaştırması"
      >
        <SourcePreview sourceUri={flow.sourceUri} label="Orijinal kaynak fotoğraf" />
        <View pointerEvents="none" style={[styles.afterClip, { width: `${split * 100}%` }]}>
          <LinearGradient
            colors={['rgba(124,58,237,0.7)', 'rgba(255,196,0,0.52)']}
            style={styles.afterArt}
          >
            <View style={styles.afterShape}>
              <Text style={styles.afterGlyph}>✦</Text>
              <Text style={styles.afterLabel}>AI</Text>
            </View>
          </LinearGradient>
        </View>
        <View pointerEvents="none" style={[styles.splitLine, { left: `${split * 100}%` }]}>
          <View style={styles.handle}>
            <Icon name="swap-horizontal" size={19} color={colors.background} />
          </View>
        </View>
        <View {...responder.panHandlers} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.beforeTag}>
          <Text style={styles.tagText}>ORİJİNAL</Text>
        </View>
        <View pointerEvents="none" style={styles.afterTag}>
          <Text style={styles.tagText}>AI SONUÇ</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.legendText}>Orijinal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accentYellow }]} />
          <Text style={styles.legendText}>AI sonucu</Text>
        </View>
      </View>
      <Notice tone="neutral" title="Kaydırarak karşılaştır">
        Ayıracı sağa veya sola sürükleyerek değişimi daha ayrıntılı inceleyebilirsin.
      </Notice>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sonuca dön"
        onPress={() => router.back()}
        style={styles.done}
      >
        <Text style={styles.doneText}>Sonuca dön</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  frame: {
    height: 410,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  afterClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  afterArt: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  afterShape: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  afterGlyph: { color: colors.textPrimary, fontSize: 30, fontWeight: '900' },
  afterLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '700', marginTop: 1 },
  splitLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.textPrimary,
    marginLeft: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  beforeTag: {
    position: 'absolute',
    left: 11,
    bottom: 11,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.overlay,
  },
  afterTag: {
    position: 'absolute',
    right: 11,
    bottom: 11,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.overlay,
  },
  tagText: { ...typography.caption, fontSize: 10, color: colors.textPrimary, fontWeight: '800' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.textMuted },
  done: {
    marginTop: spacing.xl,
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { ...typography.label, color: colors.textPrimary },
});
