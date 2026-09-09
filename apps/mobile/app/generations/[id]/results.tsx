import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  AppHeader,
  Icon,
  Notice,
  PrimaryButton,
  Screen,
  SourcePreview,
  VisualTile,
} from '@/components';
import { apiBaseUrl, apiRequest } from '@/api/client';
import { filters } from '@/constants/catalog';
import { useCreateFlow } from '@/features/create/createFlow';
import { useAuthStore } from '@/features/auth/auth-store';
import { GeneratedSharePanel } from '@/features/sharing/GeneratedSharePanel';
import { colors, radii, spacing, typography } from '@/theme';

const variants = [
  { id: 'a', label: 'Varyasyon 1', palette: ['#341D68', '#CA8D24'] as const, icon: '✦' },
  { id: 'b', label: 'Varyasyon 2', palette: ['#1A5264', '#A77535'] as const, icon: '◈' },
  { id: 'c', label: 'Varyasyon 3', palette: ['#5C2148', '#8B81CE'] as const, icon: '◌' },
  { id: 'd', label: 'Varyasyon 4', palette: ['#485C2D', '#213A6B'] as const, icon: '✧' },
];

type GenerationOutput = {
  id: string;
  selected: boolean;
  variantIndex: number;
  asset: { accessUrl: string | null } | null;
};

type ResultGeneration = {
  id: string;
  status: string;
  outputs: GenerationOutput[];
};

type DisplayVariant = {
  id: string;
  label: string;
  palette: readonly [string, string];
  icon: string;
  sourceUrl?: string | null;
  serverOutput: boolean;
};

const reportReasons = [
  'İzinsiz yüz kullanımı',
  'Aldatıcı veya yanlış bilgi',
  'Uygunsuz veya cinsel içerik',
  'Şiddet veya nefret',
  'Telif ya da marka ihlali',
  'Diğer',
] as const;

