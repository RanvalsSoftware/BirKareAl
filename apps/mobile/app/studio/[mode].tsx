import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { GlassSurface, Icon, Notice, Screen, UploadTile } from '@/components';
import { CreateHeader, MiniChoice, WizardFooter } from '@/features/create/components';
import { createSubmissionKey } from '@/features/create/server';
import { CREDIT_WALLET_QUERY_KEY } from '@/features/billing/use-wallet';
import {
  quoteStudioFlow,
  startStudioGeneration,
  studioSubmissionLabels,
  type StudioQuote,
  type StudioSubmissionStage,
} from '@/features/studio/server';
import { StudioSubmissionProgress } from '@/features/studio/StudioSubmissionProgress';
import { useStudioFlow, type StudioFlow, type StudioMode } from '@/features/studio/studioFlow';
import { useStudioCatalog } from '@/features/studio/useStudioCatalog';
import { useStudioImagePicker } from '@/features/studio/useStudioImagePicker';
import { colors, radii, spacing, typography } from '@/theme';

type DisplayItem = {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  modelLane: 'FAST' | 'PREMIUM' | null;
  imageSource?: ImageSourcePropType;
  palette: readonly [string, string];
  icon: React.ComponentProps<typeof Icon>['name'];
  swatch?: readonly [string, string];
};

const modeCopy: Record<
  StudioMode,
  { title: string; subtitle: string; primaryLabel: string; primaryHint: string }
> = {
  product: {
    title: 'Ürün & katalog çekimi',
    subtitle: 'Ürünün kimliği ve tasarımı korunur',
    primaryLabel: 'Ürün fotoğrafını seç',
    primaryHint: 'Ürün net, tek ve mümkünse sade zeminde görünmeli.',
  },
  fashion: {
    title: 'Kıyafet deneme',
    subtitle: 'Kişi ve kıyafet iki ayrı kaynak olarak işlenir',
    primaryLabel: 'Kişi fotoğrafını seç',
    primaryHint: 'Yüzün ve vücut duruşunun net göründüğü bir fotoğraf seç.',
  },
  nails: {
    title: 'Tırnak & manikür',
    subtitle: 'Yalnızca tırnak görünümü değiştirilir',
    primaryLabel: 'El fotoğrafını seç',
    primaryHint: 'Parmakların tamamı net ve birbirinden ayrılmış görünmeli.',
  },
};

function parseMode(value: string | string[] | undefined): StudioMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'product' || raw === 'fashion' || raw === 'nails' ? raw : null;
}

function hasSelection(mode: StudioMode, flow: ReturnType<typeof useStudioFlow>['flow']) {
  if (mode === 'product') return Boolean(flow.categoryId && flow.sceneId);
  if (mode === 'fashion') return Boolean(flow.sceneId);
  return Boolean(flow.presetId);
}

