import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiBaseUrl, apiRequest } from '@/api/client';
import { AppHeader, Icon, Notice, Screen, VisualTile } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { useAuthStore } from '@/features/auth/auth-store';
import { GeneratedSharePanel } from '@/features/sharing/GeneratedSharePanel';
import { colors, radii, spacing, typography } from '@/theme';

type ProjectOutput = {
  id: string;
  assetId: string;
  selected: boolean;
  variantIndex: number;
};

type ProjectGeneration = {
  id: string;
  status: string;
  quality: string;
  chargedCredits: number;
  createdAt: string;
  completedAt: string | null;
  outputs: ProjectOutput[];
};

type ProjectDetail = {
  project: {
    id: string;
    title: string | null;
    mode: string;
    aspectRatio: string;
    sourceAssetId: string | null;
    isFavorite: boolean;
    updatedAt: string;
  };
  generations: ProjectGeneration[];
};

function dateLabel(value: string | null): string {
  if (!value) return 'Yakın zamanda';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Yakın zamanda';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function preferredOutput(generation: ProjectGeneration): ProjectOutput | null {
  return generation.outputs.find((output) => output.selected) ?? generation.outputs[0] ?? null;
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
  const accessToken = useAuthStore((store) => store.accessToken);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    void apiRequest<ProjectDetail>(`/v1/projects/${encodeURIComponent(projectId)}`)
      .then((result) => {
        if (!active) return;
        setDetail(result);
        setError(null);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Proje yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const completed = useMemo(
    () =>
      [...(detail?.generations ?? [])]
        .filter((generation) => generation.status === 'COMPLETED' && generation.outputs.length)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [detail?.generations],
  );
  const activeGeneration = completed[0] ?? null;
  const activeOutput = activeGeneration ? preferredOutput(activeGeneration) : null;
  const imageSource = activeOutput
    ? {
        uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(activeOutput.assetId)}/content`,
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
      }
    : null;

  if (!projectId) {
    return (
      <Screen>
        <AppHeader back title="Proje" />
        <Notice tone="warning">Proje kimliği bulunamadı.</Notice>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        back
        title={detail?.project.title?.trim() || 'Proje ayrıntısı'}
        subtitle={detail ? dateLabel(detail.project.updatedAt) : 'Yükleniyor…'}
      />
      {!detail && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentYellow} />
          <Text style={styles.loadingText}>Projen hazırlanıyor…</Text>
        </View>
      ) : null}
      {error ? (
        <Notice tone="warning" title="Proje açılamadı">
          {error}
        </Notice>
      ) : null}
      {detail && imageSource && activeGeneration && activeOutput ? (
        <>
          <View style={styles.preview}>
            <Image source={imageSource} resizeMode="cover" style={styles.previewImage} />
            <View style={styles.aiBadge}>
              <Icon name="sparkles" size={13} color={colors.accentYellow} />
              <Text style={styles.aiBadgeText}>AI ile oluşturuldu</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/generations/${activeGeneration.id}/edit` as never)}
              style={({ pressed }) => [styles.editAction, pressed && styles.pressed]}
            >
              <Icon name="sparkles" size={23} color="#050505" />
              <Text style={styles.editActionText}>Düzenle</Text>
            </Pressable>
            <IconAction
              name="git-compare-outline"
              label="Önce ve sonra karşılaştır"
              onPress={() =>
                router.push({
                  pathname: '/generations/[id]/compare',
                  params: {
                    id: activeGeneration.id,
                    outputId: activeOutput.id,
                    projectId,
                  },
                } as never)
              }
            />
            <IconAction name="share-outline" label="Paylaş" onPress={() => setShareOpen(true)} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/generations/${activeGeneration.id}/edit` as never)}
            style={({ pressed }) => [styles.aiEditPressable, pressed && styles.pressed]}
          >
            <GlassSurface radius={radii.lg} tone="iridescent" glow contentStyle={styles.aiEditCard}>
              <View style={styles.aiEditIcon}>
                <Icon name="sparkles" size={25} color={colors.accentPurpleSoft} />
              </View>
              <View style={styles.aiEditCopy}>
                <Text style={styles.aiEditTitle}>AI ile düzenle</Text>
                <Text style={styles.aiEditDetail}>
                  Doğal dilde değişiklik iste veya referans ekle
                </Text>
              </View>
              <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
            </GlassSurface>
          </Pressable>
          <Text style={styles.sectionTitle}>Sürüm geçmişi</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.versions}
          >
            {completed.map((generation, index) => {
              const output = preferredOutput(generation);
              return (
                <VisualTile
                  key={generation.id}
                  size="small"
                  title={`Varyasyon ${completed.length - index}`}
                  subtitle={dateLabel(generation.completedAt ?? generation.createdAt)}
                  palette={['#171717', '#050505']}
                  icon="✦"
                  badge={index === 0 ? 'AKTİF' : undefined}
                  imageSource={
                    output
                      ? {
                          uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(output.assetId)}/content`,
                          headers: accessToken
                            ? { authorization: `Bearer ${accessToken}` }
                            : undefined,
                        }
                      : undefined
                  }
                  onPress={() => router.push(`/generations/${generation.id}/results` as never)}
                />
              );
            })}
          </ScrollView>
          <Notice tone="neutral" title="Seçili sonuç">
            Bu sonuç kaydedilebilir ve paylaşılabilir. Her düzenleme ayrı bir sürüm olarak korunur.
          </Notice>
          <ShareSheet
            generationId={activeGeneration.id}
            imageSource={imageSource}
            onClose={() => setShareOpen(false)}
            outputId={activeOutput.id}
            visible={shareOpen}
          />
        </>
      ) : detail ? (
        <Notice tone="neutral" title="Üretim hazırlanıyor">
          Tamamlanan ilk sonuç burada görünecek.
        </Notice>
      ) : null}
    </Screen>
  );
}

