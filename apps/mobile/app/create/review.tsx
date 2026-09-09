import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { CreditBadge, Icon, Notice, Screen } from '@/components';
import { fictionalPeople, filters } from '@/constants/catalog';
import { useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, WizardFooter } from '@/features/create/components';
import {
  quoteCreateFlow,
  startCreateGeneration,
  createSubmissionKey,
  submissionStageLabels,
  type SubmissionStage,
  type GenerationQuote,
} from '@/features/create/server';
import { SubmissionProgress } from '@/features/create/SubmissionProgress';
import { modeName } from '@/features/create/workflow';
import { colors, radii, spacing, typography } from '@/theme';
import { CREDIT_WALLET_QUERY_KEY } from '@/features/billing/use-wallet';
import { FilterPreview } from '@/features/filters/FilterPreview';
import { getSelectedScene } from '@/features/create/scene-presentation';
import { beautyOptions } from '@/features/beauty/catalog';
import { beautyIntensity } from '@/features/beauty/settings';
import { getTrendPreset } from '@/features/trends/presets';

function getName<T extends { id: string; name: string }>(
  items: T[],
  id: string | null,
  fallback: string,
) {
  return items.find((item) => item.id === id)?.name ?? fallback;
}

type QuoteState = {
  requestKey: string;
  status: 'loading' | 'ready' | 'error';
  quote: GenerationQuote | null;
  error: string | null;
};