export default function StudioModeScreen() {
  const params = useLocalSearchParams<{ entry?: string; mode?: string }>();
  const requestedMode = parseMode(params.mode);
  const entry = Array.isArray(params.entry) ? params.entry[0] : params.entry;
  const isCatalogEntry = requestedMode === 'product' && entry === 'product-catalog';
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    fashionScenes,
    hdExtraCredits,
    nailPresets,
    previewCredits,
    productCategories,
    productScenes,
  } = useStudioCatalog();
  const { flow, reset, set } = useStudioFlow();
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
    if (requestedMode && flow.mode !== requestedMode) reset(requestedMode);
  }, [flow.mode, requestedMode, reset]);

  const primaryPicker = useStudioImagePicker((image) =>
    set({
      primaryUri: image.uri,
      primaryName: image.name,
      rightsConfirmed: false,
    }),
  );
  const secondaryPicker = useStudioImagePicker((image) =>
    set({
      secondaryUri: image.uri,
      secondaryName: image.name,
      rightsConfirmed: false,
    }),
  );

  const selectionReady = requestedMode ? hasSelection(requestedMode, flow) : false;
  const quoteFlow = useMemo<StudioFlow>(
    () => ({
      mode: flow.mode,
      primaryUri: null,
      primaryName: null,
      secondaryUri: null,
      secondaryName: null,
      categoryId: flow.categoryId,
      sceneId: flow.sceneId,
      presetId: flow.presetId,
      quality: flow.quality,
      aspectRatio: '4:5',
      rightsConfirmed: false,
      userNotes: '',
    }),
    [flow.categoryId, flow.mode, flow.presetId, flow.quality, flow.sceneId],
  );
  const quoteRequestKey = useMemo(
    () =>
      requestedMode && quoteFlow.mode === requestedMode && selectionReady
        ? JSON.stringify([quoteFlow, quoteRevision])
        : null,
    [quoteFlow, quoteRevision, requestedMode, selectionReady],
  );
  const quote = quoteState.requestKey === quoteRequestKey ? quoteState.quote : null;
  const quoteError = quoteState.requestKey === quoteRequestKey ? quoteState.error : null;

  useEffect(() => {
    if (!quoteRequestKey) return;
    let active = true;
    const timeout = setTimeout(() => {
      setQuoteState({ requestKey: quoteRequestKey, quote: null, error: null });
      void quoteStudioFlow(quoteFlow)
        .then((value) => {
          if (!active) return;
          setQuoteState({ requestKey: quoteRequestKey, quote: value, error: null });
        })
        .catch((error) => {
          if (!active) return;
          setQuoteState({
            requestKey: quoteRequestKey,
            quote: null,
            error: error instanceof Error ? error.message : 'Kredi özeti alınamadı.',
          });
        });
    }, 140);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [quoteFlow, quoteRequestKey]);

  if (!requestedMode) return <Redirect href="/studio" />;
  if (flow.mode !== requestedMode) return null;

  const copy = modeCopy[requestedMode];
  const sourceReady = Boolean(
    flow.primaryUri && (requestedMode !== 'fashion' || flow.secondaryUri),
  );
  const canStart = Boolean(
    sourceReady && selectionReady && flow.rightsConfirmed && quote?.canGenerate && !starting,
  );
  const flowFingerprint = JSON.stringify(flow);

  async function create() {
    if (!canStart || startLock.current) return;
    startLock.current = true;
    if (attempt.current?.fingerprint !== flowFingerprint)
      attempt.current = { fingerprint: flowFingerprint, key: createSubmissionKey() };
    setStartError(null);
    setStarting(true);
    setStage('CHECKING');
    try {
      const result = await startStudioGeneration(flow, {
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
      setStartError(error instanceof Error ? error.message : 'Üretim başlatılamadı.');
    } finally {
      startLock.current = false;
      setStarting(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader fallback="/studio" title={copy.title} subtitle={copy.subtitle} />

      {requestedMode === 'product' && !isCatalogEntry ? (
        <>
          <SectionLabel index="1" title="Ürün kategorisi" />
          <HorizontalCatalog
            items={productCategories}
            onSelect={(id) => set({ categoryId: id })}
            selectedId={flow.categoryId}
            showCredit={false}
          />
        </>
      ) : null}

      {isCatalogEntry ? (
        <>
          <SectionLabel index="1" title="Çekim sahnesi" />
          <HorizontalCatalog
            items={productScenes}
            onSelect={(id) => set({ sceneId: id })}
            selectedId={flow.sceneId}
          />
        </>
      ) : null}

      <SectionLabel index={requestedMode === 'product' ? '2' : '1'} title="Kaynak görseller" />
      <Text style={styles.sectionHint}>{copy.primaryHint}</Text>
      <UploadTile
        label={primaryPicker.busy ? 'Galeri açılıyor…' : copy.primaryLabel}
        onPress={() => void primaryPicker.open()}
        sourceUri={flow.primaryUri}
      />
      {requestedMode === 'fashion' ? (
        <View style={styles.secondaryUpload}>
          <Text style={styles.secondaryTitle}>Kıyafet görseli</Text>
          <Text style={styles.sectionHint}>
            Desen, renk, kesim, düğme, cep ve kumaş dokusu net görünmeli.
          </Text>
          <UploadTile
            label={secondaryPicker.busy ? 'Galeri açılıyor…' : 'Kıyafet fotoğrafını seç'}
            onPress={() => void secondaryPicker.open()}
            sourceUri={flow.secondaryUri}
          />
        </View>
      ) : null}

      {requestedMode === 'product' && !isCatalogEntry ? (
        <>
          <SectionLabel index="3" title="Çekim sahnesi" />
          <HorizontalCatalog
            items={productScenes}
            onSelect={(id) => set({ sceneId: id })}
            selectedId={flow.sceneId}
          />
        </>
      ) : isCatalogEntry ? (
        <>
          <SectionLabel index="3" title="Ürün kategorisi" />
          <Text style={styles.sectionHint}>
            Yüklediğin ürüne uygun kategoriyi seçerek malzeme ve geometri korumasını güçlendir.
          </Text>
          <HorizontalCatalog
            items={productCategories}
            onSelect={(id) => set({ categoryId: id })}
            selectedId={flow.categoryId}
            showCredit={false}
          />
        </>
      ) : requestedMode === 'fashion' ? (
        <>
          <SectionLabel index="2" title="Kıyafet sahnesi" />
          <HorizontalCatalog
            imageFit="contain"
            items={fashionScenes}
            onSelect={(id) => set({ sceneId: id })}
            selectedId={flow.sceneId}
          />
        </>
      ) : (
        <>
          <SectionLabel index="2" title="Manikür görünümü" />
          <HorizontalCatalog
            items={nailPresets}
            onSelect={(id) => set({ presetId: id })}
            selectedId={flow.presetId}
          />
        </>
      )}

      <SectionLabel index={requestedMode === 'product' ? '4' : '3'} title="Çıktı ayarları" />
      <Text style={styles.fieldTitle}>Kalite</Text>
      <View style={styles.choiceRow}>
        <MiniChoice
          caption={`${previewCredits} kredi`}
          label="Önizleme"
          onPress={() => set({ quality: 'PREVIEW' })}
          selected={flow.quality === 'PREVIEW'}
        />
        <MiniChoice
          caption="Seçime göre"
          label="Standart"
          onPress={() => set({ quality: 'STANDARD' })}
          selected={flow.quality === 'STANDARD'}
        />
        <MiniChoice
          caption={`Standart +${hdExtraCredits}`}
          label="HD"
          onPress={() => set({ quality: 'HD' })}
          selected={flow.quality === 'HD'}
        />
      </View>

      <Text style={styles.fieldTitle}>Kare oranı</Text>
      <View style={styles.choiceRow}>
        {(['1:1', '4:5', '9:16', '16:9'] as const).map((ratio) => (
          <MiniChoice
            key={ratio}
            label={ratio}
            onPress={() => set({ aspectRatio: ratio })}
            selected={flow.aspectRatio === ratio}
          />
        ))}
      </View>

      <Text style={styles.fieldTitle}>Ek not (isteğe bağlı)</Text>
      <TextInput
        accessibilityLabel="Üretim için ek not"
        maxLength={500}
        multiline
        onChangeText={(userNotes) => set({ userNotes })}
        placeholder={
          requestedMode === 'product'
            ? 'Örn. ürün kameranın soluna hafif dönük olsun'
            : requestedMode === 'fashion'
              ? 'Örn. doğal, dik bir duruş kullan'
              : 'Örn. mevcut tırnak uzunluğunu koru'
        }
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
        textAlignVertical="top"
        value={flow.userNotes}
      />
      <Text style={styles.counter}>{flow.userNotes.length} / 500</Text>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: flow.rightsConfirmed, disabled: !sourceReady }}
        disabled={!sourceReady}
        onPress={() => set({ rightsConfirmed: !flow.rightsConfirmed })}
        style={({ pressed }) => [
          styles.rights,
          flow.rightsConfirmed && styles.rightsSelected,
          !sourceReady && styles.rightsDisabled,
          pressed && sourceReady && styles.pressed,
        ]}
      >
        <View style={[styles.checkbox, flow.rightsConfirmed && styles.checkboxSelected]}>
          {flow.rightsConfirmed ? (
            <Icon name="checkmark" size={16} color={colors.background} />
          ) : null}
        </View>
        <View style={styles.rightsCopy}>
          <Text style={styles.rightsTitle}>Bu görselleri kullanma hakkım var</Text>
          <Text style={styles.rightsText}>
            {requestedMode === 'fashion'
              ? 'Kişi ve kıyafet görsellerinin işlenmesi için gerekli izinlere sahibim.'
              : 'Yüklediğim görselin AI ile işlenmesine izin veriyorum.'}
          </Text>
        </View>
      </Pressable>

      {quote ? (
        <GlassSurface contentStyle={styles.quote} glow={false} radius={radii.lg} tone="gold">
          <View>
            <Text style={styles.quoteOverline}>SUNUCU ONAYLI MALİYET</Text>
            <Text style={styles.quoteCost}>{quote.creditCost} kredi</Text>
            <Text style={styles.quoteDetail}>
              {quote.modelLane === 'PREMIUM' ? 'Sunburst hassas üretim' : 'Flare hızlı üretim'} ·{' '}
              {flow.quality === 'HD' ? 'HD' : flow.quality === 'PREVIEW' ? 'Önizleme' : 'Standart'}
            </Text>
          </View>
          <View style={styles.balance}>
            <Icon name="flash" size={17} color={colors.accentYellow} />
            <Text style={styles.balanceText}>{quote.availableCredits}</Text>
          </View>
        </GlassSurface>
      ) : null}

      {quoteError ? (
        <Pressable onPress={() => setQuoteRevision((value) => value + 1)}>
          <Notice title="Kredi özeti alınamadı" tone="warning">
            {quoteError} Yeniden denemek için dokun.
          </Notice>
        </Pressable>
      ) : null}
      {quote && !quote.canGenerate ? (
        <Notice title="Yetersiz kredi" tone="warning">
          Bu seçim {quote.creditCost} kredi gerektiriyor; hesabında {quote.availableCredits} kredi
          var.
        </Notice>
      ) : null}
      {startError ? (
        <Notice title="Üretim başlatılamadı" tone="warning">
          {startError}
        </Notice>
      ) : null}
      <Notice title="Gerçeğine sadık üretim" tone="neutral">
        Model, prompt ve kredi tutarı yalnızca sunucudaki doğrulanmış seçime göre belirlenir.
        Serbest notun ürün kimliği, anatomi veya güvenlik kurallarını değiştiremez.
      </Notice>
      {starting ? <StudioSubmissionProgress stage={stage} /> : null}
      <WizardFooter
        disabled={!canStart}
        hint={
          !sourceReady
            ? requestedMode === 'fashion'
              ? 'Kişi ve kıyafet görselini seç.'
              : 'Kaynak görselini seç.'
            : !selectionReady
              ? 'Kategori ve görünüm seçimini tamamla.'
              : !flow.rightsConfirmed
                ? 'Görsel kullanım hakkını onayla.'
                : 'Kredi rezervasyonu API tarafından son kez doğrulanır.'
        }
        label={
          starting
            ? `${studioSubmissionLabels[stage]}…`
            : quote
              ? `Oluştur · ${quote.creditCost} kredi`
              : 'Kredi özeti bekleniyor…'
        }
        loading={starting}
        onPress={() => void create()}
      />
    </Screen>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionIndex}>
        <Text style={styles.sectionIndexText}>{index}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function HorizontalCatalog({
  items,
  selectedId,
  onSelect,
  imageFit = 'cover',
  showCredit = true,
}: {
  items: readonly DisplayItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  imageFit?: 'contain' | 'cover';
  showCredit?: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.rail}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            accessibilityLabel={
              showCredit
                ? `${item.name}, ${item.creditCost} kredi`
                : `${item.name}, ürün kategorisi`
            }
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.catalogCard,
              selected && styles.catalogCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.catalogVisual}>
              <LinearGradient colors={item.palette} style={StyleSheet.absoluteFill} />
              {item.imageSource ? (
                <Image
                  source={item.imageSource}
                  resizeMode={item.id === 'glass-surface' ? 'contain' : imageFit}
                  style={styles.catalogImage}
                />
              ) : null}
              {item.swatch ? <LinearGradient colors={item.swatch} style={styles.swatch} /> : null}
              <LinearGradient
                colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.70)']}
                style={StyleSheet.absoluteFill}
              />
              {showCredit ? (
                <View style={styles.catalogCredit}>
                  <Text style={styles.catalogCreditText}>{item.creditCost} kredi</Text>
                </View>
              ) : null}
              {selected ? (
                <View style={styles.selectedTick}>
                  <Icon name="checkmark" size={15} color={colors.background} />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.catalogTitle}>
              {item.name}
            </Text>
            <Text numberOfLines={2} style={styles.catalogDescription}>
              {item.description}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 52 },
  sectionLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: spacing.xl,
  },
  sectionIndex: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.12)',
    borderColor: 'rgba(255,196,0,0.42)',
    borderRadius: 14,
    borderWidth: 1,
    height: 29,
    justifyContent: 'center',
    width: 29,
  },
  sectionIndexText: { color: colors.accentYellow, fontSize: 13, fontWeight: '900' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionHint: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 8,
  },
  secondaryUpload: { marginTop: spacing.lg },
  secondaryTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  rail: { gap: 11, paddingRight: spacing.lg, paddingTop: 10 },
  catalogCard: {
    backgroundColor: 'rgba(18,18,21,0.92)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 6,
    width: 146,
  },
  catalogCardSelected: {
    borderColor: colors.accentYellow,
    shadowColor: colors.accentYellow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
  },
  catalogVisual: { borderRadius: 15, height: 150, overflow: 'hidden' },
  catalogImage: { height: '100%', width: '100%' },
  swatch: {
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 34,
    borderWidth: 2,
    height: 68,
    left: 33,
    position: 'absolute',
    top: 38,
    width: 68,
  },
  catalogCredit: {
    backgroundColor: 'rgba(5,5,5,0.68)',
    borderRadius: radii.pill,
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
  },
  catalogCreditText: { color: '#FFE69A', fontSize: 10, fontWeight: '800' },
  selectedTick: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 26,
  },
  catalogTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginHorizontal: 5,
    marginTop: 8,
  },
  catalogDescription: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 15,
    marginBottom: 6,
    marginHorizontal: 5,
    marginTop: 2,
    minHeight: 30,
  },
  fieldTitle: { ...typography.label, color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notes: {
    backgroundColor: 'rgba(20,20,23,0.90)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 104,
    padding: 14,
  },
  counter: { ...typography.caption, color: colors.textMuted, marginTop: 5, textAlign: 'right' },
  rights: {
    alignItems: 'center',
    backgroundColor: 'rgba(17,17,20,0.90)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: spacing.lg,
    padding: 14,
  },
  rightsSelected: { borderColor: 'rgba(255,196,0,0.52)' },
  rightsDisabled: { opacity: 0.45 },
  checkbox: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 7,
    borderWidth: 1,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  checkboxSelected: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  rightsCopy: { flex: 1, minWidth: 0 },
  rightsTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  rightsText: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  quote: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    padding: 15,
  },
  quoteOverline: { ...typography.overline, color: '#D4C48E', fontSize: 9 },
  quoteCost: { ...typography.h2, color: '#FFE49A', marginTop: 2 },
  quoteDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  balance: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.08)',
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  balanceText: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.986 }] },
});
