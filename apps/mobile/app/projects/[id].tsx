import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiBaseUrl, apiRequest } from '@/api/client';
import { AppHeader, Icon, Notice, Screen } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { useAuthStore } from '@/features/auth/auth-store';
import { shareAspectRatio } from '@/features/sharing/output';
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
  if (!value) return translateCopy("Yakın zamanda");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return translateCopy("Yakın zamanda");
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
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
  const accessToken = useAuthStore((store) => store.accessToken);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualImageRatio, setActualImageRatio] = useState<number | null>(null);

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
        setError(reason instanceof Error ? reason.message : translateCopy("Proje yüklenemedi."));
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
    [detail?.generations, languageRevision],
  );
  const activeGeneration = completed[0] ?? null;
  const activeOutput = activeGeneration ? preferredOutput(activeGeneration) : null;
  const imageSource = activeOutput
    ? {
        uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(activeOutput.assetId)}/content`,
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
      }
    : null;
  const previewAspectRatio =
    actualImageRatio && Number.isFinite(actualImageRatio) && actualImageRatio > 0
      ? actualImageRatio
      : shareAspectRatio(detail?.project.aspectRatio);
  const openShare = () => {
    if (!activeGeneration || !activeOutput) return;
    router.push({
      pathname: '/generations/[id]/export',
      params: { id: activeGeneration.id, outputId: activeOutput.id },
    } as never);
  };

  if (!projectId) {
    return (
      <Screen>
        <AppHeader back title={translateCopy("Proje")} />
        <Notice tone="warning">{translateCopy("Proje kimliği bulunamadı.")}</Notice>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        back
        title={detail?.project.title?.trim() || translateCopy("Proje ayrıntısı")}
        subtitle={detail ? dateLabel(detail.project.updatedAt) : translateCopy("Yükleniyor…")}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translateCopy("Proje paylaşım seçenekleri")}
            disabled={!activeOutput}
            onPress={openShare}
            style={({ pressed }) => [
              styles.headerMore,
              !activeOutput && styles.disabled,
              pressed && activeOutput && styles.pressed,
            ]}
          >
            <Icon name="ellipsis-horizontal" size={23} color={colors.textPrimary} />
          </Pressable>
        }
      />
      {!detail && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentYellow} />
          <Text style={styles.loadingText}>{translateCopy("Projen hazırlanıyor…")}</Text>
        </View>
      ) : null}
      {error ? (
        <Notice tone="warning" title={translateCopy("Proje açılamadı")}>
          {error}
        </Notice>
      ) : null}
      {detail && imageSource && activeGeneration && activeOutput ? (
        <>
          <View style={[styles.preview, { aspectRatio: previewAspectRatio }]}>
            <Image
              source={imageSource}
              resizeMode="contain"
              style={styles.previewImage}
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width > 0 && height > 0) setActualImageRatio(width / height);
              }}
            />
            <View style={styles.aiBadge}>
              <Icon name="sparkles" size={13} color={colors.accentYellow} />
              <Text style={styles.aiBadgeText}>{translateCopy("AI ile oluşturuldu")}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/generations/${activeGeneration.id}/edit` as never)}
              style={({ pressed }) => [styles.editAction, pressed && styles.pressed]}
            >
              <Icon name="sparkles" size={23} color="#050505" />
              <Text style={styles.editActionText}>{translateCopy("Düzenle")}</Text>
            </Pressable>
            <IconAction
              name="git-compare-outline"
              label={translateCopy("Önce ve sonra karşılaştır")}
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
            <IconAction name="share-outline" label={translateCopy("Paylaş")} onPress={openShare} />
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
                <Text style={styles.aiEditTitle}>{translateCopy("AI ile düzenle")}</Text>
                <Text style={styles.aiEditDetail}>{translateCopy("Doğal dilde değişiklik iste veya referans ekle")}</Text>
              </View>
              <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
            </GlassSurface>
          </Pressable>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{translateCopy("Sürüm geçmişi")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translateCopy("Tüm sürümleri gör")}
              onPress={() => router.push(`/generations/${activeGeneration.id}/results` as never)}
              style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
            >
              <Text style={styles.seeAllText}>{translateCopy("Tümünü gör")}</Text>
              <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.versions}>
            {completed.slice(0, 4).map((generation, index) => {
              const output = preferredOutput(generation);
              const versionImageSource = output
                ? {
                    uri: `${apiBaseUrl}/v1/assets/${encodeURIComponent(output.assetId)}/content`,
                    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
                  }
                : null;
              return (
                <Pressable
                  key={generation.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Varyasyon ${completed.length - index}`}
                  onPress={() => router.push(`/generations/${generation.id}/results` as never)}
                  style={({ pressed }) => [styles.versionRow, pressed && styles.pressed]}
                >
                  <View style={styles.versionThumb}>
                    {versionImageSource ? (
                      <Image
                        source={versionImageSource}
                        resizeMode="contain"
                        style={styles.versionThumbImage}
                      />
                    ) : (
                      <Icon name="image-outline" size={22} color={colors.textMuted} />
                    )}
                    {index === 0 ? (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>{translateCopy("AKTİF")}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.versionCopy}>
                    <Text style={styles.versionTitle}>{translateCopy("Varyasyon")}{' '}{completed.length - index}
                    </Text>
                    <Text style={styles.versionDate}>
                      {dateLabel(generation.completedAt ?? generation.createdAt)}
                    </Text>
                  </View>
                  <Icon name="ellipsis-horizontal" size={21} color={colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
          <Notice tone="neutral" title={translateCopy("Seçili sonuç")}>{translateCopy("Bu sonuç kaydedilebilir ve paylaşılabilir. Her düzenleme ayrı bir sürüm olarak korunur.")}</Notice>
        </>
      ) : detail ? (
        <Notice tone="neutral" title={translateCopy("Üretim hazırlanıyor")}>{translateCopy("Tamamlanan ilk sonuç burada görünecek.")}</Notice>
      ) : null}
    </Screen>
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
  const languageRevision = useLanguageRevision();

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
  content: { paddingBottom: 46 },
  headerMore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 320 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  preview: {
    width: '100%',
    maxHeight: 680,
    minHeight: 260,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 28,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#070707',
    shadowColor: '#F5C842',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#080808',
  },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editAction: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: radii.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 58,
    shadowColor: '#F5C842',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
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
    minHeight: 58,
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
  sectionHeading: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  seeAll: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  versions: { gap: 9, paddingBottom: spacing.md },
  versionRow: {
    minHeight: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0F0F10',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 9,
  },
  versionThumb: {
    width: 104,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#080808',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  versionThumbImage: { width: '100%', height: '100%', backgroundColor: '#080808' },
  activePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(245,245,245,0.78)',
    justifyContent: 'center',
  },
  activePillText: { ...typography.caption, color: '#161616', fontSize: 9, fontWeight: '900' },
  versionCopy: { flex: 1 },
  versionTitle: { ...typography.h3, color: colors.textPrimary, fontSize: 16 },
  versionDate: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
});
