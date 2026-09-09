import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BackButton, Icon, Screen } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { apiRequest } from '@/api/client';
import {
  generationPhases,
  generationProgressView,
  generationCreditNotice,
  isQueueWaitProlonged,
  terminalGenerationStatuses,
  type GenerationPresentation,
} from '@/features/create/generation-progress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCreateFlow } from '@/features/create/createFlow';
import { afterSourcePath } from '@/features/create/workflow';
import { CREDIT_WALLET_QUERY_KEY } from '@/features/billing/use-wallet';
import { colors, radii, spacing, typography } from '@/theme';

const ORB_SIZE = 206;
const RING_SIZE = 194;
const RING_WIDTH = 5;
const INNER_SIZE = 172;

export default function ProgressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { flow } = useCreateFlow();
  const reducedMotion = useReducedMotion();
  const { generationId: rawGenerationId } = useLocalSearchParams<{ generationId?: string }>();
  const generationId = Array.isArray(rawGenerationId) ? rawGenerationId[0] : rawGenerationId;
  const [generation, setGeneration] = useState<GenerationPresentation | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const pollErrorShown = useRef(false);
  const [lastWorkingGeneration, setLastWorkingGeneration] = useState<GenerationPresentation | null>(
    null,
  );
  const terminalGenerationId = useRef<string | null>(null);
  const visibleGeneration = generation?.id === generationId ? generation : null;
  const status = visibleGeneration?.status;
  const isTerminal = status ? terminalGenerationStatuses.has(status) : false;
  const presentation = generationProgressView(visibleGeneration, lastWorkingGeneration);
  const { progress, completed, stopped } = presentation;
  const prolongedQueue = isQueueWaitProlonged(visibleGeneration);
  const creditNotice = generationCreditNotice(visibleGeneration);

  useEffect(() => {
    if (!isTerminal || !generationId) return;
    // Balance labels must follow the confirmed capture/refund, not keep the
    // pre-submission reservation visible until their stale timer expires.
    void queryClient
      .invalidateQueries({ queryKey: CREDIT_WALLET_QUERY_KEY })
      .catch(() => undefined);
  }, [generationId, isTerminal, queryClient]);

  useEffect(() => {
    if (!generationId || isTerminal) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Wait for each response before scheduling another request; slower responses cannot overlap.
    const poll = async () => {
      try {
        const next = await apiRequest<GenerationPresentation>(
          `/v1/generations/${encodeURIComponent(generationId)}`,
        );
        if (!active || terminalGenerationId.current === generationId) return;
        if (!terminalGenerationStatuses.has(next.status)) setLastWorkingGeneration(next);
        else terminalGenerationId.current = next.id;
        setGeneration(next);
        setRequestError(null);
        pollErrorShown.current = false;
        if (terminalGenerationStatuses.has(next.status)) return;
      } catch (error) {
        if (active && !pollErrorShown.current) {
          pollErrorShown.current = true;
          setRequestError(error instanceof Error ? error.message : 'Üretim durumu alınamadı.');
        }
      }
      if (active) timer = setTimeout(() => void poll(), 1_500);
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [generationId, isTerminal, refreshAttempt]);

  useEffect(() => {
    if (!generationId || status !== 'COMPLETED') return;
    const timeout = setTimeout(
      () => router.replace(`/generations/${generationId}/results` as never),
      reducedMotion ? 400 : 900,
    );
    return () => clearTimeout(timeout);
  }, [generationId, reducedMotion, router, status]);

  const cancelGeneration = async () => {
    if (!generationId || isCancelling || isTerminal) return;
    setIsCancelling(true);
    try {
      const cancelled = await apiRequest<GenerationPresentation>(
        `/v1/generations/${encodeURIComponent(generationId)}/cancel`,
        { method: 'POST', body: JSON.stringify({ reason: 'MOBILE_USER_CANCELLED' }) },
      );
      if (terminalGenerationStatuses.has(cancelled.status))
        terminalGenerationId.current = cancelled.id;
      setGeneration(cancelled);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Üretim iptal edilemedi.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!generationId) {
    return (
      <Screen
        scroll={false}
        contentContainerStyle={styles.missing}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <Icon name="alert-circle-outline" size={38} color={colors.warning} />
        <Text style={styles.phaseTitle}>Üretim bulunamadı</Text>
        <Text style={styles.phaseDetail}>
          Güvenli durum takibi için bir üretim kimliği gerekli.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/create' as never)}
          style={styles.restart}
        >
          <Text style={styles.restartText}>Yeni üretim başlat</Text>
        </Pressable>
      </Screen>
    );
  }

  const isCancelled = status === 'CANCELLED';
  const phaseTitle = isCancelled
    ? 'Üretim iptal edildi'
    : stopped
      ? status === 'BLOCKED'
        ? 'Talep güvenlik nedeniyle durduruldu'
        : 'Üretim tamamlanamadı'
      : completed
        ? 'Görselin hazır'
        : requestError
          ? 'Bağlantı bekleniyor'
          : visibleGeneration
            ? 'Görselin hazırlanıyor'
            : 'Üretimine bağlanılıyor';
  const phaseDetail = isCancelled
    ? 'Bu işlem durduruldu. Yeni bir üretim başlatabilirsin.'
    : stopped
      ? (visibleGeneration?.failure?.message ??
        'Seçimlerini kontrol ederek yeniden deneyebilirsin.')
      : completed
        ? 'Sonucun kaydedildi. Şimdi görseline geçiyoruz.'
        : presentation.detail;

  return (
    <Screen contentContainerStyle={styles.content} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.top}>
        <BackButton fallback="/create/review" />
        <Text style={styles.topTitle}>
          {completed ? 'Tamamlandı' : stopped ? 'Üretim durumu' : 'Oluşturuluyor'}
        </Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.center}>
        <GlassProgressOrb
          progress={progress}
          completed={completed}
          stopped={stopped}
          reducedMotion={reducedMotion}
        />
        <Text style={styles.phaseTitle} accessibilityLiveRegion="polite">
          {phaseTitle}
        </Text>
        <Text style={styles.phaseDetail}>{phaseDetail}</Text>
        {creditNotice ? <Text style={styles.progressHint}>{creditNotice}</Text> : null}
        {!isTerminal && visibleGeneration ? (
          <Text style={styles.progressHint}>İlerleme, üretim aşamalarına göre güncellenir.</Text>
        ) : null}
        <GlassSurface
          radius={24}
          tone="neutral"
          glow={false}
          style={styles.steps}
          contentStyle={styles.stepsContent}
        >
          {generationPhases.map((item, index) => (
            <ProgressPhase
              key={item.label}
              done={index < presentation.completedPhases}
              active={index === presentation.activePhase}
              index={index}
              label={item.label}
              reducedMotion={reducedMotion}
            />
          ))}
        </GlassSurface>
      </View>
      <View style={styles.bottom}>
        {requestError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Üretim durumunu yeniden dene"
            onPress={() => {
              pollErrorShown.current = false;
              setRefreshAttempt((value) => value + 1);
            }}
          >
            <GlassSurface radius={22} tone="gold" glow={false} contentStyle={styles.noticeContent}>
              <Icon name="alert-circle-outline" size={23} color={colors.accentYellow} />
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>Durum alınamadı</Text>
                <Text style={styles.noticeText}>{requestError} Yeniden denemek için dokun.</Text>
              </View>
            </GlassSurface>
          </Pressable>
        ) : prolongedQueue ? (
          <GlassSurface radius={22} tone="gold" glow={false} contentStyle={styles.noticeContent}>
            <Icon name="time-outline" size={23} color={colors.accentYellow} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Sıra bekleme uzadı</Text>
              <Text style={styles.noticeText}>
                Üretim henüz başlayamadı. Bekleyebilir veya aşağıdan iptal ederek ayrılan kredini
                geri alabilirsin. Otomatik yeni üretim başlatılmaz.
              </Text>
            </View>
          </GlassSurface>
        ) : !isTerminal ? (
          <GlassSurface radius={22} tone="neutral" glow={false} contentStyle={styles.noticeContent}>
            <Icon name="shield-checkmark-outline" size={23} color="#EEDBA2" />
            <Text style={styles.noticeText}>
              Ekrandan ayrılabilirsin. İşlem tamamlandığında görselin Projeler bölümüne kaydedilir.
            </Text>
          </GlassSurface>
        ) : null}
        {!isTerminal ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Üretimi iptal et"
            accessibilityState={{ busy: isCancelling }}
            disabled={isCancelling}
            onPress={() => void cancelGeneration()}
            style={[styles.cancel, isCancelling && styles.cancelDisabled]}
          >
            <Text style={styles.cancelText}>
              {isCancelling ? 'İptal ediliyor…' : 'Üretimi iptal et'}
            </Text>
          </Pressable>
        ) : null}
        {stopped ? (
          <View style={styles.recoveryActions}>
            <Text style={styles.noticeText}>
              İşlem sonlandı. Seçimlerini değiştirmeden otomatik tekrar gönderilmez.
            </Text>
            <Text selectable style={styles.progressHint}>İşlem kodu: {generationId}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/support/ticket', params: { generationId } } as never)
              }
              style={styles.restart}
            >
              <Text style={styles.restartText}>Bu işlem için destek iste</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/create/upload' as never)}
              style={styles.restart}
            >
              <Text style={styles.restartText}>Fotoğrafı değiştir</Text>
            </Pressable>
            {flow.sourceUri ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace(afterSourcePath(flow) as never)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Düzenleme ayarlarına dön</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)/projects' as never)}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Projelerime dön</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function GlassProgressOrb({
  progress,
  completed,
  stopped,
  reducedMotion,
}: {
  progress: number;
  completed: boolean;
  stopped: boolean;
  reducedMotion: boolean;
}) {
  const fill = useSharedValue(0);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    fill.value = reducedMotion
      ? progress
      : withTiming(progress, { duration: 720, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(fill);
  }, [fill, progress, reducedMotion]);
  useEffect(() => {
    cancelAnimation(shimmer);
    shimmer.value = 0;
    if (reducedMotion || stopped || completed) return;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2_400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2_400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shimmer);
  }, [completed, reducedMotion, shimmer, stopped]);

  const liquidStyle = useAnimatedStyle(() => ({
    height: `${Math.max(0, Math.min(100, fill.value))}%`,
  }));
  const reflectionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.25, 0.5]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-12, 12]) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.32, 0.62]),
  }));
  const tipStyle = useAnimatedStyle(() => ({
    opacity: fill.value > 0 && fill.value < 100 ? 1 : 0,
    transform: [{ rotate: `${fill.value * 3.6}deg` }],
  }));

  return (
    <View
      style={styles.orbWrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        stopped ? 'Üretim durduruldu' : `Üretim ilerlemesi yüzde ${Math.round(progress)}`
      }
      accessibilityValue={{ min: 0, max: 100, now: progress }}
    >
      <Animated.View pointerEvents="none" style={[styles.orbHalo, haloStyle]} />
      <View style={styles.outerHairline} pointerEvents="none" />
      <GlassSurface
        radius={INNER_SIZE / 2}
        tone="neutral"
        glow={false}
        style={styles.orbInner}
        contentStyle={styles.orbInnerContent}
      >
        <Animated.View pointerEvents="none" style={[styles.liquidFill, liquidStyle]}>
          <LinearGradient
            colors={['rgba(255,233,164,0.24)', 'rgba(230,187,57,0.10)', 'rgba(255,226,144,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.liquidSurface} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.orbReflection, reflectionStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Icon
          name={completed ? 'checkmark' : stopped ? 'pause-outline' : 'sparkles-outline'}
          size={32}
          color={completed ? '#FFE89A' : '#F5EEDB'}
        />
        <Text style={styles.percent}>{stopped ? 'Durdu' : `${Math.round(progress)}%`}</Text>
        <Text style={styles.orbCaption}>
          {completed ? 'HAZIR' : stopped ? 'İŞLEM SONLANDI' : 'BİRKARE AI'}
        </Text>
      </GlassSurface>
      <View pointerEvents="none" style={styles.ring}>
        <View style={styles.ringTrack} />
        <ProgressRingHalf side="right" progress={fill} />
        <ProgressRingHalf side="left" progress={fill} />
        {!stopped ? (
          <Animated.View style={[styles.ringTipTrack, tipStyle]}>
            <View style={styles.ringTip} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** Two clipped semicircles produce a continuous arc without a native SVG dependency. */
function ProgressRingHalf({
  side,
  progress,
}: {
  side: 'right' | 'left';
  progress: SharedValue<number>;
}) {
  const isRight = side === 'right';
  const rotation = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${Math.max(0, Math.min(50, progress.value - (isRight ? 0 : 50))) * 3.6}deg` },
    ],
  }));
  return (
    <View style={[styles.ringMask, { left: isRight ? RING_SIZE / 2 : 0 }]}>
      <Animated.View style={[styles.ringRotator, { left: isRight ? -RING_SIZE / 2 : 0 }, rotation]}>
        <View style={[styles.ringMask, { left: isRight ? 0 : RING_SIZE / 2 }]}>
          <View style={[styles.ringArc, { left: isRight ? 0 : -RING_SIZE / 2 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

function ProgressPhase({
  done,
  active,
  index,
  label,
  reducedMotion,
}: {
  done: boolean;
  active: boolean;
  index: number;
  label: string;
  reducedMotion: boolean;
}) {
  const fill = useSharedValue(done ? 1 : 0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    fill.value = reducedMotion
      ? done
        ? 1
        : 0
      : withTiming(done ? 1 : 0, { duration: 460, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(fill);
  }, [done, fill, reducedMotion]);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    if (!active || reducedMotion) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse, reducedMotion]);
  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: interpolate(fill.value, [0, 1], [0.7, 1]) }],
  }));
  const activeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.95]),
  }));

  return (
    <View
      style={styles.step}
      accessible
      accessibilityLabel={`${label}, ${done ? 'tamamlandı' : active ? 'devam ediyor' : 'bekliyor'}`}
    >
      <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']}
          style={StyleSheet.absoluteFill}
        />
        {!done ? (
          <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.stepDotFill, fillStyle]}>
          <LinearGradient colors={['#FFF2BF', '#D8AB37']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        {done ? (
          <Animated.View style={[styles.stepCheck, checkStyle]}>
            <Icon name="checkmark" size={17} color="#29200B" />
          </Animated.View>
        ) : null}
      </View>
      <Text style={[styles.stepText, done && styles.stepTextDone, active && styles.stepTextActive]}>
        {label}
      </Text>
      {active ? <Animated.View style={[styles.activeIndicator, activeStyle]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  recoveryActions: { gap: 12 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 20 },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 14,
  },
  top: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { ...typography.h3, color: colors.textPrimary },
  topSpacer: { width: 44 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingBottom: 28,
  },
  orbWrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  outerHairline: {
    ...StyleSheet.absoluteFill,
    borderRadius: ORB_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,246,219,0.20)',
  },
  orbHalo: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: 'rgba(242,214,135,0.07)',
    shadowColor: '#FFE7A2',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
  },
  orbInner: { width: INNER_SIZE, height: INNER_SIZE },
  orbInnerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: INNER_SIZE / 2,
  },
  liquidFill: { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  liquidSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,249,225,0.34)',
  },
  orbReflection: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: 0,
    height: 83,
    borderRadius: 86,
    transform: [{ rotate: '-16deg' }],
  },
  ring: { position: 'absolute', width: RING_SIZE, height: RING_SIZE },
  ringTrack: {
    ...StyleSheet.absoluteFill,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  ringMask: {
    position: 'absolute',
    top: 0,
    width: RING_SIZE / 2,
    height: RING_SIZE,
    overflow: 'hidden',
  },
  ringRotator: { position: 'absolute', top: 0, width: RING_SIZE, height: RING_SIZE },
  ringArc: {
    position: 'absolute',
    top: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: '#EACB78',
  },
  ringTipTrack: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  ringTip: {
    marginTop: -0.5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF8DD',
    shadowColor: '#FFF1B1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
  },
  percent: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  orbCaption: {
    fontSize: 9,
    letterSpacing: 2.1,
    fontWeight: '700',
    color: 'rgba(255,249,230,0.48)',
    marginTop: 3,
  },
  phaseTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  phaseDetail: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 310,
  },
  progressHint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 9,
  },
  steps: { alignSelf: 'stretch', marginTop: 22 },
  stepsContent: { padding: 17, gap: 13 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15,15,15,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepDotActive: {
    borderColor: 'rgba(255,225,149,0.52)',
    backgroundColor: 'rgba(224,184,62,0.08)',
  },
  stepDotDone: { borderColor: 'rgba(255,239,184,0.76)' },
  stepDotFill: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  stepCheck: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  stepNumber: { ...typography.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  stepNumberActive: { color: '#FFE7A2' },
  stepText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  stepTextDone: { color: 'rgba(255,255,255,0.76)' },
  stepTextActive: { color: '#FFF6DE', fontWeight: '600' },
  activeIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EACB78' },
  bottom: { gap: 10 },
  noticeContent: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeCopy: { flex: 1, gap: 4 },
  noticeTitle: { ...typography.label, color: '#FFF3CF' },
  noticeText: { ...typography.caption, color: colors.textSecondary, flexShrink: 1, lineHeight: 19 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelDisabled: { opacity: 0.45 },
  cancelText: { ...typography.label, color: colors.danger },
  restart: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartText: { ...typography.label, color: colors.background, fontWeight: '800' },
});