export default function GenerationResultsScreen() {
  const router = useRouter();
  const { id: rawGenerationId } = useLocalSearchParams<{ id?: string }>();
  const generationId = Array.isArray(rawGenerationId) ? rawGenerationId[0] : rawGenerationId;
  const { flow } = useCreateFlow();
  const accessToken = useAuthStore((store) => store.accessToken);
  const userId = useAuthStore((store) => store.user?.id);
  const [selectedId, setSelectedId] = useState('a');
  const [favorite, setFavorite] = useState(false);
  const requestScope = `${userId}:${generationId}`;
  const [loadedGeneration, setGeneration] = useState<
    (ResultGeneration & { requestScope: string }) | null
  >(null);
  const generation = loadedGeneration?.requestScope === requestScope ? loadedGeneration : null;
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportPrepared, setReportPrepared] = useState(false);
  const localVariants = useMemo<DisplayVariant[]>(
    () => variants.map((variant) => ({ ...variant, serverOutput: false })),
    [],
  );
  const serverVariants = useMemo<DisplayVariant[]>(
    () =>
      (generation?.outputs ?? [])
        .filter((output) => Boolean(output.asset?.accessUrl))
        .map((output, index) => ({
          id: output.id,
          label: `Varyasyon ${output.variantIndex + 1}`,
          palette: variants[index % variants.length]?.palette ?? variants[0].palette,
          icon: variants[index % variants.length]?.icon ?? '✦',
          sourceUrl: output.asset?.accessUrl,
          serverOutput: true,
        })),
    [generation],
  );
  const displayVariants = serverVariants.length ? serverVariants : localVariants;
  const preferredVariantId = generation?.outputs.find((output) => output.selected)?.id;
  const selected =
    displayVariants.find((variant) => variant.id === selectedId)?.id ??
    displayVariants.find((variant) => variant.id === preferredVariantId)?.id ??
    displayVariants[0]?.id ??
    'a';
  const selectedVariant =
    displayVariants.find((item) => item.id === selected) ?? displayVariants[0];
  const routeGenerationId = generationId ?? 'demo';
  const sourceUrl = selectedVariant?.sourceUrl;
  const imageUri = sourceUrl?.startsWith('/') ? `${apiBaseUrl}${sourceUrl}` : sourceUrl;
  const imageHeaders =
    sourceUrl?.startsWith('/') && accessToken
      ? { authorization: `Bearer ${accessToken}` }
      : undefined;
  const styleName = filters.find((item) => item.id === flow.styleId)?.name ?? 'Doğal Işık';

  useEffect(() => {
    if (!generationId || generationId === 'demo') return;
    let active = true;
    void apiRequest<ResultGeneration>(`/v1/generations/${encodeURIComponent(generationId)}`)
      .then((result) => {
        if (!active) return;
        setGeneration({ ...result, requestScope });
        setGenerationError(null);
      })
      .catch((error) => {
        if (active)
          setGenerationError(error instanceof Error ? error.message : 'Sonuçlar yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [generationId, requestScope]);

  useEffect(() => {
    if (!generationError) return;
    const timeout = setTimeout(() => setGenerationError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [generationError]);

  useEffect(() => {
    if (!selectionError) return;
    const timeout = setTimeout(() => setSelectionError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [selectionError]);

  const chooseVariant = async (variant: DisplayVariant) => {
    setSelectedId(variant.id);
    setSelectionError(null);
    if (!variant.serverOutput || !generationId || generationId === 'demo') return;
    try {
      await apiRequest(`/v1/generations/${encodeURIComponent(generationId)}/select-output`, {
        method: 'POST',
        body: JSON.stringify({ outputId: variant.id }),
      });
      setGeneration((current) =>
        current
          ? {
              ...current,
              outputs: current.outputs.map((output) => ({
                ...output,
                selected: output.id === variant.id,
              })),
            }
          : current,
      );
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : 'Varyasyon seçilemedi.');
    }
  };

  const prepareReport = () => {
    if (!reportReason) return;
    setReportPrepared(true);
    setReportOpen(false);
  };

  const closeReport = () => {
    setReportOpen(false);
    setReportReason(null);
    setReportDetail('');
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        back
        title="Sonuçlar"
        subtitle="Oluşturulan görseller"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onPress={() => setFavorite((value) => !value)}
            style={styles.favorite}
          >
            <Icon
              name={favorite ? 'star' : 'star-outline'}
              size={21}
              color={favorite ? colors.accentYellow : colors.textPrimary}
            />
          </Pressable>
        }
      />
      <View style={styles.mainPreview}>
        {imageUri ? (
          <Image
            accessibilityLabel={`${selectedVariant.label} AI üretim sonucu`}
            source={{ uri: imageUri, headers: imageHeaders }}
            style={styles.generatedImage}
            resizeMode="cover"
          />
        ) : (
          <SourcePreview
            sourceUri={flow.sourceUri}
            label={`${selectedVariant?.label ?? 'Sonuç'} önizlemesi`}
          />
        )}
        {!imageUri ? (
          <LinearGradient
            colors={selectedVariant?.palette ?? variants[0].palette}
            style={styles.previewTint}
          />
        ) : null}
        {!imageUri ? (
          <View style={styles.previewCenter}>
            <Text style={styles.previewGlyph}>{selectedVariant?.icon ?? '✦'}</Text>
            <Text style={styles.previewLabel}>{styleName}</Text>
          </View>
        ) : null}
        <View style={styles.aiTag}>
          <Icon name="sparkles" size={12} color={colors.accentYellow} />
          <Text style={styles.aiTagText}>AI ile oluşturuldu</Text>
        </View>
      </View>
      {generationError ? (
        <Notice tone="warning" title="Sonuçlar sunucudan alınamadı">
          {generationError}
        </Notice>
      ) : null}
      {generation && generation.status !== 'COMPLETED' ? (
        <Notice tone="warning" title="Üretim henüz hazır değil">
          Güvenli sonuçlar tamamlandığında burada gösterilir.
        </Notice>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.variants}
        accessibilityRole="radiogroup"
      >
        {displayVariants.map((variant, index) => (
          <VisualTile
            key={variant.id}
            size="small"
            title={variant.label}
            subtitle={index === 0 ? 'Önerilen' : 'Alternatif'}
            palette={variant.palette}
            icon={variant.icon}
            imageSource={
              variant.sourceUrl
                ? {
                    uri: variant.sourceUrl.startsWith('/')
                      ? `${apiBaseUrl}${variant.sourceUrl}`
                      : variant.sourceUrl,
                    headers:
                      variant.sourceUrl.startsWith('/') && accessToken
                        ? { authorization: `Bearer ${accessToken}` }
                        : undefined,
                  }
                : undefined
            }
            selected={selected === variant.id}
            onPress={() => void chooseVariant(variant)}
          />
        ))}
      </ScrollView>
      {selectionError ? (
        <Notice tone="warning" title="Seçim kaydedilemedi">
          {selectionError}
        </Notice>
      ) : null}
      <View style={styles.actionRow}>
        <PrimaryButton
          label="Düzenle"
          icon="sparkles-outline"
          onPress={() => router.push(`/generations/${routeGenerationId}/edit` as never)}
          style={styles.action}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Önce ve sonra karşılaştır"
          onPress={() => router.push(`/generations/${routeGenerationId}/compare` as never)}
          style={styles.iconAction}
        >
          <Icon name="git-compare-outline" size={21} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dışa aktar ve paylaş"
          onPress={() =>
            router.push({
              pathname: '/generations/[id]/export',
              params: {
                id: routeGenerationId,
                outputId: selectedVariant?.serverOutput ? selected : undefined,
              },
            } as never)
          }
          style={styles.iconAction}
        >
          <Icon name="share-outline" size={21} />
        </Pressable>
      </View>
      <Notice tone="neutral" title="Seçili sonuç">
        Seçtiğin gerçek üretimi mevcut kalitesiyle kaydedebilir ve paylaşabilirsin.
      </Notice>
      <View style={{ marginTop: spacing.lg }}>
        <GeneratedSharePanel
          generationId={routeGenerationId}
          outputId={selectedVariant?.serverOutput ? selected : undefined}
          ready={generation?.status === 'COMPLETED' && Boolean(imageUri)}
        />
      </View>
      <View style={styles.secondaryActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeniden oluştur"
          onPress={() => router.push('/create/review' as never)}
          style={styles.secondary}
        >
          <Icon name="refresh-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.secondaryText}>Yeniden oluştur</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seçili görseli kaydet"
          onPress={() =>
            router.push({
              pathname: '/generations/[id]/export',
              params: {
                id: routeGenerationId,
                outputId: selectedVariant?.serverOutput ? selected : undefined,
              },
            } as never)
          }
          style={styles.secondary}
        >
          <Icon name="download-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.secondaryText}>Kaydet ve paylaş</Text>
        </Pressable>
      </View>
      {reportPrepared ? (
        <Notice tone="success" title="Rapor talebin hazır">
          Seçtiğin neden güvenli inceleme için hazırlandı. Sunucu entegrasyonu etkin olduğunda
          talep, içerik sahibi kontrolleriyle birlikte gönderilir.
        </Notice>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bu içeriği raporla"
        onPress={() => setReportOpen(true)}
        style={({ pressed }) => [styles.reportAction, pressed && styles.pressed]}
      >
        <Icon name="flag-outline" size={18} color={colors.danger} />
        <Text style={styles.reportActionText}>Raporla</Text>
      </Pressable>
      <ReportModal
        detail={reportDetail}
        onChangeDetail={setReportDetail}
        onClose={closeReport}
        onSelectReason={setReportReason}
        onSubmit={prepareReport}
        reason={reportReason}
        visible={reportOpen}
      />
    </Screen>
  );
}

function ReportModal({
  visible,
  reason,
  detail,
  onSelectReason,
  onChangeDetail,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  reason: string | null;
  detail: string;
  onSelectReason: (reason: string) => void;
  onChangeDetail: (detail: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Rapor penceresini kapat"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                İçeriği raporla
              </Text>
              <Text style={styles.modalIntro}>
                Rapor nedenini seç. İnceleme için yalnızca gerekli bilgileri paylaş.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rapor penceresini kapat"
              hitSlop={8}
              onPress={onClose}
              style={styles.modalClose}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.reportReasons}
            showsVerticalScrollIndicator={false}
          >
            {reportReasons.map((item) => (
              <Pressable
                key={item}
                accessibilityLabel={item}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === item }}
                onPress={() => onSelectReason(item)}
                style={({ pressed }) => [
                  styles.reportReason,
                  reason === item && styles.reportReasonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.radio, reason === item && styles.radioSelected]}>
                  {reason === item ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.reportReasonText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.reportDetailLabel}>
            Ek açıklama <Text style={styles.reportOptional}>opsiyonel</Text>
          </Text>
          <TextInput
            accessibilityLabel="Rapor için ek açıklama"
            maxLength={500}
            multiline
            numberOfLines={3}
            onChangeText={onChangeDetail}
            placeholder="İncelemeye yardımcı olabilecek kısa bir açıklama yaz."
            placeholderTextColor={colors.textMuted}
            style={styles.reportDetailInput}
            textAlignVertical="top"
            value={detail}
          />
          <Text style={styles.reportCount}>{detail.length} / 500</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !reason }}
            disabled={!reason}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.reportSubmit,
              !reason && styles.reportSubmitDisabled,
              pressed && reason && styles.pressed,
            ]}
          >
            <Text style={styles.reportSubmitText}>Rapor talebini hazırla</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  favorite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPreview: {
    height: 320,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    marginTop: spacing.sm,
  },
  generatedImage: { ...StyleSheet.absoluteFill },
  previewTint: { ...StyleSheet.absoluteFill, opacity: 0.3 },
  previewCenter: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.46)',
    backgroundColor: 'rgba(0,0,0,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    top: '37%',
    left: '38.5%',
  },
  previewGlyph: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  previewLabel: { ...typography.caption, color: colors.textPrimary, marginTop: 1 },
  aiTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiTagText: { ...typography.caption, fontSize: 10, color: colors.textPrimary, fontWeight: '700' },
  variants: { gap: 10, marginTop: spacing.lg, paddingRight: spacing.lg },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: spacing.lg },
  action: { flex: 1 },
  iconAction: {
    width: 50,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActions: { flexDirection: 'row', gap: 9, marginTop: spacing.md },
  secondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  reportAction: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,90,82,0.32)',
    backgroundColor: 'rgba(255,90,82,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.md,
  },
  reportActionText: { ...typography.label, color: colors.danger },
  pressed: { opacity: 0.78 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '86%',
    paddingHorizontal: spacing.lg,
    paddingBottom: 28,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    height: 4,
    marginTop: 10,
    width: 42,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalIntro: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 280,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reportReasons: { gap: 8, paddingVertical: spacing.md },
  reportReason: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  reportReasonSelected: {
    backgroundColor: colors.accentPurpleSoft,
    borderColor: colors.accentPurple,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioSelected: { borderColor: colors.accentYellow },
  radioDot: { backgroundColor: colors.accentYellow, borderRadius: 5, height: 10, width: 10 },
  reportReasonText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '700',
  },
  reportDetailLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  reportOptional: { color: colors.textMuted, fontWeight: '400' },
  reportDetailInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 78,
    padding: 12,
  },
  reportCount: { ...typography.caption, color: colors.textMuted, marginTop: 5, textAlign: 'right' },
  reportSubmit: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: radii.md,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 50,
  },
  reportSubmitDisabled: { opacity: 0.42 },
  reportSubmitText: { ...typography.label, color: colors.background, fontWeight: '800' },
});