export default function ReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { autoStart: rawAutoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const autoStart = Array.isArray(rawAutoStart) ? rawAutoStart[0] : rawAutoStart;
  const autoStartAttempted = useRef(false);
  const { flow } = useCreateFlow();
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [quoteState, setQuoteState] = useState<QuoteState>({
    requestKey: '',
    status: 'loading',
    quote: null,
    error: null,
  });
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const [retryFingerprint, setRetryFingerprint] = useState<string | null>(null);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>('CHECKING');
  const flowFingerprint = useMemo(() => JSON.stringify(flow), [flow]);
  const retryingSameSubmission = retryFingerprint === flowFingerprint;
  const [startError, setStartError] = useState<string | null>(null);
  const [quoteErrorVisible, setQuoteErrorVisible] = useState(true);
  const quoteInputKey = useMemo(
    () =>
      [
        flow.mode,
        flow.quality,
        flow.numberOfImages,
        flow.sceneId,
        flow.personId,
        flow.styleId,
        JSON.stringify(flow.beauty),
        JSON.stringify(flow.transformation),
        flow.trendPreset,
      ].join('|'),
    [
      flow.mode,
      flow.numberOfImages,
      flow.personId,
      flow.quality,
      flow.sceneId,
      flow.styleId,
      flow.beauty,
      flow.transformation,
      flow.trendPreset,
    ],
  );
  const quoteRequestKey = `${quoteInputKey}:${quoteRefresh}`;
  const quote = quoteState.requestKey === quoteRequestKey ? quoteState.quote : null;
  const quoteError = quoteState.requestKey === quoteRequestKey ? quoteState.error : null;
  const isQuoting = quoteState.requestKey !== quoteRequestKey || quoteState.status === 'loading';

  useEffect(() => {
    let active = true;
    void quoteCreateFlow(flow)
      .then((result) => {
        if (active) {
          setQuoteErrorVisible(true);
          setQuoteState({
            requestKey: quoteRequestKey,
            status: 'ready',
            quote: result.quote,
            error: null,
          });
        }
      })
      .catch((error) => {
        if (active) {
          setQuoteErrorVisible(true);
          setQuoteState({
            requestKey: quoteRequestKey,
            status: 'error',
            quote: null,
            error: error instanceof Error ? error.message : 'Kredi özeti alınamadı.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [flow, quoteRequestKey]);

  const startGeneration = useCallback(async () => {
    if (isStarting || startingRef.current || (!quote?.canGenerate && !retryingSameSubmission))
      return;
    startingRef.current = true;
    if (attemptRef.current?.fingerprint !== flowFingerprint) {
      attemptRef.current = { fingerprint: flowFingerprint, key: createSubmissionKey() };
    }
    setStartError(null);
    setSubmissionStage('CHECKING');
    setIsStarting(true);
    try {
      const result = await startCreateGeneration(flow, {
        idempotencyKey: attemptRef.current.key,
        onProgress: setSubmissionStage,
      });
      setRetryFingerprint(null);
      // A cache refresh failure must never make an accepted generation look failed.
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: CREDIT_WALLET_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      router.replace({
        pathname: '/create/progress',
        params: { generationId: result.generation.generationId },
      } as never);
    } catch (error) {
      setRetryFingerprint(flowFingerprint);
      setStartError(
        error instanceof Error
          ? error.message
          : 'Üretim güvenle başlatılamadı. Lütfen tekrar dene.',
      );
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [
    flow,
    flowFingerprint,
    isStarting,
    queryClient,
    quote?.canGenerate,
    retryingSameSubmission,
    router,
  ]);

  const scene =
    (flow.trendPreset ? 'Akıma uygun ortam' : getSelectedScene(flow.sceneId)?.name) ??
    (flow.mode === 'filter'
      ? 'Sahne değişmeden'
      : flow.mode === 'portrait'
        ? 'Portre stüdyosu'
        : 'Seçilmedi');
  const person = getName(fictionalPeople, flow.personId, 'Yok');
  const style = getName(
    filters,
    flow.styleId,
    flow.mode === 'portrait' ? 'Sıcak Stüdyo' : 'Doğal Işık',
  );
  const cost = quote?.creditCost ?? 0;
  const availableCredits = quote?.availableCredits ?? 0;
  const remainingCredits = Math.max(0, availableCredits - cost);
  const readyToStart = Boolean(
    flow.sourceUri &&
    flow.sourceRightsConfirmed &&
    (retryingSameSubmission || (quote?.canGenerate && !isQuoting)) &&
    !isStarting,
  );

  useEffect(() => {
    if (autoStart !== 'onboarding' || !readyToStart || autoStartAttempted.current) return;
    autoStartAttempted.current = true;
    void startGeneration();
  }, [autoStart, readyToStart, startGeneration]);

  useEffect(() => {
    if (!startError) return;
    const timeout = setTimeout(() => setStartError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [startError]);

  useEffect(() => {
    if (!quoteError) return;
    const timeout = setTimeout(() => setQuoteErrorVisible(false), 4_000);
    return () => clearTimeout(timeout);
  }, [quoteError]);
  if (!flow.sourceUri || !flow.sourceRightsConfirmed) return <Redirect href="/create/upload" />;
  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader title="Üretim özeti" subtitle="Her şey kontrolünde" step={3} />
      <View style={styles.preview}>
        {flow.beauty || flow.transformation || flow.trendPreset ? (
          <Image
            source={{ uri: flow.sourceUri }}
            resizeMode="contain"
            style={{ width: '100%', height: 300 }}
          />
        ) : (
          <FilterPreview
            sourceUri={flow.sourceUri}
            filterId={
              flow.styleId ?? (flow.mode === 'portrait' ? 'filter-studio' : 'filter-natural')
            }
            intensity={flow.filterIntensity}
          />
        )}
      </View>
      <View style={styles.details}>
        <Detail
          label="Mod"
          value={
            flow.beauty
              ? 'Güzellik Stüdyosu'
              : flow.transformation
                ? 'Cinsiyet değiştirme'
                : flow.trendPreset
                  ? 'Akımlar'
                  : modeName(flow.mode)
          }
          icon="sparkles-outline"
        />
        <Detail label="Sahne" value={scene} icon="images-outline" />
        {flow.mode === 'character' ? (
          <Detail label="Karakter" value={person} icon="person-outline" />
        ) : null}
        <Detail
          label="Kaynak"
          value={
            flow.sourceKind === 'fictional'
              ? getName(fictionalPeople, flow.sourceCharacterId ?? null, 'Kurgusal karakter')
              : 'Fotoğrafım'
          }
          icon="person-outline"
        />
        {flow.beauty ? (
          beautyOptions
            .filter((option) => beautyIntensity(flow.beauty!, option.id) > 0)
            .map((option) => (
              <Detail
                key={option.id}
                label={option.name}
                value={`%${beautyIntensity(flow.beauty!, option.id)}`}
                icon="sparkles-outline"
              />
            ))
        ) : flow.transformation ? (
          <Detail
            label="Görünüm"
            value={
              flow.transformation.presentation === 'feminine'
                ? 'Kadınsı görünüm'
                : 'Erkeksi görünüm'
            }
            icon="color-filter-outline"
          />
        ) : flow.trendPreset ? (
          <Detail
            label="Akım"
            value={`${getTrendPreset(flow.trendPreset)?.name ?? 'Akım'} · %${flow.filterIntensity}`}
            icon="sparkles-outline"
          />
        ) : (
          <Detail
            label="Tarz"
            value={`${style} · %${flow.filterIntensity}`}
            icon="color-filter-outline"
          />
        )}
        <Detail
          label="Kompozisyon"
          value={`${flow.trendPreset ? 'Akıma uygun kadraj' : flow.mode === 'filter' || flow.mode === 'background' ? 'Kaynak kadrajı' : flow.composition} · ${flow.aspectRatio}`}
          icon="scan-outline"
        />
        <Detail
          label="Çıktı"
          value={`${flow.numberOfImages} görsel · ${flow.quality}`}
          icon="image-outline"
        />
      </View>
      {flow.trendPreset ? (
        <Notice tone="neutral" title="Akım dönüşümü">
          Yukarıdaki görsel kaynak fotoğrafındır, oluşturulmuş sonuç değildir. Yüz kimliğin
          korunarak kıyafet, poz, saçın şekillendirilmesi, makyaj ve ortam akıma göre değişebilir.
        </Notice>
      ) : null}
      {flow.customInstruction ? (
        <View style={styles.instruction}>
          <Text style={styles.instructionLabel}>ÖZEL TALİMAT</Text>
          <Text style={styles.instructionText}>{flow.customInstruction}</Text>
        </View>
      ) : null}
      <View style={styles.costCard}>
        <Text style={styles.costLabel}>SUNUCU TARAFINDAN HESAPLANAN MALİYET</Text>
        <View style={styles.costRow}>
          <Text style={styles.cost}>
            <Text style={styles.costNumber}>{isQuoting ? '…' : quote ? cost : '—'}</Text> kredi
          </Text>
          {quote ? <CreditBadge credits={availableCredits} /> : null}
        </View>
        <Text style={styles.remaining}>
          {quote ? (
            <>
              Üretimden sonra tahmini{' '}
              <Text style={styles.remainingStrong}>{remainingCredits} kredi</Text> kalır.
            </>
          ) : quoteError ? (
            'Kredi tutarı alınamadı; bakiye değişmedi.'
          ) : (
            'Kredi özeti güvenle doğrulanıyor.'
          )}
        </Text>
      </View>
      {quoteError && quoteErrorVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kredi özetini yeniden dene"
          onPress={() => setQuoteRefresh((value) => value + 1)}
        >
          <Notice tone="warning" title="Kredi özeti alınamadı">
            {quoteError} Yeniden denemek için dokun.
          </Notice>
        </Pressable>
      ) : null}
      {quoteError && !quoteErrorVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kredi özetini yeniden dene"
          onPress={() => setQuoteRefresh((value) => value + 1)}
          style={styles.retryQuote}
        >
          <Icon name="refresh" size={18} color={colors.accentYellow} />
          <Text style={styles.retryQuoteText}>Kredi özetini yeniden dene</Text>
        </Pressable>
      ) : null}
      {quote && !quote.canGenerate ? (
        <Notice tone="warning" title="Yetersiz kredi">
          Bu üretim için {cost} kredi gerekir; kullanılabilir bakiyen {availableCredits} kredi.
        </Notice>
      ) : null}
      {startError ? (
        <Notice tone="warning" title="Üretim başlatılamadı">
          {startError}
        </Notice>
      ) : null}
      <Notice tone="neutral" title="Başlatmadan önce">
        Üretim, gönderdiğin kaynak fotoğrafı ve seçimlerini kullanır. Sonuçlar AI içeriği olarak
        işaretlenir.
      </Notice>
      {isStarting ? <SubmissionProgress stage={submissionStage} /> : null}
      <WizardFooter
        label={
          isStarting
            ? `${submissionStageLabels[submissionStage]}…`
            : retryingSameSubmission
              ? 'Aynı işlemi yeniden dene'
              : isQuoting
                ? 'Kredi özeti hazırlanıyor…'
                : !quote
                  ? 'Kredi özeti gerekli'
                  : `${cost} krediyle oluştur`
        }
        disabled={!readyToStart}
        loading={isStarting}
        onPress={() => void startGeneration()}
        hint={
          flow.sourceRightsConfirmed
            ? 'Fiyat, yükleme ve kredi rezervasyonu API tarafından doğrulanır.'
            : 'Devam etmek için kaynak fotoğraf kullanım hakkını onayla.'
        }
      />
    </Screen>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Icon>['name'];
}) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}>
        <Icon name={icon} size={18} color={colors.accentYellow} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  preview: { marginTop: spacing.lg, position: 'relative' },
  details: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  detail: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.accentYellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  detailLabel: { ...typography.caption, color: colors.textMuted, width: 88 },
  detailValue: { flex: 1, ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  instruction: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionLabel: { ...typography.overline, color: colors.textMuted, fontSize: 10 },
  instructionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 5,
    lineHeight: 18,
  },
  costCard: {
    minHeight: 124,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.30)',
    position: 'relative',
  },
  costLabel: { ...typography.overline, color: colors.accentYellow, fontSize: 10 },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  cost: { ...typography.h3, color: colors.textPrimary, marginTop: 4 },
  costNumber: { fontSize: 32, lineHeight: 37, fontWeight: '900' },
  remaining: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
  },
  remainingStrong: { color: colors.textPrimary, fontWeight: '800' },
  retryQuote: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  retryQuoteText: { ...typography.label, color: colors.accentYellow },
});
