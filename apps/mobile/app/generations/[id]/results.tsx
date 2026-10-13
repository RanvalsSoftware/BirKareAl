import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '@/components';
import { apiBaseUrl, apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { resetCreateFlow } from '@/features/create/createFlow';
import { resetProductStudioFlow } from '@/features/studio/productFlow';
import { useCopy } from '@/features/settings/language-store';
import { shareAspectRatio } from '@/features/sharing/output';
import { brand } from '@/theme/brand';
import {
  BackNav,
  Group,
  Hint,
  InfoNote,
  Page,
  PageTitle,
  PrimaryAction,
  Row,
  SecondaryAction,
  Separator,
  Split,
} from '@/ui/kit';
import {
  createContentReportInput,
  newSupportSubmissionKey,
  submitSupportTicket,
  type SupportTicketReceipt,
} from '@/features/support/tickets';
import { colors, radii, spacing, typography } from '@/theme';

const variants = [
  {
    id: 'a',
    label: translateCopy('Varyasyon 1'),
    palette: ['#68541D', '#CA8D24'] as const,
    icon: '✦',
  },
  {
    id: 'b',
    label: translateCopy('Varyasyon 2'),
    palette: ['#1A5264', '#A77535'] as const,
    icon: '◈',
  },
  {
    id: 'c',
    label: translateCopy('Varyasyon 3'),
    palette: ['#5C2148', '#CEB981'] as const,
    icon: '◌',
  },
  {
    id: 'd',
    label: translateCopy('Varyasyon 4'),
    palette: ['#5C4F2D', '#213A6B'] as const,
    icon: '✧',
  },
];

const MAX_PREVIEW_HEIGHT = 460;

type GenerationOutput = {
  id: string;
  selected: boolean;
  variantIndex: number;
  asset: { accessUrl: string | null } | null;
};

type ResultGeneration = {
  id: string;
  projectId: string;
  status: string;
  aspectRatio: string;
  outputs: GenerationOutput[];
};
type ProjectModeResponse = { project: { mode: string } };

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
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const { id: rawGenerationId } = useLocalSearchParams<{ id?: string }>();
  const generationId = Array.isArray(rawGenerationId) ? rawGenerationId[0] : rawGenerationId;
  const accessToken = useAuthStore((store) => store.accessToken);
  const userId = useAuthStore((store) => store.user?.id);
  const [selectedId, setSelectedId] = useState('');
  const requestScope = `${userId}:${generationId}`;
  const [loadedGeneration, setGeneration] = useState<
    (ResultGeneration & { requestScope: string }) | null
  >(null);
  const generation = loadedGeneration?.requestScope === requestScope ? loadedGeneration : null;
  const [projectMode, setProjectMode] = useState<{
    requestScope: string;
    mode: string;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportReceipt, setReportReceipt] = useState<SupportTicketReceipt | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const reportAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const invalidGenerationError =
    !generationId || generationId === 'demo'
      ? translateCopy('Geçerli bir üretim kaydı bulunamadı.')
      : null;
  const isProductProject =
    projectMode !== null &&
    projectMode.requestScope === requestScope &&
    projectMode.mode === 'PRODUCT_STUDIO';
  const serverVariants = useMemo<DisplayVariant[]>(
    () =>
      (generation?.outputs ?? [])
        .filter((output) => Boolean(output.asset?.accessUrl))
        .map((output, index) => ({
          id: output.id,
          label: translateCopy('Varyasyon {{p0}}', { p0: output.variantIndex + 1 }),
          palette: variants[index % variants.length]?.palette ?? variants[0].palette,
          icon: variants[index % variants.length]?.icon ?? '✦',
          sourceUrl: output.asset?.accessUrl,
          serverOutput: true,
        })),
    [generation, languageRevision],
  );
  const displayVariants = serverVariants;
  const preferredVariantId = generation?.outputs.find((output) => output.selected)?.id;
  const selected =
    displayVariants.find((variant) => variant.id === selectedId)?.id ??
    displayVariants.find((variant) => variant.id === preferredVariantId)?.id ??
    displayVariants[0]?.id ??
    '';
  const selectedVariant =
    displayVariants.find((item) => item.id === selected) ?? displayVariants[0];
  const sourceUrl = selectedVariant?.sourceUrl;
  const imageUri = sourceUrl?.startsWith('/') ? `${apiBaseUrl}${sourceUrl}` : sourceUrl;
  const imageHeaders =
    sourceUrl?.startsWith('/') && accessToken
      ? { authorization: `Bearer ${accessToken}` }
      : undefined;
  const displayGenerationError = invalidGenerationError ?? generationError;
  const copy = useCopy();
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [columnWidth, setColumnWidth] = useState(0);
  useEffect(() => {
    if (!generationId || generationId === 'demo') return;
    let active = true;
    void (async () => {
      try {
        const result = await apiRequest<ResultGeneration>(
          `/v1/generations/${encodeURIComponent(generationId)}`,
        );
        let mode = 'UNKNOWN';
        try {
          const projectResult = await apiRequest<ProjectModeResponse>(
            `/v1/projects/${encodeURIComponent(result.projectId)}`,
          );
          mode = projectResult.project.mode;
        } catch {
          // Real generation results can still be shown if independent project
          // metadata is temporarily unavailable; generic copy is the safe fallback.
        }
        if (!active) return;
        setGeneration({ ...result, requestScope });
        setProjectMode({ requestScope, mode });
        setGenerationError(null);
      } catch (error) {
        if (active)
          setGenerationError(
            error instanceof Error ? error.message : translateCopy('Sonuçlar yüklenemedi.'),
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [generationId, requestScope]);

  useEffect(() => {
    // A new account/generation must never inherit another report draft or receipt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportOpen(false);
    setReportReason(null);
    setReportDetail('');
    setReportReceipt(null);
    setReportError(null);
    setReportSending(false);
    reportAttempt.current = null;
  }, [requestScope]);

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
      setSelectionError(
        error instanceof Error ? error.message : translateCopy('Varyasyon seçilemedi.'),
      );
    }
  };

  const submitReport = async () => {
    if (!reportReason || reportSending) return;
    if (!generationId || generationId === 'demo') {
      setReportError(translateCopy('Sunucuda kayıtlı olmayan bir önizleme raporlanamaz.'));
      return;
    }
    const input = createContentReportInput({
      generationId,
      outputId: selectedVariant?.serverOutput ? selected : undefined,
      reason: reportReason,
      detail: reportDetail,
    });
    const fingerprint = JSON.stringify(input);
    if (reportAttempt.current?.fingerprint !== fingerprint) {
      reportAttempt.current = { fingerprint, key: newSupportSubmissionKey() };
    }
    setReportSending(true);
    setReportError(null);
    try {
      const receipt = await submitSupportTicket(input, reportAttempt.current.key);
      setReportReceipt(receipt);
      setReportOpen(false);
      setReportReason(null);
      setReportDetail('');
      reportAttempt.current = null;
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : translateCopy('Rapor gönderilemedi. Lütfen tekrar dene.'),
      );
    } finally {
      setReportSending(false);
    }
  };

  const closeReport = () => {
    setReportOpen(false);
    setReportReason(null);
    setReportDetail('');
    setReportError(null);
  };

  const ready = Boolean(
    generationId && generation?.status === 'COMPLETED' && imageUri && selectedVariant,
  );
  const aspect = imageRatio ?? shareAspectRatio(generation?.aspectRatio);
  // Bound the height so the actions stay on screen, and keep the picture's own shape.
  const previewWidth = Math.min(columnWidth, MAX_PREVIEW_HEIGHT * aspect);
  const variantSource = (variant: DisplayVariant) => ({
    uri: variant.sourceUrl!.startsWith('/')
      ? `${apiBaseUrl}${variant.sourceUrl}`
      : variant.sourceUrl!,
    headers:
      variant.sourceUrl!.startsWith('/') && accessToken
        ? { authorization: `Bearer ${accessToken}` }
        : undefined,
  });
  const openExport = () =>
    router.push({
      pathname: '/generations/[id]/export',
      params: { id: generationId, outputId: selected },
    } as never);

  return (
    <Page width="workspace">
      <BackNav label={copy('Geri', 'Back')} />
      <PageTitle
        subtitle={
          ready
            ? copy(
                `${displayVariants.length} alternatif hazır. Beğendiğini seç.`,
                displayVariants.length === 1
                  ? '1 alternative is ready.'
                  : `${displayVariants.length} alternatives are ready. Pick the one you like.`,
              )
            : undefined
        }
        title={translateCopy(isProductProject ? 'Ürün alternatifleri' : 'Sonuçlar')}
      />
      <Split
        leading={
          <>
            {imageUri && selectedVariant ? (
              <View
                onLayout={(event) => setColumnWidth(event.nativeEvent.layout.width)}
                style={styles.previewWrap}
              >
                <View
                  style={[styles.preview, { height: previewWidth / aspect, width: previewWidth }]}
                >
                  <Image
                    accessibilityLabel={translateCopy('{{p0}} AI üretim sonucu', {
                      p0: selectedVariant.label,
                    })}
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      if (width > 0 && height > 0) setImageRatio(width / height);
                    }}
                    resizeMode="cover"
                    source={{ uri: imageUri, headers: imageHeaders }}
                    style={styles.fill}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.state}>
                {displayGenerationError ? (
                  <Icon name="cloud-offline-outline" size={32} color={brand.warning} />
                ) : generation && generation.status !== 'COMPLETED' ? (
                  <ActivityIndicator color={brand.gold} />
                ) : (
                  <Icon name="images-outline" size={32} color={brand.textMuted} />
                )}
                <Text style={styles.stateTitle}>
                  {displayGenerationError
                    ? translateCopy('Sonuç yüklenemedi')
                    : generation && generation.status !== 'COMPLETED'
                      ? translateCopy('Üretim tamamlanıyor')
                      : translateCopy('Tamamlanmış çıktı bulunamadı')}
                </Text>
                <Text style={styles.stateDetail}>
                  {displayGenerationError ??
                    (generation && generation.status !== 'COMPLETED'
                      ? translateCopy('Gerçek çıktılar hazır olduğunda bu ekranda görünecek.')
                      : translateCopy('Bu üretimde indirilebilir bir görsel yok.'))}
                </Text>
              </View>
            )}

            {displayVariants.length > 1 ? (
              <View accessibilityRole="radiogroup" style={styles.variants}>
                {displayVariants.map((variant, index) => {
                  const on = selected === variant.id;
                  return (
                    <Pressable
                      accessibilityLabel={variant.label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      key={variant.id}
                      onPress={() => void chooseVariant(variant)}
                      style={({ pressed }) => [styles.variant, pressed && styles.pressed]}
                    >
                      <View style={[styles.variantImage, on && styles.variantImageOn]}>
                        <Image
                          resizeMode="cover"
                          source={variantSource(variant)}
                          style={styles.fill}
                        />
                      </View>
                      <Text style={[styles.variantLabel, on && styles.variantLabelOn]}>
                        {index + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {selectionError ? (
              <InfoNote
                icon="alert-circle-outline"
                title={translateCopy('Seçim kaydedilemedi')}
                tone="warning"
              >
                {selectionError}
              </InfoNote>
            ) : null}
          </>
        }
        leadingFlex={5}
        trailing={
          <>
            {ready ? (
              <>
                <PrimaryAction
                  icon="download-outline"
                  label={translateCopy('Kaydet ve paylaş')}
                  onPress={openExport}
                />
                <Group>
                  <Row
                    icon="create-outline"
                    onPress={() => router.push(`/generations/${generationId}/edit` as never)}
                    title={copy('Görseli düzenle', 'Edit the image')}
                  />
                  <Separator />
                  <Row
                    icon="git-compare-outline"
                    onPress={() => router.push(`/generations/${generationId}/compare` as never)}
                    title={copy('Önce ve sonra', 'Before and after')}
                  />
                  {isProductProject ? (
                    <>
                      <Separator />
                      <Row
                        detail="1:1 · 4:5 · 9:16 · 16:9"
                        icon="albums-outline"
                        onPress={() =>
                          router.push({
                            pathname: '/generations/[id]/formats',
                            params: { id: generationId, outputId: selected },
                          } as never)
                        }
                        title={copy('Satış formatlarını dışa aktar', 'Export sales formats')}
                      />
                      {generation?.projectId ? (
                        <>
                          <Separator />
                          <Row
                            detail={copy('Fiyat ve ilan metni', 'Price and listing text')}
                            icon="pricetag-outline"
                            onPress={() =>
                              router.push(`/projects/${generation.projectId}` as never)
                            }
                            title={copy('Ürün sayfası', 'Product page')}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </Group>
                <Hint>
                  {copy(
                    'Görseller yapay zekâ ile üretildi. Yayımlamadan önce ürününe uygunluğunu kontrol et.',
                    'These images were generated with AI. Check them against your product before publishing.',
                  )}
                </Hint>
              </>
            ) : null}
            {reportReceipt ? (
              <InfoNote icon="checkmark-circle-outline" title={translateCopy('Raporun gönderildi')}>
                {translateCopy('İçerik güvenli inceleme için kaydedildi. Talep numaran: {{p0}}', {
                  p0: reportReceipt.id,
                })}
              </InfoNote>
            ) : null}
            <SecondaryAction
              accessibilityHint={translateCopy(
                isProductProject
                  ? 'Yeni bir ürün projesi başlatır'
                  : 'Yeni bir üretime en baştan başlar',
              )}
              icon="add"
              label={translateCopy(isProductProject ? 'Yeni ürün projesi' : 'Yeni oluştur')}
              onPress={() => {
                if (isProductProject) {
                  resetProductStudioFlow();
                  router.dismissTo('/studio/product' as never);
                  return;
                }
                resetCreateFlow();
                router.dismissTo('/create' as never);
              }}
            />
            {generationId && selectedVariant?.serverOutput ? (
              <Pressable
                accessibilityLabel={translateCopy('Bu içeriği raporla')}
                accessibilityRole="button"
                onPress={() => {
                  setReportError(null);
                  setReportOpen(true);
                }}
                style={({ pressed }) => [styles.report, pressed && styles.pressed]}
              >
                <Text style={styles.reportText}>{translateCopy('Raporla')}</Text>
              </Pressable>
            ) : null}
          </>
        }
        trailingFlex={6}
      />
      <ReportModal
        detail={reportDetail}
        onChangeDetail={setReportDetail}
        onClose={closeReport}
        onSelectReason={setReportReason}
        onSubmit={() => void submitReport()}
        reason={reportReason}
        error={reportError}
        sending={reportSending}
        visible={reportOpen}
      />
    </Page>
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
  error,
  sending,
}: {
  visible: boolean;
  reason: string | null;
  detail: string;
  onSelectReason: (reason: string) => void;
  onChangeDetail: (detail: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string | null;
  sending: boolean;
}) {
  const languageRevision = useLanguageRevision();

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
          accessibilityLabel={translateCopy('Rapor penceresini kapat')}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={12}
          style={styles.modalKeyboard}
        >
          <ScrollView
            contentContainerStyle={styles.modalSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.modalSheet}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text accessibilityRole="header" style={styles.modalTitle}>
                  {translateCopy('İçeriği raporla')}
                </Text>
                <Text style={styles.modalIntro}>
                  {translateCopy(
                    'Rapor nedenini seç. İnceleme için yalnızca gerekli bilgileri paylaş.',
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translateCopy('Rapor penceresini kapat')}
                hitSlop={8}
                onPress={onClose}
                style={styles.modalClose}
              >
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.reportReasons}>
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
                  <Text style={styles.reportReasonText}>{translateCopy(item)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.reportDetailLabel}>
              {translateCopy('Ek açıklama')}{' '}
              <Text style={styles.reportOptional}>{translateCopy('opsiyonel')}</Text>
            </Text>
            <TextInput
              accessibilityLabel={translateCopy('Rapor için ek açıklama')}
              maxLength={500}
              multiline
              numberOfLines={3}
              onChangeText={onChangeDetail}
              placeholder={translateCopy('İncelemeye yardımcı olabilecek kısa bir açıklama yaz.')}
              placeholderTextColor={colors.textMuted}
              style={styles.reportDetailInput}
              textAlignVertical="top"
              value={detail}
            />
            <Text style={styles.reportCount}>{detail.length} / 500</Text>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.reportError}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !reason || sending, busy: sending }}
              disabled={!reason || sending}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.reportSubmit,
                (!reason || sending) && styles.reportSubmitDisabled,
                pressed && reason && !sending && styles.pressed,
              ]}
            >
              <Text style={styles.reportSubmitText}>
                {sending ? translateCopy('Rapor gönderiliyor…') : translateCopy('Raporu gönder')}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center', width: '100%' },
  preview: { backgroundColor: brand.surface, borderRadius: 20, overflow: 'hidden' },
  fill: { height: '100%', width: '100%' },
  state: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 20,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  stateTitle: { color: brand.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  stateDetail: { color: brand.textSecondary, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  variant: { alignItems: 'center', gap: 4 },
  variantImage: {
    backgroundColor: brand.surface,
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    height: 84,
    overflow: 'hidden',
    width: 68,
  },
  variantImageOn: { borderColor: brand.gold },
  variantLabel: { color: brand.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  variantLabelOn: { color: brand.gold, fontWeight: '600' },
  report: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  reportText: { color: brand.danger, fontSize: 15 },
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
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxHeight: 640,
    minHeight: 320,
    overflow: 'hidden',
    position: 'relative',
    marginTop: spacing.sm,
    width: '100%',
  },
  resultState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 280,
    padding: spacing.xl,
  },
  resultStateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultStateDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: spacing.xs,
    maxWidth: 330,
    textAlign: 'center',
  },
  generatedImage: { ...StyleSheet.absoluteFill, backgroundColor: '#080B09' },
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
  aiTagText: { ...typography.caption, fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
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
  newCreateAction: { marginTop: spacing.xl },
  pressed: { opacity: 0.78 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  modalKeyboard: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    maxWidth: 680,
    width: '100%',
  },
  modalSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '86%',
    overflow: 'hidden',
  },
  modalSheetContent: {
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
    borderColor: colors.border,
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
  reportError: { ...typography.caption, color: colors.danger, lineHeight: 18, marginTop: 8 },
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
