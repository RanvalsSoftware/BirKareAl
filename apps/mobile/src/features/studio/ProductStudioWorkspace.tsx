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
import { Ionicons } from '@expo/vector-icons';

import { LowCreditsSheet } from '@/features/billing/LowCreditsSheet';
import { CREDIT_WALLET_QUERY_KEY } from '@/features/billing/use-wallet';
import { createSubmissionKey } from '@/features/create/server';
import { useCopy } from '@/features/settings/language-store';
import { useLanguageRevision } from '@/i18n/use-language';
import { brand } from '@/theme/brand';
import {
  BackNav,
  Group,
  Hint,
  Page,
  PageTitle,
  PrimaryAction,
  SecondaryAction,
  SectionLabel,
  Separator,
  ui,
  useLayout,
} from '@/ui/kit';
import { commerceGoals, commerceGoalById } from './commerceGoals';
import {
  quoteProductStudioFlow,
  startProductStudioGeneration,
  studioSubmissionLabels,
  type StudioQuote,
  type StudioSubmissionStage,
} from './productServer';
import { StudioPreview } from './StudioPreview';
import { StudioSubmissionProgress } from './StudioSubmissionProgress';
import { liftProductSubject } from './subjectLift';
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

type ProductStudioWorkspaceProps = {
  entry?: string;
  /** Signed-out trial: everything works on the device, generating asks for an account. */
  guest?: boolean;
};

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  imageSource?: ImageSourcePropType;
};

const formatOptions: readonly {
  ratio: StudioAspectRatio;
  detailTr: string;
  detailEn: string;
}[] = [
  { ratio: '1:1', detailTr: 'Kare · Katalog ve mağaza', detailEn: 'Square · Catalog and store' },
  {
    ratio: '4:5',
    detailTr: 'Dikey · Ürün sayfası ve akış',
    detailEn: 'Portrait · Product page and feed',
  },
  { ratio: '9:16', detailTr: 'Hikâye · Tam ekran sosyal', detailEn: 'Story · Full-screen social' },
  { ratio: '16:9', detailTr: 'Yatay · Web vitrini', detailEn: 'Landscape · Web hero' },
] as const;

function validEntry(value: string | undefined): StudioCommerceGoal | null {
  return commerceGoals.some((goal) => goal.id === value) ? (value as StudioCommerceGoal) : null;
}

/**
 * The whole shoot on one screen: the live preview stays in view while the
 * product, scene and format are chosen. On a wide window the preview and the
 * summary keep the leading column and the controls scroll beside them.
 */
