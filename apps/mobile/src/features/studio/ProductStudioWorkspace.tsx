import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, UploadTile } from '@/components';
import { CREDIT_WALLET_QUERY_KEY } from '@/features/billing/use-wallet';
import { createSubmissionKey } from '@/features/create/server';
import { useCopy } from '@/features/settings/language-store';
import { useLanguageRevision } from '@/i18n/use-language';
import { commerceGoals, commerceGoalById } from './commerceGoals';
import {
  quoteProductStudioFlow,
  startProductStudioGeneration,
  studioSubmissionLabels,
  type StudioQuote,
  type StudioSubmissionStage,
} from './productServer';
import { StudioSubmissionProgress } from './StudioSubmissionProgress';
import {
  useProductStudioFlow,
  type StudioAspectRatio,
  type StudioCommerceGoal,
  type ProductStudioFlow,
  type StudioImageCount,
  type StudioQuality,
} from './productFlow';
import { useProductStudioCatalog } from './useProductStudioCatalog';
import { useStudioImagePicker } from './useStudioImagePicker';

type ProductStudioWorkspaceProps = { entry?: string };

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  imageSource?: ImageSourcePropType;
};

const formatOptions: readonly {
  ratio: StudioAspectRatio;
  titleTr: string;
  titleEn: string;
  detailTr: string;
  detailEn: string;
}[] = [
  {
    ratio: '1:1',
    titleTr: 'Kare',
    titleEn: 'Square',
    detailTr: 'Katalog ve mağaza',
    detailEn: 'Catalog and store',
  },
  {
    ratio: '4:5',
    titleTr: 'Dikey',
    titleEn: 'Portrait',
    detailTr: 'Ürün sayfası ve akış',
    detailEn: 'Product page and feed',
  },
  {
    ratio: '9:16',
    titleTr: 'Hikâye',
    titleEn: 'Story',
    detailTr: 'Tam ekran sosyal',
    detailEn: 'Full-screen social',
  },
  {
    ratio: '16:9',
    titleTr: 'Yatay',
    titleEn: 'Landscape',
    detailTr: 'Web vitrini',
    detailEn: 'Web hero',
  },
] as const;

function validEntry(value: string | undefined): StudioCommerceGoal | null {
  return commerceGoals.some((goal) => goal.id === value) ? (value as StudioCommerceGoal) : null;
}

