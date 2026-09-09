import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader, Icon, Notice, Screen } from '@/components';
import { apiBaseUrl, apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { GeneratedSharePanel } from '@/features/sharing/GeneratedSharePanel';
import {
  selectedShareOutput,
  shareDownloadRequest,
  type ShareGeneration,
} from '@/features/sharing/output';
import { colors, radii, spacing, typography } from '@/theme';

export default function ExportScreen() {
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
  let imageSource;
  let selectedId: string | undefined;
  if (generation) {
    try {
      const output = selectedShareOutput(generation, outputId);
      selectedId = output.id;
      const request = shareDownloadRequest(output.asset.accessUrl!, apiBaseUrl, token);
      imageSource = { uri: request.url, headers: request.headers };
    } catch {
      /* Never use the source photo for unavailable results. */
    }
  }
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Paylaş ve kaydet" subtitle="Oluşturduğun kareye özel" />
      <View style={styles.preview}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityLabel="Paylaşılacak seçili AI görseli"
          />
        ) : (
          <Icon name="image-outline" size={46} color={colors.textMuted} />
        )}
        <View style={styles.aiPill}>
          <Icon name="sparkles" size={12} color={colors.accentYellow} />
          <Text style={styles.aiText}>AI ile oluşturuldu</Text>
        </View>
      </View>
      {error ? (
        <Notice tone="warning" title="Görsel açılamadı">
          {error}
        </Notice>
      ) : null}
      <GeneratedSharePanel
        generationId={generationId ?? 'demo'}
        outputId={selectedId ?? outputId}
        ready={Boolean(imageSource)}
      />
      <Notice tone="neutral" title="Çıktın değişmeden korunur">
        Kaydetme ve paylaşma yeni bir AI üretimi başlatmaz, kredi harcamaz. Görselin mevcut
        çözünürlüğü ve oranı korunur; otomatik HD büyütme veya Story kırpması yapılmaz.
      </Notice>
      <Text style={styles.note}>
        Önizlemedeki AI etiketi indirilen dosyaya ayrıca basılmaz. Paylaşırken açıklama metnini ve
        platformun AI içerik etiketini ekle.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42, gap: spacing.lg },
  preview: {
    height: 340,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#090909',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    minHeight: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiText: { ...typography.caption, fontSize: 10, color: colors.textPrimary, fontWeight: '700' },
  note: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
});