export function ProductStudioWorkspace({ entry, guest = false }: ProductStudioWorkspaceProps) {
  useLanguageRevision();
  const copy = useCopy();
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [liftingUri, setLiftingUri] = useState<string | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const { wide } = useLayout();
  const { height: windowHeight } = useWindowDimensions();
  const startLock = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const currentSource = useRef<string | null>(flow.primaryUri);

  useEffect(() => {
    if (!flow.sceneId) {
      set({
        commerceGoal: initialGoal.id,
        sceneId: initialGoal.sceneId,
        aspectRatio: initialGoal.aspectRatio,
      });
    }
  }, [flow.sceneId, initialGoal.aspectRatio, initialGoal.id, initialGoal.sceneId, set]);

  const picker = useStudioImagePicker((image) => {
    currentSource.current = image.uri;
    set({
      primaryUri: image.uri,
      primaryName: image.name,
      cutoutUri: null,
      rightsConfirmed: false,
    });
    setLiftingUri(image.uri);
    void liftProductSubject(image.uri).then((cutoutUri) => {
      // A newer photo may have been chosen while this one was being processed.
      if (currentSource.current !== image.uri) return;
      setLiftingUri(null);
      if (cutoutUri) set({ cutoutUri });
    });
  });
  const selectionReady = Boolean(flow.categoryId && flow.sceneId);
  const quoteFlow = useMemo<ProductStudioFlow>(
    () => ({
      mode: flow.mode,
      productTitle: flow.productTitle,
      commerceGoal: flow.commerceGoal,
      numberOfImages: flow.numberOfImages,
      primaryUri: null,
      primaryName: null,
      cutoutUri: null,
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
      selectionReady && !guest
        ? JSON.stringify([
            quoteFlow.categoryId,
            quoteFlow.sceneId,
            quoteFlow.quality,
            quoteFlow.numberOfImages,
            quoteRevision,
          ])
        : null,
    [guest, quoteFlow, quoteRevision, selectionReady],
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
    !guest &&
    sourceReady &&
    titleReady &&
    selectionReady &&
    flow.rightsConfirmed &&
    quote?.canGenerate &&
    !starting,
  );
  const insufficient = Boolean(quote && !quote.canGenerate);
  const flowFingerprint = JSON.stringify(flow);
  const missing = [
    sourceReady ? null : copy('ürün fotoğrafı', 'a product photo'),
    titleReady ? null : copy('ürün adı', 'a product name'),
    flow.categoryId ? null : copy('kategori', 'a category'),
    flow.rightsConfirmed ? null : copy('kullanım hakkı onayı', 'the usage-rights confirmation'),
  ].filter((item): item is string => Boolean(item));

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

  const goal = commerceGoalById(flow.commerceGoal);
  const scene = (productScenes as CatalogItem[]).find((item) => item.id === flow.sceneId);
  const format = formatOptions.find((option) => option.ratio === flow.aspectRatio);
  const qualityLabel =
    flow.quality === 'PREVIEW'
      ? copy('Önizleme', 'Preview')
      : flow.quality === 'STANDARD'
        ? copy('Standart', 'Standard')
        : 'HD';
  const alternativesLabel = (count: number) =>
    copy(`${count} alternatif`, count === 1 ? '1 alternative' : `${count} alternatives`);
  const generateLabel = (count: number) =>
    copy(
      `${count} alternatif üret`,
      count === 1 ? 'Generate 1 alternative' : `Generate ${count} alternatives`,
    );

  const previewBlock = (
    <>
      <StudioPreview
        cutoutUri={flow.cutoutUri}
        maxHeight={wide ? Math.max(240, windowHeight * 0.4) : 320}
        photoUri={flow.primaryUri}
        preparing={liftingUri !== null && liftingUri === flow.primaryUri}
        ratio={flow.aspectRatio}
        sceneId={flow.sceneId}
        sceneSource={scene?.imageSource}
      />
      <View style={styles.sourceActions}>
        <SecondaryAction
          icon="camera-outline"
          label={copy('Fotoğraf çek', 'Take photo')}
          loading={picker.busySource === 'camera'}
          onPress={() => void picker.capture()}
          style={styles.sourceAction}
        />
        <SecondaryAction
          icon="images-outline"
          label={flow.primaryUri ? copy('Değiştir', 'Replace') : copy('Galeriden seç', 'Library')}
          loading={picker.busySource === 'library'}
          onPress={() => void picker.open()}
          style={styles.sourceAction}
        />
      </View>
      {flow.primaryUri ? (
        <Hint>
          {copy(
            'En iyi sonuç için ürün tek başına, bütünüyle ve iyi ışıkta görünmeli.',
            'For the best result the product should appear alone, in full and well lit.',
          )}
        </Hint>
      ) : (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={picker.pickSample}
          style={({ pressed }) => [styles.sampleLink, pressed && styles.pressed]}
        >
          <Text style={styles.sampleLinkText}>
            {copy('Fotoğrafın yok mu? Örnek ürünle dene', 'No photo yet? Try a sample product')}
          </Text>
        </Pressable>
      )}
    </>
  );

  const summaryBlock = (
    <>
      <Group>
        <View style={styles.between}>
          <Text style={styles.summaryTitle}>{copy('Üretim özeti', 'Generation summary')}</Text>
          {quote ? (
            <Text style={styles.summaryCost}>
              {quote.creditCost} {copy('kredi', 'credits')}
            </Text>
          ) : null}
        </View>
        <Hint>
          {alternativesLabel(flow.numberOfImages)} · {scene?.name ?? '—'} · {flow.aspectRatio} ·{' '}
          {qualityLabel}
        </Hint>
        <Separator />
        {guest ? (
          <Hint>
            {copy(
              'Önizleme cihazında çalışır. Görselleri üretmek için ücretsiz bir hesap aç; ilk kredilerin hesabınla birlikte gelir.',
              'The preview runs on your device. Create a free account to render the images; your first credits come with it.',
            )}
          </Hint>
        ) : quote ? (
          quote.canGenerate ? (
            <Hint>
              {copy(
                `Bakiyen: ${quote.availableCredits} kredi. Üretim başladığında ${quote.creditCost} kredi ayrılır.`,
                `Your balance: ${quote.availableCredits} credits. ${quote.creditCost} credits are reserved when generation starts.`,
              )}
            </Hint>
          ) : (
            <SummaryState
              body={copy(
                `Bu plan ${quote.creditCost} kredi gerektiriyor; hesabında ${quote.availableCredits} kredi var.`,
                `This plan needs ${quote.creditCost} credits; your balance is ${quote.availableCredits}.`,
              )}
              title={copy('Yetersiz kredi', 'Not enough credits')}
            />
          )
        ) : quoteError ? (
          <SummaryState
            body={copy(
              'Her alternatif kredi kullanır. Kesin tutarı görüp onaylamadan üretim başlamaz; kredi harcanmaz.',
              'Each alternative uses credits. Nothing starts and no credits are spent until you see and confirm the exact cost.',
            )}
            title={copy('Kredi teklifi alınamadı', 'Could not load the credit quote')}
          />
        ) : selectionReady ? (
          <View style={styles.inlineRow}>
            <ActivityIndicator color={brand.gold} size="small" />
            <Hint>{copy('Kredi teklifi hesaplanıyor…', 'Calculating credit quote…')}</Hint>
          </View>
        ) : (
          <Hint>
            {copy(
              'Kategori seçildiğinde kesin kredi tutarı burada görünür.',
              'The exact credit cost appears here once a category is chosen.',
            )}
          </Hint>
        )}
        {startError ? (
          <SummaryState
            body={startError}
            title={copy('Üretim başlatılamadı', 'Generation could not start')}
          />
        ) : null}
      </Group>

      {starting ? <StudioSubmissionProgress stage={stage} /> : null}
    </>
  );

  const controls = (
    <>
      <View style={styles.field}>
        <SectionLabel>{copy('Ürün adı', 'Product name')}</SectionLabel>
        <TextInput
          accessibilityLabel={copy('Ürün adı', 'Product name')}
          maxLength={120}
          onChangeText={(productTitle) => set({ productTitle })}
          placeholder={copy('Örn. Yeni sezon deri çanta', 'e.g. New-season leather bag')}
          placeholderTextColor={brand.textMuted}
          returnKeyType="done"
          selectionColor={brand.gold}
          style={styles.input}
          value={flow.productTitle}
        />
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Kategori', 'Category')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {productCategories.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              onPress={() => set({ categoryId: item.id })}
              selected={flow.categoryId === item.id}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Nerede kullanacaksın?', 'Where will you use it?')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {commerceGoals.map((item) => (
            <Chip
              key={item.id}
              label={copy(item.titleTr, item.titleEn)}
              onPress={() => chooseGoal(item.id)}
              selected={flow.commerceGoal === item.id}
            />
          ))}
        </View>
        <Hint>{copy(goal.descriptionTr, goal.descriptionEn)}</Hint>
      </View>

      <View style={styles.field}>
        <SectionLabel trailing={scene?.name}>{copy('Sahne', 'Scene')}</SectionLabel>
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={wide ? styles.sceneRailWide : styles.sceneRail}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={wide ? undefined : styles.bleed}
        >
          {(productScenes as CatalogItem[]).map((item) => {
            const selected = flow.sceneId === item.id;
            return (
              <Pressable
                accessibilityLabel={item.name}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item.id}
                onPress={() => set({ sceneId: item.id })}
                style={({ pressed }) => [styles.sceneTile, pressed && styles.pressed]}
              >
                <View style={[styles.sceneImage, selected && styles.selectedBorder]}>
                  {item.imageSource ? (
                    <Image resizeMode="cover" source={item.imageSource} style={styles.fillImage} />
                  ) : null}
                </View>
                <Text numberOfLines={1} style={[styles.sceneName, selected && styles.sceneNameOn]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Format', 'Format')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.segments}>
          {formatOptions.map((option) => (
            <Chip
              fill
              key={option.ratio}
              label={option.ratio}
              onPress={() => set({ aspectRatio: option.ratio })}
              selected={flow.aspectRatio === option.ratio}
            />
          ))}
        </View>
        {format ? <Hint>{copy(format.detailTr, format.detailEn)}</Hint> : null}
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Kalite', 'Quality')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.segments}>
          <Chip
            fill
            label={copy('Önizleme', 'Preview')}
            onPress={() => chooseQuality('PREVIEW')}
            selected={flow.quality === 'PREVIEW'}
          />
          <Chip
            fill
            label={copy('Standart', 'Standard')}
            onPress={() => chooseQuality('STANDARD')}
            selected={flow.quality === 'STANDARD'}
          />
          <Chip
            fill
            label="HD"
            onPress={() => chooseQuality('HD')}
            selected={flow.quality === 'HD'}
          />
        </View>
        <Hint>
          {copy(
            `Önizleme ${previewCredits} kredi · HD için alternatif başına +${hdExtraCredits} kredi.`,
            `Preview costs ${previewCredits} credits · HD adds ${hdExtraCredits} credits per alternative.`,
          )}
        </Hint>
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Kaç alternatif üretelim?', 'How many alternatives?')}</SectionLabel>
        <View accessibilityRole="radiogroup" style={styles.segments}>
          {[1, 2, 4].map((count) => {
            const unavailable = flow.quality === 'PREVIEW' && count === 4;
            return (
              <Chip
                disabled={unavailable}
                fill
                key={count}
                label={String(count)}
                accessibilityLabel={alternativesLabel(count)}
                onPress={() => set({ numberOfImages: count as StudioImageCount })}
                selected={flow.numberOfImages === count}
              />
            );
          })}
        </View>
        {flow.quality === 'PREVIEW' ? (
          <Hint>
            {copy('Önizlemede en fazla 2 alternatif.', 'Preview supports up to 2 alternatives.')}
          </Hint>
        ) : null}
      </View>

      <View style={styles.field}>
        <SectionLabel>{copy('Çekim notu (isteğe bağlı)', 'Shoot note (optional)')}</SectionLabel>
        <TextInput
          accessibilityLabel={copy('Çekim notu', 'Shoot note')}
          maxLength={500}
          multiline
          onChangeText={(userNotes) => set({ userNotes })}
          placeholder={copy('Örn. Etiket okunaklı kalsın', 'e.g. Keep the label readable')}
          placeholderTextColor={brand.textMuted}
          selectionColor={brand.gold}
          style={[styles.input, styles.inputMultiline]}
          value={flow.userNotes}
        />
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: flow.rightsConfirmed, disabled: !sourceReady }}
        disabled={!sourceReady}
        onPress={() => set({ rightsConfirmed: !flow.rightsConfirmed })}
        style={({ pressed }) => [
          styles.rights,
          !sourceReady && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          color={flow.rightsConfirmed ? brand.gold : brand.textMuted}
          name={flow.rightsConfirmed ? 'checkbox' : 'square-outline'}
          size={24}
        />
        <Text style={styles.rightsText}>
          {copy(
            'Bu fotoğrafı kullanma hakkına sahibim ve ürün bana ya da işletmeme ait.',
            'I have the right to use this photo and the product belongs to me or my business.',
          )}
        </Text>
      </Pressable>
    </>
  );

  const header = (
    <>
      <BackNav
        fallback={guest ? '/(auth)/login' : '/(tabs)/home'}
        label={guest ? copy('Giriş', 'Sign in') : copy('Stüdyo', 'Studio')}
      />
      <PageTitle title={copy('Ürün çekimi', 'Product shoot')} />
    </>
  );

  const footer = guest ? (
    <PrimaryAction
      label={copy('Üretmek için ücretsiz hesap aç', 'Create a free account to generate')}
      onPress={() => router.push('/(auth)/register' as never)}
      trailingIcon="arrow-forward"
    />
  ) : (
    <>
      {missing.length && !starting ? (
        <Hint style={styles.missing}>
          {copy(`Eksik: ${missing.join(', ')}`, `Still needed: ${missing.join(', ')}`)}
        </Hint>
      ) : null}
      {quoteError ? (
        <SecondaryAction
          icon="refresh"
          label={copy('Kredi teklifini yenile', 'Refresh credit quote')}
          onPress={() => setQuoteRevision((value) => value + 1)}
        />
      ) : null}
      {quote && insufficient ? (
        <PrimaryAction
          icon="flash"
          label={copy(
            `Kredi al · ${quote.creditCost - quote.availableCredits} kredi eksik`,
            `Get credits · ${quote.creditCost - quote.availableCredits} short`,
          )}
          onPress={() => setCreditsOpen(true)}
        />
      ) : (
        <PrimaryAction
          disabled={!canStart}
          label={
            starting
              ? `${studioSubmissionLabels[stage]}…`
              : quote
                ? `${generateLabel(flow.numberOfImages)} · ${quote.creditCost} ${copy('kredi', 'credits')}`
                : generateLabel(flow.numberOfImages)
          }
          onPress={() => void create()}
        />
      )}
      {quote ? (
        <LowCreditsSheet
          available={quote.availableCredits}
          onClose={() => setCreditsOpen(false)}
          onPurchased={() => {
            setCreditsOpen(false);
            setQuoteRevision((value) => value + 1);
          }}
          required={quote.creditCost}
          visible={creditsOpen && insufficient}
        />
      ) : null}
    </>
  );

  if (wide)
    return (
      <Page edges={['top', 'left', 'right', 'bottom']} scroll={false} width="workspace">
        {header}
        <View style={styles.columns}>
          <ScrollView
            contentContainerStyle={styles.columnContent}
            showsVerticalScrollIndicator={false}
            style={styles.leading}
          >
            {previewBlock}
            {summaryBlock}
            <View style={styles.wideActions}>{footer}</View>
          </ScrollView>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.columnContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.trailing}
          >
            {controls}
          </ScrollView>
        </View>
      </Page>
    );

  return (
    <Page footer={footer} scroll={false} width="workspace">
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.columnContent, styles.narrowContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.narrowScroll}
      >
        {header}
        {previewBlock}
        {controls}
        {summaryBlock}
      </ScrollView>
    </Page>
  );
}

function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  fill = false,
  accessibilityLabel,
}: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  fill?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        fill && styles.chipFill,
        selected && styles.selectedBorder,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {selected ? <Ionicons color={brand.gold} name="checkmark" size={14} /> : null}
      <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryState({ title, body }: { title: string; body: string }) {
  return (
    <View accessibilityRole="alert" style={styles.summaryState}>
      <View style={styles.inlineRow}>
        <Ionicons color={brand.warning} name="alert-circle-outline" size={18} />
        <Text style={styles.summaryStateTitle}>{title}</Text>
      </View>
      <Hint>{body}</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, flexDirection: 'row', gap: 32 },
  leading: { flex: 5 },
  trailing: { flex: 6 },
  wideActions: { gap: 10 },
  narrowScroll: { flex: 1, marginHorizontal: -ui.gutter },
  columnContent: { gap: ui.gap, paddingBottom: 24 },
  narrowContent: { paddingHorizontal: ui.gutter },
  field: { gap: 12 },
  fillImage: { height: '100%', width: '100%' },
  sourceActions: { flexDirection: 'row', gap: 10 },
  sourceAction: { flex: 1 },
  sampleLink: { alignSelf: 'center', minHeight: 28, justifyContent: 'center' },
  sampleLinkText: { color: brand.gold, fontSize: 15 },
  input: {
    backgroundColor: brand.surface,
    borderRadius: 14,
    color: brand.text,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputMultiline: { minHeight: 88, paddingTop: 14, textAlignVertical: 'top' },
  between: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  inlineRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segments: { flexDirection: 'row', gap: 8 },
  chip: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  chipFill: { flex: 1, paddingHorizontal: 6 },
  chipText: { color: brand.text, flexShrink: 1, fontSize: 15 },
  chipTextSelected: { color: brand.gold, fontWeight: '600' },
  selectedBorder: { borderColor: brand.gold },
  bleed: { marginHorizontal: -ui.gutter },
  sceneRail: { gap: 10, paddingHorizontal: ui.gutter },
  sceneRailWide: { gap: 10 },
  sceneTile: { gap: 6, width: 104 },
  sceneImage: {
    aspectRatio: 1,
    backgroundColor: brand.surfaceRaised,
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  sceneName: { color: brand.textSecondary, fontSize: 13, textAlign: 'center' },
  sceneNameOn: { color: brand.gold, fontWeight: '600' },
  rights: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, minHeight: 44 },
  rightsText: { color: brand.textSecondary, flex: 1, fontSize: 15, lineHeight: 20 },
  summaryTitle: { color: brand.text, fontSize: 17, fontWeight: '600' },
  summaryCost: { color: brand.gold, fontSize: 15, fontWeight: '600' },
  summaryState: { gap: 6 },
  summaryStateTitle: { color: brand.text, flex: 1, fontSize: 15, fontWeight: '500' },
  missing: { textAlign: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
});