function ShareSheet({
  generationId,
  imageSource,
  onClose,
  outputId,
  visible,
}: {
  generationId: string;
  imageSource: { uri: string; headers?: { authorization: string } };
  onClose: () => void;
  outputId: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.shareBackdrop}>
        <Pressable
          accessibilityLabel="Paylaşım penceresini kapat"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.shareSheet}>
          <View style={styles.shareHandle} />
          <View style={styles.shareHeader}>
            <View style={styles.shareHeaderCopy}>
              <Text accessibilityRole="header" style={styles.shareTitle}>
                Kareyi paylaş
              </Text>
              <Text style={styles.shareSubtitle}>Sonucun bu sayfadan ayrılmadan hazır.</Text>
            </View>
            <Pressable
              accessibilityLabel="Paylaşım penceresini kapat"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.shareClose}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.shareScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sharePreview}>
              <Image
                accessibilityLabel="Paylaşılacak seçili AI görseli"
                resizeMode="cover"
                source={imageSource}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sharePreviewBadge}>
                <Icon name="sparkles" size={12} color={colors.accentYellow} />
                <Text style={styles.sharePreviewBadgeText}>Seçili sonuç</Text>
              </View>
            </View>
            <GeneratedSharePanel generationId={generationId} outputId={outputId} ready />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function IconAction({
  name,
  label,
  onPress,
}: {
  name: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
    >
      <Icon name={name} size={23} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  loading: { alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 320 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  preview: {
    aspectRatio: 4 / 5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: { ...StyleSheet.absoluteFill },
  aiBadge: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
    left: 12,
    minHeight: 30,
    paddingHorizontal: 10,
    position: 'absolute',
  },
  aiBadgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  editAction: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: radii.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
  },
  editActionText: { ...typography.h3, color: '#050505' },
  iconAction: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    width: 58,
  },
  aiEditPressable: { marginTop: spacing.md },
  aiEditCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 82,
    padding: 14,
  },
  aiEditIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  aiEditCopy: { flex: 1 },
  aiEditTitle: { ...typography.h3, color: colors.textPrimary },
  aiEditDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  versions: { gap: 10, paddingBottom: spacing.md, paddingRight: spacing.lg },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  shareBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.74)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  shareSheet: {
    backgroundColor: '#0D0D0F',
    borderColor: 'rgba(255,196,0,0.24)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  shareHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 4,
    marginTop: 10,
    width: 44,
  },
  shareHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  shareHeaderCopy: { flex: 1 },
  shareTitle: { ...typography.h3, color: colors.textPrimary },
  shareSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  shareClose: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  shareScroll: { gap: spacing.md, paddingBottom: 34 },
  sharePreview: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sharePreviewBadge: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
    left: 10,
    minHeight: 28,
    paddingHorizontal: 9,
    position: 'absolute',
  },
  sharePreviewBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
