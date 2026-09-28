import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Icon, Notice, Screen } from '@/components';
import { apiBaseUrl, apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { GeneratedSharePanel } from '@/features/sharing/GeneratedSharePanel';
import { exportGeneratedImage } from '@/features/sharing/native-share';
import {
  selectedShareOutput,
  shareAspectRatio,
  shareDownloadRequest,
  type ShareGeneration,
} from '@/features/sharing/output';
import { colors, radii, spacing, typography } from '@/theme';

export default function ExportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; outputId?: string }>();
  const generationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const outputId = Array.isArray(params.outputId) ? params.outputId[0] : params.outputId;
  const token = useAuthStore((store) => store.accessToken);
  const userId = useAuthStore((store) => store.user?.id);
  const requestScope = `${userId}:${generationId}`;
  const [loadedGeneration, setGeneration] = useState<
    (ShareGeneration & { requestScope: string }) | null
  >(null);
  const generation = loadedGeneration?.requestScope === requestScope ? loadedGeneration : null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!generationId || generationId === 'demo') return;
    void apiRequest<ShareGeneration>(`/v1/generations/${encodeURIComponent(generationId)}`)
      .then((result) => {
        if (active) {
          setGeneration({ ...result, requestScope });
          setError(null);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Görsel yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [generationId, requestScope]);

  const selection = useMemo(() => {
    if (!generation) return null;
    try {
      const output = selectedShareOutput(generation, outputId);
      const request = shareDownloadRequest(output.asset.accessUrl!, apiBaseUrl, token);
      const readyOutputs = generation.outputs.filter(
        (item) => item.asset?.status === 'READY' && item.asset.accessUrl,
      );
      const selectedIndex = Math.max(
        0,
        readyOutputs.findIndex((item) => item.id === output.id),
      );
      return {
        id: output.id,
        imageSource: { uri: request.url, headers: request.headers },
        counter: `${selectedIndex + 1}/${Math.max(1, readyOutputs.length)}`,
      };
    } catch {
      return null;
    }
  }, [generation, outputId, token]);

  const ratio = shareAspectRatio(generation?.aspectRatio);
  const shareOther = async () => {
    if (!generationId || !selection) return;
    try {
      await exportGeneratedImage(generationId, selection.id, 'other');
    } catch (reason) {
      Alert.alert(
        'Paylaşım açılamadı',
        reason instanceof Error ? reason.message : 'Lütfen tekrar dene.',
      );
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}
        >
          <Icon name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diğer paylaşım seçenekleri"
          disabled={!selection}
          onPress={() => void shareOther()}
          style={({ pressed }) => [
            styles.topButton,
            !selection && styles.disabled,
            pressed && selection && styles.pressed,
          ]}
        >
          <Icon name="ellipsis-horizontal" size={25} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.preview, { aspectRatio: ratio }]}>
        {selection ? (
          <Image
            accessibilityLabel="Paylaşılacak seçili AI görseli"
            resizeMode="contain"
            source={selection.imageSource}
            style={styles.previewImage}
          />
        ) : (
          <View style={styles.previewEmpty}>
            <Icon name="image-outline" size={46} color={colors.textMuted} />
            <Text style={styles.previewEmptyText}>Görsel hazırlanıyor…</Text>
          </View>
        )}
        {selection ? (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{selection.counter}</Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <Notice tone="warning" title="Görsel açılamadı">
          {error}
        </Notice>
      ) : null}

      <GeneratedSharePanel
        generationId={generationId ?? 'demo'}
        outputId={selection?.id ?? outputId}
        ready={Boolean(selection)}
      />

      <View style={styles.integrityNote}>
        <Icon name="resize-outline" size={17} color={colors.accentYellow} />
        <Text style={styles.integrityText}>
          Paylaşımda görsel yeniden kırpılmaz. Oluşturulduğu çözünürlük ve en-boy oranı aynen korunur.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42, gap: spacing.md },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    maxHeight: 660,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#080808',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#080808',
  },
  previewEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewEmptyText: { ...typography.caption, color: colors.textMuted },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 38,
    minHeight: 30,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(5,5,5,0.72)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  counterText: { ...typography.caption, color: colors.textPrimary, fontWeight: '800' },
  integrityNote: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.20)',
    backgroundColor: 'rgba(255,196,0,0.045)',
    minHeight: 58,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  integrityText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});