export function ProductStudioWorkspace({ entry }: ProductStudioWorkspaceProps) {
  useLanguageRevision();
  const copy = useCopy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const tablet = width >= 820;
  const { hdExtraCredits, previewCredits, productCategories, productScenes } =
    useProductStudioCatalog();
  const { flow, set } = useProductStudioFlow();
  const initialGoal = commerceGoalById(validEntry(entry) ?? flow.commerceGoal);
  const [quoteState, setQuoteState] = useState<{
    requestKey: string | null;
    quote: StudioQuote | null;
    error: string | null;
  }>({ requestKey: null, quote: null, error: null });
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [stage, setStage] = useState<StudioSubmissionStage>('CHECKING');
  const startLock = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (!flow.sceneId) {
      set({
        commerceGoal: initialGoal.id,
        sceneId: initialGoal.sceneId,
        aspectRatio: initialGoal.aspectRatio,
      });
    }
  }, [flow.sceneId, initialGoal.aspectRatio, initialGoal.id, initialGoal.sceneId, set]);

  const picker = useStudioImagePicker((image) =>
    set({ primaryUri: image.uri, primaryName: image.name, rightsConfirmed: false }),
  );
  const selectionReady = Boolean(flow.categoryId && flow.sceneId);
  const quoteFlow = useMemo<ProductStudioFlow>(
    () => ({
      mode: flow.mode,
      productTitle: flow.productTitle,
      commerceGoal: flow.commerceGoal,
      numberOfImages: flow.numberOfImages,
      primaryUri: null,
      primaryName: null,
      categoryId: flow.categoryId,
      sceneId: flow.sceneId,
      quality: flow.quality,
      aspectRatio: flow.aspectRatio,
      rightsConfirmed: false,
      userNotes: '',
    }),
    [
      flow.aspectRatio,
      flow.categoryId,
      flow.commerceGoal,
      flow.mode,
      flow.numberOfImages,
      flow.productTitle,
      flow.quality,
      flow.sceneId,
    ],
  );
  const quoteRequestKey = useMemo(
    () =>
      selectionReady
        ? JSON.stringify([
            quoteFlow.categoryId,
            quoteFlow.sceneId,
            quoteFlow.quality,
            quoteFlow.numberOfImages,
            quoteRevision,
          ])
        : null,
    [quoteFlow, quoteRevision, selectionReady],
  );
  const quote = quoteState.requestKey === quoteRequestKey ? quoteState.quote : null;
  const quoteError = quoteState.requestKey === quoteRequestKey ? quoteState.error : null;

  useEffect(() => {
    if (!quoteRequestKey) return;
    let active = true;
    const timeout = setTimeout(() => {
      setQuoteState({ requestKey: quoteRequestKey, quote: null, error: null });
      void quoteProductStudioFlow(quoteFlow)
        .then((value) => {
          if (active) setQuoteState({ requestKey: quoteRequestKey, quote: value, error: null });
        })
        .catch((error) => {
          if (!active) return;
          setQuoteState({
            requestKey: quoteRequestKey,
            quote: null,
            error:
              error instanceof Error
                ? error.message
                : copy('Kredi özeti alınamadı.', 'Could not load the credit quote.'),
          });
        });
    }, 160);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [copy, quoteFlow, quoteRequestKey]);

  const sourceReady = Boolean(flow.primaryUri);
  const titleReady = flow.productTitle.trim().length > 0 && flow.productTitle.trim().length <= 120;
  const canStart = Boolean(
    sourceReady &&
    titleReady &&
    selectionReady &&
    flow.rightsConfirmed &&
    quote?.canGenerate &&
    !starting,
  );
  const flowFingerprint = JSON.stringify(flow);

  function chooseGoal(goalId: StudioCommerceGoal) {
    const goal = commerceGoalById(goalId);
    set({
      commerceGoal: goal.id,
      sceneId: goal.sceneId,
      aspectRatio: goal.aspectRatio,
    });
  }

  function chooseQuality(quality: StudioQuality) {
    set({
      quality,
      ...(quality === 'PREVIEW' && flow.numberOfImages === 4 ? { numberOfImages: 2 as const } : {}),
    });
  }

  async function create() {
    if (!canStart || startLock.current) return;
    startLock.current = true;
    if (attempt.current?.fingerprint !== flowFingerprint)
      attempt.current = { fingerprint: flowFingerprint, key: createSubmissionKey() };
    setStartError(null);
    setStarting(true);
    setStage('CHECKING');
    try {
      const result = await startProductStudioGeneration(flow, {
        idempotencyKey: attempt.current.key,
        onProgress: setStage,
      });
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: CREDIT_WALLET_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      router.replace({
        pathname: '/create/progress',
        params: { generationId: result.generation.generationId },
      } as never);
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : copy('Üretim başlatılamadı.', 'Generation could not be started.'),
      );
    } finally {
      startLock.current = false;
      setStarting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={copy('Geri', 'Back')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/studio' as never)
              }
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Icon name="chevron-back" size={24} color="#EEF5F0" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>
                {copy('Ürün çekimi planı', 'Product shoot plan')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {copy(
                  'Kaynak, kullanım amacı ve çıktılar tek yerde',
                  'Source, intended use, and outputs in one place',
                )}
              </Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{copy('YENİ PROJE', 'NEW PROJECT')}</Text>
            </View>
          </View>

          <View style={[styles.workspace, tablet && styles.workspaceTablet]}>
            <View style={[styles.sourcePane, tablet && styles.sourcePaneTablet]}>
              <SectionHeading
                index="01"
                title={copy('Ürünü tanımla', 'Define the product')}
                detail={copy(
                  'Bu ad katalogda proje başlığı olarak görünür.',
                  'This becomes the project title in your catalog.',
                )}
              />
              <Text style={styles.fieldLabel}>{copy('Ürün adı', 'Product name')}</Text>
              <TextInput
                accessibilityLabel={copy('Ürün adı', 'Product name')}
                maxLength={120}
                onChangeText={(productTitle) => set({ productTitle })}
                placeholder={copy('Örn. Yeni sezon deri çanta', 'e.g. New-season leather bag')}
                placeholderTextColor="#66736B"
                style={styles.titleInput}
                value={flow.productTitle}
              />
              <Text style={styles.inputCounter}>{flow.productTitle.length} / 120</Text>

              <Text style={styles.fieldLabel}>
                {copy('Kaynak ürün fotoğrafı', 'Source product photo')}
              </Text>
              <Text style={styles.fieldHint}>
                {copy(
                  'Ürün tek başına, net ve mümkünse sade bir zeminde görünmeli.',
                  'Use a sharp image with one product, preferably on a simple background.',
                )}
              </Text>
              <UploadTile
                label={
                  picker.busy
                    ? copy('Galeri açılıyor…', 'Opening library…')
                    : copy('Ürün fotoğrafını seç', 'Choose product photo')
                }
                onPress={() => void picker.open()}
                sourceUri={flow.primaryUri}
              />

              <Text style={styles.fieldLabel}>{copy('Ürün kategorisi', 'Product category')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRail}
              >
                {productCategories.map((item) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: flow.categoryId === item.id }}
                    key={item.id}
                    onPress={() => set({ categoryId: item.id })}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      flow.categoryId === item.id && styles.categoryCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    {item.imageSource ? (
                      <Image
                        source={item.imageSource}
                        resizeMode="cover"
                        style={styles.categoryImage}
                      />
                    ) : null}
                    <View style={styles.categoryFooter}>
                      <Text numberOfLines={1} style={styles.categoryTitle}>
                        {item.name}
                      </Text>
                      {flow.categoryId === item.id ? (
                        <Icon name="checkmark-circle" size={17} color="#B8F1CD" />
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.photoChecklist}>
                <Text style={styles.checklistTitle}>
                  {copy('İyi kaynak fotoğrafı', 'A good source photo')}
                </Text>
                {[
                  copy('Ürünün tamamı kadraj içinde', 'The full product is in frame'),
                  copy('Etiket ve kenarlar okunaklı', 'Labels and edges are clear'),
                  copy('Başka ürün veya kişi yok', 'No other product or person'),
                ].map((item) => (
                  <View key={item} style={styles.checklistRow}>
                    <Icon name="checkmark" size={15} color="#B8F1CD" />
                    <Text style={styles.checklistText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.settingsPane, tablet && styles.settingsPaneTablet]}>
              <SectionHeading
                index="02"
                title={copy('Çekimi planla', 'Plan the shoot')}
                detail={copy(
                  'Amaç seçimi yalnızca başlangıç ayarlarını hazırlar.',
                  'The goal only prepares sensible starting settings.',
                )}
              />

              <Text style={styles.fieldLabel}>{copy('Kullanım amacı', 'Intended use')}</Text>
              <View style={styles.goalChoices}>
                {commerceGoals.map((goal) => {
                  const selected = flow.commerceGoal === goal.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={goal.id}
                      onPress={() => chooseGoal(goal.id)}
                      style={({ pressed }) => [
                        styles.goalChoice,
                        selected && styles.goalChoiceSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon name={goal.icon} size={18} color={selected ? '#B8F1CD' : '#8C9891'} />
                      <View style={styles.goalChoiceCopy}>
                        <Text style={[styles.goalChoiceTitle, selected && styles.selectedText]}>
                          {copy(goal.titleTr, goal.titleEn)}
                        </Text>
                        <Text numberOfLines={2} style={styles.goalChoiceDetail}>
                          {copy(goal.descriptionTr, goal.descriptionEn)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>{copy('Çekim sahnesi', 'Shoot scene')}</Text>
              <CatalogRail
                items={productScenes}
                selectedId={flow.sceneId}
                onSelect={(sceneId) => set({ sceneId })}
                creditLabel={copy('kredi', 'credits')}
              />

              <SectionHeading
                index="03"
                title={copy('Çıktıları ayarla', 'Set the outputs')}
                detail={copy(
                  'Oran, kalite ve gerçek alternatif sayısını seç.',
                  'Choose ratio, quality, and the real alternative count.',
                )}
              />

              <Text style={styles.fieldLabel}>{copy('Kanal formatı', 'Channel format')}</Text>
              <View style={styles.optionGrid}>
                {formatOptions.map((option) => (
                  <OptionCard
                    detail={copy(option.detailTr, option.detailEn)}
                    key={option.ratio}
                    label={copy(option.titleTr, option.titleEn)}
                    meta={option.ratio}
                    onPress={() => set({ aspectRatio: option.ratio })}
                    selected={flow.aspectRatio === option.ratio}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>{copy('Kalite', 'Quality')}</Text>
              <View style={styles.threeColumns}>
                <OptionCard
                  detail={copy(`${previewCredits} kredi`, `${previewCredits} credits`)}
                  label={copy('Önizleme', 'Preview')}
                  onPress={() => chooseQuality('PREVIEW')}
                  selected={flow.quality === 'PREVIEW'}
                />
                <OptionCard
                  detail={copy('Sahneye göre', 'Based on scene')}
                  label={copy('Standart', 'Standard')}
                  onPress={() => chooseQuality('STANDARD')}
                  selected={flow.quality === 'STANDARD'}
                />
                <OptionCard
                  detail={copy(`+${hdExtraCredits} kredi`, `+${hdExtraCredits} credits`)}
                  label="HD"
                  onPress={() => chooseQuality('HD')}
                  selected={flow.quality === 'HD'}
                />
              </View>

              <Text style={styles.fieldLabel}>
                {copy('Alternatif sayısı', 'Number of alternatives')}
              </Text>
              <Text style={styles.fieldHint}>
                {copy(
                  'Her alternatif aynı seçili sahne ve ayarlarla ayrı bir sonuçtur.',
                  'Each alternative is a separate result using the same selected scene and settings.',
                )}
              </Text>
              <View style={styles.threeColumns}>
                {([1, 2, 4] as const).map((count) => {
                  const unavailable = flow.quality === 'PREVIEW' && count === 4;
                  return (
                    <OptionCard
                      detail={
                        unavailable
                          ? copy('Önizlemede en fazla 2', 'Preview supports up to 2')
                          : count === 1
                            ? copy('Tek sonuç', 'One result')
                            : copy(`${count} ayrı sonuç`, `${count} separate results`)
                      }
                      disabled={unavailable}
                      key={count}
                      label={String(count)}
                      onPress={() => set({ numberOfImages: count as StudioImageCount })}
                      selected={flow.numberOfImages === count}
                    />
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>
                {copy('Çekim notu (isteğe bağlı)', 'Shoot note (optional)')}
              </Text>
              <TextInput
                accessibilityLabel={copy('Çekim notu', 'Shoot note')}
                maxLength={500}
                multiline
                onChangeText={(userNotes) => set({ userNotes })}
                placeholder={copy(
                  'Örn. Ürün kameranın soluna hafif dönük olsun',
                  'e.g. Turn the product slightly toward camera-left',
                )}
                placeholderTextColor="#66736B"
                style={styles.notesInput}
                textAlignVertical="top"
                value={flow.userNotes}
              />
              <Text style={styles.inputCounter}>{flow.userNotes.length} / 500</Text>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: flow.rightsConfirmed, disabled: !sourceReady }}
                disabled={!sourceReady}
                onPress={() => set({ rightsConfirmed: !flow.rightsConfirmed })}
                style={({ pressed }) => [
                  styles.rights,
                  flow.rightsConfirmed && styles.rightsSelected,
                  !sourceReady && styles.disabled,
                  pressed && sourceReady && styles.pressed,
                ]}
              >
                <View style={[styles.checkbox, flow.rightsConfirmed && styles.checkboxSelected]}>
                  {flow.rightsConfirmed ? (
                    <Icon name="checkmark" size={16} color="#0A2118" />
                  ) : null}
                </View>
                <View style={styles.rightsCopy}>
                  <Text style={styles.rightsTitle}>
                    {copy(
                      'Bu ürün görselini kullanma hakkım var',
                      'I have the right to use this product image',
                    )}
                  </Text>
                  <Text style={styles.rightsDetail}>
                    {copy(
                      'Görselin yapay zekâ ile işlenmesine izin veriyorum.',
                      'I allow this image to be processed with AI.',
                    )}
                  </Text>
                </View>
              </Pressable>

              {quote ? (
                <View style={styles.quoteCard}>
                  <View style={styles.quoteCopy}>
                    <Text style={styles.quoteLabel}>
                      {copy('SUNUCU ONAYLI MALİYET', 'SERVER-CONFIRMED COST')}
                    </Text>
                    <Text style={styles.quoteCost}>
                      {quote.creditCost} {copy('kredi', 'credits')}
                    </Text>
                    <Text style={styles.quoteDetail}>
                      {flow.numberOfImages} {copy('alternatif', 'alternatives')} ·{' '}
                      {flow.aspectRatio} ·{' '}
                      {flow.quality === 'PREVIEW'
                        ? copy('Önizleme', 'Preview')
                        : flow.quality === 'STANDARD'
                          ? copy('Standart', 'Standard')
                          : 'HD'}
                    </Text>
                  </View>
                  <View style={styles.balanceBadge}>
                    <Icon name="flash" size={17} color="#B8F1CD" />
                    <Text style={styles.balanceText}>{quote.availableCredits}</Text>
                  </View>
                </View>
              ) : selectionReady && !quoteError ? (
                <View style={styles.quoteLoading}>
                  <ActivityIndicator color="#B8F1CD" size="small" />
                  <Text style={styles.quoteLoadingText}>
                    {copy('Kredi teklifi hesaplanıyor…', 'Calculating credit quote…')}
                  </Text>
                </View>
              ) : null}

              {quoteError ? (
                <Pressable
                  onPress={() => setQuoteRevision((value) => value + 1)}
                  style={({ pressed }) => [styles.warningCard, pressed && styles.pressed]}
                >
                  <Icon name="warning-outline" size={20} color="#FFB65C" />
                  <View style={styles.warningCopy}>
                    <Text style={styles.warningTitle}>
                      {copy('Kredi özeti alınamadı', 'Could not load quote')}
                    </Text>
                    <Text style={styles.warningDetail}>
                      {quoteError} · {copy('Yeniden dene', 'Tap to retry')}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
              {quote && !quote.canGenerate ? (
                <View style={styles.warningCard}>
                  <Icon name="flash-outline" size={20} color="#FFB65C" />
                  <View style={styles.warningCopy}>
                    <Text style={styles.warningTitle}>
                      {copy('Yetersiz kredi', 'Not enough credits')}
                    </Text>
                    <Text style={styles.warningDetail}>
                      {copy(
                        `Bu plan ${quote.creditCost} kredi gerektiriyor; hesabında ${quote.availableCredits} kredi var.`,
                        `This plan needs ${quote.creditCost} credits; your balance is ${quote.availableCredits}.`,
                      )}
                    </Text>
                  </View>
                </View>
              ) : null}
              {startError ? (
                <View style={styles.warningCard}>
                  <Icon name="alert-circle-outline" size={20} color="#FFB65C" />
                  <View style={styles.warningCopy}>
                    <Text style={styles.warningTitle}>
                      {copy('Üretim başlatılamadı', 'Generation could not start')}
                    </Text>
                    <Text style={styles.warningDetail}>{startError}</Text>
                  </View>
                </View>
              ) : null}
              {starting ? <StudioSubmissionProgress stage={stage} /> : null}

              <View style={styles.submitBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canStart, busy: starting }}
                  disabled={!canStart}
                  onPress={() => void create()}
                  style={({ pressed }) => [
                    styles.submitButton,
                    !canStart && styles.submitButtonDisabled,
                    pressed && canStart && styles.pressed,
                  ]}
                >
                  {starting ? (
                    <ActivityIndicator color="#0A2118" />
                  ) : (
                    <Icon name="sparkles-outline" size={20} color="#0A2118" />
                  )}
                  <Text style={styles.submitText}>
                    {starting
                      ? `${studioSubmissionLabels[stage]}…`
                      : quote
                        ? copy(
                            `Üretimi başlat · ${quote.creditCost} kredi`,
                            `Generate · ${quote.creditCost} credits`,
                          )
                        : copy('Kredi özeti bekleniyor…', 'Waiting for credit quote…')}
                  </Text>
                </Pressable>
                <Text style={styles.submitHint}>
                  {!titleReady
                    ? copy('Ürün adını yaz.', 'Enter a product name.')
                    : !sourceReady
                      ? copy('Kaynak ürün fotoğrafını seç.', 'Choose the source product photo.')
                      : !selectionReady
                        ? copy('Kategori ve sahneyi seç.', 'Choose a category and scene.')
                        : !flow.rightsConfirmed
                          ? copy(
                              'Görsel kullanım hakkını onayla.',
                              'Confirm your right to use the image.',
                            )
                          : copy(
                              'Son maliyet üretimden önce sunucuda tekrar doğrulanır.',
                              'The final cost is revalidated by the server before generation.',
                            )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeading({
  index,
  title,
  detail,
}: {
  index: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIndex}>
        <Text style={styles.sectionIndexText}>{index}</Text>
      </View>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function CatalogRail({
  items,
  selectedId,
  onSelect,
  creditLabel,
}: {
  items: readonly CatalogItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  creditLabel: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sceneRail}
    >
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.sceneCard,
              selected && styles.sceneCardSelected,
              pressed && styles.pressed,
            ]}
          >
            {item.imageSource ? (
              <Image source={item.imageSource} resizeMode="cover" style={styles.sceneImage} />
            ) : null}
            <View style={styles.sceneCredit}>
              <Text style={styles.sceneCreditText}>
                {item.creditCost} {creditLabel}
              </Text>
            </View>
            {selected ? (
              <View style={styles.sceneTick}>
                <Icon name="checkmark" size={14} color="#0A2118" />
              </View>
            ) : null}
            <View style={styles.sceneBody}>
              <Text numberOfLines={1} style={styles.sceneTitle}>
                {item.name}
              </Text>
              <Text numberOfLines={2} style={styles.sceneDescription}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function OptionCard({
  label,
  detail,
  meta,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  detail: string;
  meta?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.optionTitleRow}>
        <Text style={[styles.optionTitle, selected && styles.selectedText]}>{label}</Text>
        {meta ? <Text style={styles.optionMeta}>{meta}</Text> : null}
      </View>
      <Text style={styles.optionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0B0F0D', flex: 1 },
  scrollContent: { paddingBottom: 58, paddingHorizontal: 18, paddingTop: 8 },
  page: { alignSelf: 'center', maxWidth: 1120, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58 },
  backButton: {
    alignItems: 'center',
    borderColor: '#29332E',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#F2F7F4', fontSize: 21, fontWeight: '800' },
  headerSubtitle: { color: '#849088', fontSize: 12, marginTop: 2 },
  stepBadge: {
    backgroundColor: '#1D3026',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stepBadgeText: { color: '#B8F1CD', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  workspace: { gap: 14, marginTop: 18 },
  workspaceTablet: { alignItems: 'flex-start', flexDirection: 'row' },
  sourcePane: {
    backgroundColor: '#111815',
    borderColor: '#28342D',
    borderRadius: 24,
    borderWidth: 1,
    padding: 17,
  },
  sourcePaneTablet: { flex: 0.82, minWidth: 0 },
  settingsPane: {
    backgroundColor: '#111815',
    borderColor: '#28342D',
    borderRadius: 24,
    borderWidth: 1,
    padding: 17,
  },
  settingsPaneTablet: { flex: 1.18, minWidth: 0 },
  sectionHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 11, marginBottom: 18 },
  sectionHeadingCopy: { flex: 1 },
  sectionIndex: {
    alignItems: 'center',
    backgroundColor: '#1C2D25',
    borderRadius: 11,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sectionIndexText: { color: '#B8F1CD', fontSize: 11, fontWeight: '900' },
  sectionTitle: { color: '#EDF4EF', fontSize: 18, fontWeight: '800' },
  sectionDetail: { color: '#839087', fontSize: 12, lineHeight: 17, marginTop: 3 },
  fieldLabel: { color: '#DDE7E1', fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 17 },
  fieldHint: { color: '#7F8C84', fontSize: 12, lineHeight: 17, marginBottom: 9, marginTop: -2 },
  titleInput: {
    backgroundColor: '#0D1310',
    borderColor: '#2B3931',
    borderRadius: 14,
    borderWidth: 1,
    color: '#F1F6F3',
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesInput: {
    backgroundColor: '#0D1310',
    borderColor: '#2B3931',
    borderRadius: 14,
    borderWidth: 1,
    color: '#F1F6F3',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 94,
    padding: 13,
  },
  inputCounter: { color: '#657169', fontSize: 10, marginTop: 5, textAlign: 'right' },
  categoryRail: { gap: 9, paddingRight: 12 },
  categoryCard: {
    backgroundColor: '#0E1411',
    borderColor: '#28342D',
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
    width: 126,
  },
  categoryCardSelected: { borderColor: '#8DDDAC', borderWidth: 2 },
  categoryImage: { height: 92, width: '100%' },
  categoryFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 42,
    paddingHorizontal: 9,
  },
  categoryTitle: { color: '#DDE6E0', flex: 1, fontSize: 12, fontWeight: '700' },
  photoChecklist: {
    backgroundColor: '#0E1511',
    borderColor: '#243129',
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    marginTop: 17,
    padding: 13,
  },
  checklistTitle: { color: '#DDE7E1', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  checklistRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  checklistText: { color: '#87938B', flex: 1, fontSize: 11, lineHeight: 16 },
  goalChoices: { gap: 8 },
  goalChoice: {
    alignItems: 'center',
    backgroundColor: '#0D1310',
    borderColor: '#27342C',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  goalChoiceSelected: { backgroundColor: '#16251D', borderColor: '#72C593' },
  goalChoiceCopy: { flex: 1 },
  goalChoiceTitle: { color: '#CCD5CF', fontSize: 13, fontWeight: '800' },
  goalChoiceDetail: { color: '#77847C', fontSize: 11, lineHeight: 15, marginTop: 2 },
  sceneRail: { gap: 10, paddingRight: 14 },
  sceneCard: {
    backgroundColor: '#0D1310',
    borderColor: '#28342D',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: 150,
  },
  sceneCardSelected: { borderColor: '#8DDDAC', borderWidth: 2 },
  sceneImage: { height: 110, width: '100%' },
  sceneCredit: {
    backgroundColor: 'rgba(8,17,12,0.84)',
    borderRadius: 9,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
    position: 'absolute',
    top: 7,
  },
  sceneCreditText: { color: '#E7F0EA', fontSize: 9, fontWeight: '800' },
  sceneTick: {
    alignItems: 'center',
    backgroundColor: '#B8F1CD',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 24,
  },
  sceneBody: { minHeight: 69, padding: 10 },
  sceneTitle: { color: '#E6EDE8', fontSize: 12, fontWeight: '800' },
  sceneDescription: { color: '#79867E', fontSize: 10, lineHeight: 14, marginTop: 3 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  threeColumns: { flexDirection: 'row', gap: 8 },
  optionCard: {
    backgroundColor: '#0D1310',
    borderColor: '#28342D',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 11,
  },
  optionCardSelected: { backgroundColor: '#16251D', borderColor: '#72C593' },
  optionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-between',
  },
  optionTitle: { color: '#CBD5CF', fontSize: 12, fontWeight: '800' },
  optionMeta: { color: '#B8F1CD', fontSize: 10, fontWeight: '800' },
  optionDetail: { color: '#718078', fontSize: 10, lineHeight: 14, marginTop: 4 },
  selectedText: { color: '#E9F8EF' },
  rights: {
    alignItems: 'flex-start',
    backgroundColor: '#0D1310',
    borderColor: '#29362E',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 17,
    padding: 13,
  },
  rightsSelected: { backgroundColor: '#15251C', borderColor: '#6FC08F' },
  checkbox: {
    alignItems: 'center',
    borderColor: '#66736B',
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxSelected: { backgroundColor: '#B8F1CD', borderColor: '#B8F1CD' },
  rightsCopy: { flex: 1 },
  rightsTitle: { color: '#E1E9E4', fontSize: 12, fontWeight: '800' },
  rightsDetail: { color: '#7C8981', fontSize: 11, lineHeight: 16, marginTop: 3 },
  quoteCard: {
    alignItems: 'center',
    backgroundColor: '#15251C',
    borderColor: '#47755A',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 15,
  },
  quoteCopy: { flex: 1 },
  quoteLabel: { color: '#91BBA0', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  quoteCost: { color: '#F1F7F3', fontSize: 22, fontWeight: '900', marginTop: 3 },
  quoteDetail: { color: '#8EA097', fontSize: 11, marginTop: 3 },
  balanceBadge: {
    alignItems: 'center',
    backgroundColor: '#20382A',
    borderRadius: 99,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  balanceText: { color: '#D9F6E4', fontSize: 13, fontWeight: '800' },
  quoteLoading: {
    alignItems: 'center',
    borderColor: '#28342D',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    padding: 13,
  },
  quoteLoadingText: { color: '#849188', fontSize: 12 },
  warningCard: {
    alignItems: 'flex-start',
    backgroundColor: '#21180D',
    borderColor: '#5B3C19',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 13,
  },
  warningCopy: { flex: 1 },
  warningTitle: { color: '#FFD09A', fontSize: 12, fontWeight: '800' },
  warningDetail: { color: '#BB9D7A', fontSize: 11, lineHeight: 16, marginTop: 2 },
  submitBlock: { marginTop: 17 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#B8F1CD',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  submitButtonDisabled: { backgroundColor: '#344139', opacity: 0.66 },
  submitText: { color: '#0A2118', fontSize: 15, fontWeight: '900' },
  submitHint: { color: '#748178', fontSize: 10, lineHeight: 15, marginTop: 7, textAlign: 'center' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
