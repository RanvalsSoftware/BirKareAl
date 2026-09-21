import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { apiBaseUrl, apiRequest } from '@/api/client';
import { AppHeader, Icon, Notice, Screen } from '@/components';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCreateFlow } from '@/features/create/createFlow';
import { colors, radii, spacing, typography } from '@/theme';

type CompareOutput = {
  id: string;
  selected: boolean;
  variantIndex: number;
  asset: { accessUrl: string | null } | null;
};

type CompareGeneration = {
  id: string;
  projectId: string;
  status: string;
  aspectRatio: string;
  outputs: CompareOutput[];
};

type CompareProject = {
  project: {
    id: string;
    sourceAssetId: string | null;
  };
};

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function ratioValue(value?: string): number {
  const [width, height] = value?.split(':').map(Number) ?? [];
  return width > 0 && height > 0 ? width / height : 4 / 5;
}

function remoteImageSource(
  url: string | null | undefined,
  token: string | null,
): ImageSourcePropType | null {
  if (!url) return null;
  const localApiPath = url.startsWith('/');
  return {
    uri: localApiPath ? `${apiBaseUrl}${url}` : url,
    headers: localApiPath && token ? { authorization: `Bearer ${token}` } : undefined,
  };
}

export default function CompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    outputId?: string;
    projectId?: string;
  }>();
  const generationId = firstParam(params.id);
  const requestedOutputId = firstParam(params.outputId);
  const requestedProjectId = firstParam(params.projectId);
  const accessToken = useAuthStore((store) => store.accessToken);
  const userId = useAuthStore((store) => store.user?.id);
  const { flow } = useCreateFlow();
  const [generation, setGeneration] = useState<CompareGeneration | null>(null);
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(generationId && generationId !== 'demo'));
  const [error, setError] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [split, setSplit] = useState(0.5);

  useEffect(() => {
    if (!generationId || generationId === 'demo') return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);
      setGeneration(null);
      setSourceAssetId(null);
      try {
        const result = await apiRequest<CompareGeneration>(
          `/v1/generations/${encodeURIComponent(generationId)}`,
        );
        if (!active) return;
        setGeneration(result);
        const projectId = result.projectId || requestedProjectId;
        if (!projectId) throw new Error('Kaynak projenin kimliği bulunamadı.');
        const project = await apiRequest<CompareProject>(
          `/v1/projects/${encodeURIComponent(projectId)}`,
        );
        if (!active) return;
        setSourceAssetId(project.project.sourceAssetId);
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Karşılaştırma yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [generationId, requestedProjectId, userId]);

  const setFromX = useCallback(
    (x: number) => {
      if (!frameWidth) return;
      const clamped = Math.min(frameWidth - 24, Math.max(24, x));
      setSplit(clamped / frameWidth);
    },
    [frameWidth],
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

  const selectedOutput = useMemo(
    () =>
      generation?.outputs.find((output) => output.id === requestedOutputId) ??
      generation?.outputs.find((output) => output.selected) ??
      generation?.outputs[0] ??
      null,
    [generation, requestedOutputId],
  );
  const afterSource = remoteImageSource(selectedOutput?.asset?.accessUrl, accessToken);
  const beforeSource = sourceAssetId
    ? remoteImageSource(`/v1/assets/${encodeURIComponent(sourceAssetId)}/content`, accessToken)
    : flow.sourceUri
      ? ({ uri: flow.sourceUri } as ImageSourcePropType)
      : null;
  const ready = Boolean(beforeSource && afterSource);

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Önce / sonra" subtitle="Gerçek dönüşümü kaydırarak karşılaştır" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentYellow} />
          <Text style={styles.loadingText}>Orijinal ve sonuç hazırlanıyor…</Text>
        </View>
      ) : null}
      {error ? (
        <Notice tone="warning" title="Karşılaştırma açılamadı">
          {error}
        </Notice>
      ) : null}
      {!loading && ready ? (
        <>
          <View
            accessibilityLabel="Orijinal ve AI sonucu karşılaştırması. Ayıracı sağa veya sola sürükleyin."
            style={[styles.frame, { aspectRatio: ratioValue(generation?.aspectRatio) }]}
            onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
          >
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="Orijinal kaynak fotoğraf"
              resizeMode="cover"
              source={beforeSource!}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={[styles.afterClip, { width: `${split * 100}%` }]}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel="AI üretim sonucu"
                resizeMode="cover"
                source={afterSource!}
                style={[styles.afterImage, { width: frameWidth }]}
              />
            </View>
            <View pointerEvents="none" style={[styles.splitLine, { left: `${split * 100}%` }]}>
              <View style={styles.handle}>
                <Icon name="chevron-back" size={15} color={colors.background} />
                <Icon name="chevron-forward" size={15} color={colors.background} />
              </View>
            </View>
            <View {...responder.panHandlers} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.afterTag}>
              <Icon name="sparkles" size={11} color={colors.accentYellow} />
              <Text style={styles.tagText}>AI SONUÇ</Text>
            </View>
            <View pointerEvents="none" style={styles.beforeTag}>
              <Text style={styles.tagText}>ORİJİNAL</Text>
            </View>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accentYellow }]} />
              <Text style={styles.legendText}>AI sonucu</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
              <Text style={styles.legendText}>Orijinal kaynak</Text>
            </View>
          </View>
          <Notice tone="neutral" title="Kaydırarak karşılaştır">
            Solda seçili AI sonucu, sağda yüklediğin ilk kaynak fotoğraf bulunur. Ayıracı tutup
            sürükleyerek ayrıntıları inceleyebilirsin.
          </Notice>
        </>
      ) : null}
      {!loading && !ready && !error ? (
        <Notice tone="warning" title="Karşılaştırma için görseller eksik">
          Orijinal kaynak veya tamamlanmış sonuç bulunamadı. Projelerden tamamlanan bir üretimi açıp
          yeniden deneyebilirsin.
        </Notice>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sonuca dön"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
      >
        <Text style={styles.doneText}>Sonuca dön</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  loading: { alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 360 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  frame: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing.lg,
    minHeight: 300,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  afterClip: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  afterImage: { bottom: 0, left: 0, position: 'absolute', top: 0 },
  splitLine: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    bottom: 0,
    justifyContent: 'center',
    marginLeft: -1,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  handle: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderColor: colors.accentYellow,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 48,
  },
  beforeTag: {
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    bottom: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
    right: 11,
  },
  afterTag: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    bottom: 11,
    flexDirection: 'row',
    gap: 4,
    left: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  tagText: { ...typography.caption, color: colors.textPrimary, fontSize: 10, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: 18, justifyContent: 'center', paddingVertical: 14 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendText: { ...typography.caption, color: colors.textMuted },
  done: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 50,
  },
  doneText: { ...typography.label, color: colors.textPrimary },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
