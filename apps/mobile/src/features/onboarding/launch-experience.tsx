import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/motion';
import { colors, shadows } from '@/theme';
import { FilterToneLayers } from '@/features/filters/FilterPreview';

import {
  categories,
  filters,
  galleryPhotos,
  onboardingImages,
  resolveOnboardingPhoto,
  showcasePhotos,
  type OnboardingCategoryId,
  type OnboardingFilterId,
  type OnboardingPhoto,
} from './data';
import { stageOnboardingCreateDraft } from './create-handoff';
import { useOnboardingPhotoPicker } from './use-photo-picker';

type GuidedSplashProps = {
  onFinished: () => void;
};

type StepIndex = 0 | 1 | 2 | 3;
type EditMode = 'Işık' | 'Kadraj' | 'Yüz koruma';

const SHOWCASE_CARD_WIDTH = 110;
const SHOWCASE_CARD_GAP = 12;
// The supplied opening-gallery photos are 1122 × 1402.  Keep the card canvas
// at that exact portrait ratio so the entire image can be shown without a
// crop or a stretched face/body.
const SHOWCASE_CARD_ASPECT_RATIO = 1122 / 1402;
const SHOWCASE_CARD_HEIGHT = SHOWCASE_CARD_WIDTH / SHOWCASE_CARD_ASPECT_RATIO;
const PHOTO_PRELUDE_DURATION = 6_400;

const filterTints: Record<OnboardingFilterId, string> = {
  natural: '#E4B66A',
  'warm-studio': '#D57A30',
  cinematic: '#A76118',
  'pop-art': '#D43A7A',
  'drip-art': '#763BCA',
  hdr: '#417CAF',
  'black-white': '#A8A8A8',
  vintage: '#966336',
  bokeh: '#B56B2C',
  cyberpunk: '#7D39D8',
  watercolor: '#5A8FC9',
  sketch: '#7E716A',
  cartoon: '#E25B31',
};

function clamp(value: number, min = 0, max = 1) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Native iOS can treat a purely absolute Image like `cover` after a hot
 * reload. Giving it a normal 100% × 100% layout child makes `contain`
 * deterministic for every source, demo, and showcase photograph.
 */
function FittedPhotoImage({
  source,
  style,
}: {
  source: ImageSourcePropType;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.fittedPhotoCanvas, style]}>
      <Image fadeDuration={0} source={source} style={styles.fittedPhotoImage} />
    </View>
  );
}

function selectionHaptic() {
  void Haptics.selectionAsync();
}

function impactHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function successHaptic() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * A short, content-first brand intro. Its movement mirrors the supplied
 * reference: the native gold mark hands off without a black flash, a luminous
 * trace completes around it, then the BirKare AI wordmark reveals from a mask.
 */
export function LogoIntro({ onFinished }: { onFinished: () => void }) {
  const reducedMotion = useReducedMotion();
  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);
  // These first-frame values intentionally mirror the native splash plugin's
  // centered gold mark. That keeps the hand-off visually continuous.
  const markScale = useSharedValue(0.92);
  const markOpacity = useSharedValue(0.98);
  const wordReveal = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const arcProgress = useSharedValue(0.56);
  const bloomScale = useSharedValue(0.76);
  const bloomOpacity = useSharedValue(0.13);
  // Gold light opens horizontally from the center before the brand mark lifts.
  const flareProgress = useSharedValue(0);
  // The brand mark starts visually centered, then lifts into its final hero
  // position before the wordmark appears underneath.
  const heroLift = useSharedValue(0);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const duration = reducedMotion ? 900 : 2_700;

    if (reducedMotion) {
      arcProgress.set(1);
      markScale.set(1);
      markOpacity.set(1);
      wordReveal.set(1);
      wordOpacity.set(1);
      bloomScale.set(1);
      bloomOpacity.set(0.17);
      flareProgress.set(1);
      heroLift.set(1);
    } else {
      flareProgress.set(
        withDelay(120, withTiming(1, { duration: 980, easing: Easing.out(Easing.cubic) })),
      );
      arcProgress.set(withDelay(300, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) })));
      markOpacity.set(withTiming(1, { duration: 220 }));
      markScale.set(withSpring(1, motion.spring));
      heroLift.set(
        withDelay(760, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) })),
      );
      wordOpacity.set(withDelay(1_360, withTiming(1, { duration: 190 })));
      wordReveal.set(
        withDelay(1_380, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })),
      );
      bloomOpacity.set(withDelay(1_180, withTiming(0.17, { duration: 360 })));
      bloomScale.set(
        withDelay(1_180, withTiming(1.28, { duration: 980, easing: Easing.out(Easing.cubic) })),
      );
    }

    const timer = setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinishedRef.current();
    }, duration);

    return () => {
      clearTimeout(timer);
      cancelAnimation(markScale);
      cancelAnimation(markOpacity);
      cancelAnimation(wordReveal);
      cancelAnimation(wordOpacity);
      cancelAnimation(arcProgress);
      cancelAnimation(bloomScale);
      cancelAnimation(bloomOpacity);
      cancelAnimation(flareProgress);
      cancelAnimation(heroLift);
    };
  }, [
    arcProgress,
    bloomOpacity,
    bloomScale,
    flareProgress,
    heroLift,
    markOpacity,
    markScale,
    reducedMotion,
    wordOpacity,
    wordReveal,
  ]);

  const arcStyle = useAnimatedStyle(() => ({
    opacity: 0.34 + arcProgress.get() * 0.66,
    transform: [
      { rotate: String(interpolate(arcProgress.get(), [0, 1], [-120, 10])) + 'deg' },
      { scale: 0.78 + arcProgress.get() * 0.22 },
    ],
  }));
  const flareStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flareProgress.get(), [0, 0.12, 0.72, 1], [0, 1, 0.82, 0.18]),
    transform: [{ scaleX: interpolate(flareProgress.get(), [0, 1], [0.02, 1]) }],
  }));
  const flareGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flareProgress.get(), [0, 0.18, 0.72, 1], [0, 0.46, 0.22, 0]),
    transform: [
      { scaleX: interpolate(flareProgress.get(), [0, 1], [0.02, 1]) },
      { scaleY: interpolate(flareProgress.get(), [0, 0.55, 1], [0.4, 1.25, 0.8]) },
    ],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(heroLift.get(), [0, 1], [96, 0]) }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.get(),
    transform: [{ scale: markScale.get() }],
  }));
  const wordMaskStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.get(),
    width: 332 * wordReveal.get(),
    transform: [{ translateY: interpolate(wordReveal.get(), [0, 1], [14, 0]) }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.get(),
    transform: [{ scale: bloomScale.get() }],
  }));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.logoSafe}>
      <LinearGradient colors={['#000000', '#030201', '#000000']} style={StyleSheet.absoluteFill} />
      <View accessibilityLabel="BirKare AI açılıyor" style={styles.logoCanvas}>
        <View pointerEvents="none" style={styles.logoOrbitTop} />
        <View pointerEvents="none" style={styles.logoOrbitBottom} />
        <LinearGradient
          colors={['rgba(255,196,0,0)', 'rgba(255,196,0,0.065)', 'rgba(255,196,0,0)']}
          end={{ x: 0.9, y: 0.9 }}
          pointerEvents="none"
          start={{ x: 0.15, y: 0.05 }}
          style={styles.logoWarmVeil}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.98)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0)']}
          locations={[0, 0.48, 1]}
          pointerEvents="none"
          style={styles.logoTopShade}
        />
        <Animated.View pointerEvents="none" style={[styles.logoCenterFlareGlow, flareGlowStyle]} />
        <Animated.View pointerEvents="none" style={[styles.logoCenterFlare, flareStyle]} />
        <Animated.View pointerEvents="none" style={[styles.logoHeroLayer, heroStyle]}>
          <Animated.View pointerEvents="none" style={[styles.logoBloom, bloomStyle]} />
          <Animated.View pointerEvents="none" style={[styles.logoArc, arcStyle]} />
          <Animated.View style={[styles.logoMarkSlot, markStyle]}>
            <Image source={onboardingImages.brandMark} style={styles.logoMarkImage} />
          </Animated.View>
        </Animated.View>
        <View pointerEvents="none" style={styles.logoCopyBlock}>
          <Animated.View style={[styles.logoWordMask, wordMaskStyle]}>
            <View style={styles.logoWordLine}>
              <Text style={styles.logoWordText}>BirKare</Text>
              <Text style={styles.logoWordAi}>ΛI</Text>
            </View>
          </Animated.View>
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(1_760).duration(520)}
            style={styles.logoCaption}
          >
            <Text style={styles.logoCaptionText}>Hayalindeki kareye gir.</Text>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

type PhotoPreludeProps = {
  onFinished: () => void;
};

/**
 * A brief, touch-skippable photo showcase between the brand intro and the
 * first practical card. All supplied `photos` assets run in two opposing,
 * seamless rails so it reads as a living gallery rather than a stack of cards.
 * The selectable Step 1 demo portraits deliberately remain separate.
 */
export function PhotoPrelude({ onFinished }: PhotoPreludeProps) {
  const reducedMotion = useReducedMotion();
  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    impactHaptic();
    onFinishedRef.current();
  }, []);

  useEffect(() => {
    const timer = setTimeout(finish, reducedMotion ? 820 : PHOTO_PRELUDE_DURATION);
    return () => clearTimeout(timer);
  }, [finish, reducedMotion]);

  // Both rails contain seven cards. During the five-second reveal every one
  // of the fourteen supplied showcase images travels through the viewport.
  const showcaseTopRail = showcasePhotos.slice(0, 7);
  const showcaseBottomRail = showcasePhotos.slice(7);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.logoSafe}>
      <LinearGradient colors={['#050505', '#0B0904', '#050505']} style={StyleSheet.absoluteFill} />
      <View accessibilityLabel="Fotoğraflarla onboarding başlangıcı" style={styles.bridgeCanvas}>
        <View pointerEvents="none" style={styles.bridgeOrbitOne} />
        <View pointerEvents="none" style={styles.bridgeOrbitTwo} />
        <PhotoShowcaseRail
          direction="left"
          photos={showcaseTopRail}
          reducedMotion={reducedMotion}
          row="top"
        />
        <PhotoShowcaseRail
          direction="right"
          photos={showcaseBottomRail}
          reducedMotion={reducedMotion}
          row="bottom"
        />
        <LinearGradient
          colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.12)', 'rgba(5,5,5,0.96)']}
          locations={[0, 0.42, 1]}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.delay(440).duration(460)}
          style={styles.bridgeCenter}
        >
          <View style={styles.bridgeMarkHalo}>
            <Image source={onboardingImages.brandMark} style={styles.bridgeMark} />
          </View>
          <Text style={styles.bridgeEyebrow}>BİRKARE AI</Text>
          <Text style={styles.bridgeTitle}>İlk kareni{'\n'}hazırlayalım.</Text>
          <Text style={styles.bridgeBody}>
            Fotoğrafın, sahnen ve tarzın birkaç dokunuşla bir araya gelir.
          </Text>
        </Animated.View>
        <Pressable
          accessibilityLabel="Onboarding'e başla"
          accessibilityRole="button"
          onPress={finish}
          style={({ pressed }) => [styles.bridgeContinue, pressed && styles.bridgeContinuePressed]}
        >
          <Text style={styles.bridgeContinueText}>Başlamak için dokun</Text>
          <Ionicons color={colors.accentYellow} name="arrow-forward" size={19} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PhotoShowcaseRail({
  direction,
  photos,
  reducedMotion,
  row,
}: {
  direction: 'left' | 'right';
  photos: { id: string; source: ImageSourcePropType }[];
  reducedMotion: boolean;
  row: 'top' | 'bottom';
}) {
  const offset = useSharedValue(0);
  const distance = (SHOWCASE_CARD_WIDTH + SHOWCASE_CARD_GAP) * photos.length;
  const strip = [...photos, ...photos];

  useEffect(() => {
    const start = direction === 'left' ? 0 : -distance;
    const finish = direction === 'left' ? -distance : 0;

    if (reducedMotion) {
      offset.set(start);
      return;
    }

    offset.set(start);
    offset.set(
      withRepeat(
        withTiming(finish, { duration: PHOTO_PRELUDE_DURATION, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(offset);
    };
  }, [direction, distance, offset, reducedMotion]);

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.showcaseRailViewport,
        row === 'top' ? styles.showcaseRailTop : styles.showcaseRailBottom,
      ]}
    >
      <Animated.View style={[styles.showcaseRail, railStyle]}>
        {strip.map((photo, index) => (
          <View key={photo.id + '-' + String(index)} style={styles.showcasePhotoCard}>
            <FittedPhotoImage source={photo.source} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.24)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * The practical four-card onboarding. Every card requires a real selection
 * before the next one can open; data lives in this component so the user sees
 * their exact photo and selections from one card through to the final preview.
 */
export function GuidedSplash({ onFinished }: GuidedSplashProps) {
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 520);
  const [step, setStep] = useState<StepIndex>(0);
  const [selectedPhoto, setSelectedPhoto] = useState<OnboardingPhoto | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<OnboardingCategoryId | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<OnboardingFilterId | null>(null);
  const [filterIntensity, setFilterIntensity] = useState(62);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handlePhotoSelected = useCallback((photo: OnboardingPhoto) => {
    setSelectedPhoto(photo);
    selectionHaptic();
  }, []);

  const { busy, selectFromGallery, takePhoto } = useOnboardingPhotoPicker({
    onSelected: handlePhotoSelected,
  });

  const selectedScene = useMemo(
    () => categories.find((scene) => scene.id === selectedSceneId) ?? null,
    [selectedSceneId],
  );
  const selectedFilter = useMemo(
    () => filters.find((filter) => filter.id === selectedFilterId) ?? null,
    [selectedFilterId],
  );
  // The practical first card must never look empty. Until the user chooses a
  // photo, show one of the supplied demo portraits as a clearly labelled
  // preview; selecting a demo/device image replaces it immediately.
  const photoSource = resolveOnboardingPhoto(
    selectedPhoto,
    galleryPhotos[1]?.source ?? onboardingImages.beforePortrait,
  );
  const tint = selectedFilterId ? filterTints[selectedFilterId] : '#B37A20';

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const finishWithAuthenticatedDraft = useCallback(() => {
    if (!selectedPhoto || !selectedSceneId || !selectedFilterId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    // The launch experience is deliberately unauthenticated. Store a
    // one-session selection only; the image is uploaded and sent to OpenAI
    // after consent and sign-in through the protected create flow.
    stageOnboardingCreateDraft({
      photo: selectedPhoto,
      sceneId: selectedSceneId,
      filterId: selectedFilterId,
      filterIntensity,
    });
    impactHaptic();
    onFinished();
  }, [filterIntensity, onFinished, selectedFilterId, selectedPhoto, selectedSceneId]);

  const goNext = useCallback(() => {
    const eligible = [
      Boolean(selectedPhoto),
      Boolean(selectedSceneId),
      Boolean(selectedFilterId),
      true,
    ][step];

    if (!eligible) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (step === 3) {
      finishWithAuthenticatedDraft();
      return;
    }

    impactHaptic();
    setStep((current) => (current + 1) as StepIndex);
  }, [finishWithAuthenticatedDraft, selectedFilterId, selectedPhoto, selectedSceneId, step]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    impactHaptic();
    setStep((current) => (current - 1) as StepIndex);
  }, [step]);

  const header = (
    <StepHeader
      key={step}
      body={
        step === 0
          ? 'Selfie veya portre fotoğrafını seç; görüntü oranını koruyarak ilk kareni hazırla.'
          : step === 1
            ? 'Fotoğrafın hazır. Şimdi görünümünü belirle; hangi sahnede olmak istediğini seç.'
            : step === 2
              ? 'Tarzını belirle. Filtreyi seç, yoğunluğunu ayarla ve sonucu önceden gör.'
              : 'Seçimlerini kontrol et. Gerçek AI üretimi, güvenli biçimde oturum açtıktan sonra başlar.'
      }
      index={step}
      onBack={step > 0 ? goBack : undefined}
      title={
        step === 0
          ? 'Fotoğrafını seç'
          : step === 1
            ? 'Sahneni seç'
            : step === 2
              ? 'Filtreni seç'
              : 'Düzenle ve önizle'
      }
    />
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <LinearGradient colors={['#050505', '#080704', '#050505']} style={StyleSheet.absoluteFill} />
      <View style={[styles.guidedContainer, { maxWidth: contentWidth }]}>
        <ScrollView
          contentOffset={{ x: 0, y: 0 }}
          contentContainerStyle={styles.guidedScrollContent}
          keyboardShouldPersistTaps="handled"
          key={`guided-step-${step}`}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.guidedScroll}
        >
          {header}
          {step === 0 ? (
            <PhotoStep
              busy={busy}
              onDemoPhoto={(photo) => {
                setSelectedPhoto({ kind: 'demo', id: photo.id, source: photo.source });
                selectionHaptic();
              }}
              onGallery={selectFromGallery}
              onCamera={takePhoto}
              photo={selectedPhoto}
              reducedMotion={reducedMotion}
              source={photoSource}
            />
          ) : null}
          {step === 1 ? (
            <SceneStep
              onSelect={(id) => {
                setSelectedSceneId(id);
                selectionHaptic();
              }}
              photoSource={photoSource}
              reducedMotion={reducedMotion}
              selectedId={selectedSceneId}
            />
          ) : null}
          {step === 2 ? (
            <FilterStep
              intensity={filterIntensity}
              onIntensityChange={(value) => {
                setFilterIntensity(value);
              }}
              onSelect={(id) => {
                setSelectedFilterId(id);
                selectionHaptic();
              }}
              photoSource={photoSource}
              reducedMotion={reducedMotion}
              selectedId={selectedFilterId}
            />
          ) : null}
          {step === 3 ? (
            <PreviewStep
              editMode={editMode}
              filterId={selectedFilterId}
              filterName={selectedFilter?.title ?? 'Seçili filtre'}
              filterSource={selectedFilter?.source}
              intensity={filterIntensity}
              onEdit={() => setEditorOpen(true)}
              photoName={selectedPhoto?.kind === 'device' ? 'Kendi fotoğrafın' : 'Demo fotoğraf'}
              photoSource={photoSource}
              reducedMotion={reducedMotion}
              sceneName={selectedScene?.title ?? 'Seçili sahne'}
              sceneSource={selectedScene?.source}
              tint={tint}
            />
          ) : null}
        </ScrollView>

        <View style={styles.guidedFooter}>
          <StepProgress active={step} />
          <Pressable
            accessibilityLabel={
              step === 0
                ? 'Fotoğrafla devam et'
                : step === 1
                  ? 'Sahneyle devam et'
                  : step === 2
                    ? 'Filtreyle devam et'
                    : 'Hesabınla devam et'
            }
            accessibilityRole="button"
            accessibilityState={{
              disabled:
                (step === 0 && !selectedPhoto) ||
                (step === 1 && !selectedSceneId) ||
                (step === 2 && !selectedFilterId),
            }}
            disabled={
              (step === 0 && !selectedPhoto) ||
              (step === 1 && !selectedSceneId) ||
              (step === 2 && !selectedFilterId)
            }
            onPress={goNext}
            style={({ pressed }) => [
              styles.continueButton,
              ((step === 0 && !selectedPhoto) ||
                (step === 1 && !selectedSceneId) ||
                (step === 2 && !selectedFilterId)) &&
                styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
          >
            <LinearGradient
              colors={['#FFE38B', '#FFC400', '#E5A600']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueText}>
                {step === 0
                  ? 'Fotoğrafla devam et'
                  : step === 1
                    ? 'Sahneyle devam et'
                    : step === 2
                      ? 'Filtreyle devam et'
                      : 'Hesabınla devam et'}
              </Text>
              <Ionicons color={colors.background} name="arrow-forward" size={25} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <EditSheet
        key={(editorOpen ? 'open-' : 'closed-') + (editMode ?? 'none')}
        onApply={(mode) => {
          setEditMode(mode);
          setEditorOpen(false);
          successHaptic();
        }}
        onClose={() => setEditorOpen(false)}
        selected={editMode}
        visible={editorOpen}
      />
    </SafeAreaView>
  );
}

function StepHeader({
  body,
  index,
  onBack,
  title,
}: {
  body: string;
  index: StepIndex;
  onBack?: () => void;
  title: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.cardEnter)}
      style={styles.stepHeader}
    >
      <View style={styles.stepHeaderTop}>
        <View style={styles.stepEyebrowWrap}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Önceki adıma dön"
              hitSlop={10}
              onPress={onBack}
              style={styles.backButton}
            >
              <Ionicons color={colors.textPrimary} name="arrow-back" size={20} />
            </Pressable>
          ) : null}
          <Text style={styles.stepEyebrow}>{String(index + 1) + '. ADIM'}</Text>
        </View>
        <View accessibilityLabel={String(index + 1) + ' / 4'} style={styles.stepCount}>
          <Text style={styles.stepCountActive}>{String(index + 1)}</Text>
          <Text style={styles.stepCountDivider}> / </Text>
          <Text style={styles.stepCountTotal}>4</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.stepTitle}>
        {title}
      </Text>
      <Text style={styles.stepBody}>{body}</Text>
    </Animated.View>
  );
}

function PhotoStep({
  busy,
  onCamera,
  onDemoPhoto,
  onGallery,
  photo,
  reducedMotion,
  source,
}: {
  busy: boolean;
  onCamera: () => void;
  onDemoPhoto: (item: { id: string; source: ImageSourcePropType }) => void;
  onGallery: () => void;
  photo: OnboardingPhoto | null;
  reducedMotion: boolean;
  source: ImageSourcePropType;
}) {
  // Demo assets are 4:5 while a camera photo can be portrait or landscape.
  // Derive a bounded canvas from the source metadata and let `contain` do the
  // final fit so no face or lower body area is silently cropped.
  const resolvedSource = Image.resolveAssetSource(source);
  const nativeAspectRatio =
    photo?.kind === 'device' && photo.width && photo.height
      ? photo.width / photo.height
      : resolvedSource.width && resolvedSource.height
        ? resolvedSource.width / resolvedSource.height
        : 1;
  const photoHeroAspectRatio = Math.min(Math.max(nativeAspectRatio, 0.72), 1);

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(180) : FadeInRight.duration(motion.duration.screen)}
      exiting={reducedMotion ? undefined : FadeOutLeft.duration(motion.duration.fast)}
      style={styles.stepContent}
    >
      <Animated.View
        entering={FadeInDown.delay(motion.stagger.short).duration(motion.duration.cardEnter)}
        style={[styles.photoHero, { aspectRatio: photoHeroAspectRatio }]}
      >
        <FittedPhotoImage source={source} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.78)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.photoHeroTop}>
          <MiniPill icon="expand-outline" label="Orijinal oran korunur" />
        </View>
        <View style={styles.photoHeroCopy}>
          <Text style={styles.photoHeroTitle}>
            {photo ? 'Fotoğrafın hazır' : 'Örnek kareyle başla'}
          </Text>
          <Text style={styles.photoHeroBody}>
            {photo?.kind === 'device'
              ? (photo.fileName ?? 'Cihazından seçilen fotoğraf')
              : photo
                ? 'Demo fotoğraf seçildi'
                : 'Aşağıdaki demo fotoğraflarından birini seçerek akışı hemen deneyebilirsin.'}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.photoActions}>
        <ActionCard
          disabled={busy}
          icon="images-outline"
          label="Galeriden seç"
          onPress={onGallery}
        />
        <ActionCard disabled={busy} icon="camera-outline" label="Fotoğraf çek" onPress={onCamera} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Demo fotoğrafları</Text>
        <Text style={styles.sectionHint}>Akışı denemek için seç</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.demoRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {galleryPhotos.map((item, index) => {
          const active = photo?.kind === 'demo' && photo.id === item.id;
          return (
            <Animated.View
              entering={FadeInDown.delay(120 + index * motion.stagger.short).duration(
                motion.duration.imageChange,
              )}
              key={item.id}
            >
              <Pressable
                accessibilityLabel={'Demo fotoğraf ' + String(index + 1)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => onDemoPhoto(item)}
                style={({ pressed }) => [
                  styles.demoCard,
                  active && styles.demoCardActive,
                  pressed && styles.pressedCard,
                ]}
              >
                <FittedPhotoImage source={item.source} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
                  style={StyleSheet.absoluteFill}
                />
                {active ? (
                  <View style={styles.demoCheck}>
                    <Ionicons color={colors.background} name="checkmark" size={15} />
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <InfoNote icon="lock-closed-outline">
        Sadece kendi fotoğrafını veya kullanım iznine sahip olduğun bir görseli seç.
      </InfoNote>
      <MotionNote>
        Animasyon: Kart yumuşakça yukarı gelir, önizleme hafif parallax ile belirir.
      </MotionNote>
    </Animated.View>
  );
}

function SceneStep({
  onSelect,
  photoSource,
  reducedMotion,
  selectedId,
}: {
  onSelect: (id: OnboardingCategoryId) => void;
  photoSource: ImageSourcePropType;
  reducedMotion: boolean;
  selectedId: OnboardingCategoryId | null;
}) {
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(180) : FadeInRight.duration(motion.duration.screen)}
      exiting={reducedMotion ? undefined : FadeOutLeft.duration(motion.duration.fast)}
      style={styles.stepContent}
    >
      <View style={styles.sceneGrid}>
        {categories.map((scene, index) => {
          const active = scene.id === selectedId;
          return (
            <Animated.View
              entering={FadeInDown.delay(55 + index * motion.stagger.normal).duration(
                motion.duration.cardEnter,
              )}
              key={scene.id}
              style={styles.sceneGridItem}
            >
              <Pressable
                accessibilityLabel={scene.title}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => onSelect(scene.id)}
                style={({ pressed }) => [
                  styles.sceneCard,
                  active && styles.sceneCardActive,
                  pressed && styles.sceneCardPressed,
                ]}
              >
                <FittedPhotoImage source={scene.source} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.23)', 'rgba(0,0,0,0.94)']}
                  style={StyleSheet.absoluteFill}
                />
                {active ? (
                  <View style={styles.sceneCheck}>
                    <Ionicons color={colors.background} name="checkmark" size={15} />
                  </View>
                ) : null}
                {scene.badge ? (
                  <View style={styles.scenePopularBadge}>
                    <Text style={styles.scenePopularBadgeText}>{scene.badge.toUpperCase()}</Text>
                  </View>
                ) : null}
                <View style={styles.sceneCardCopy}>
                  <View style={styles.sceneIcon}>
                    <Ionicons color={colors.accentYellow} name={scene.icon} size={18} />
                  </View>
                  <Text numberOfLines={2} style={styles.sceneTitle}>
                    {scene.title}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.sceneReadyRow}>
        <FittedPhotoImage source={photoSource} style={styles.sceneReadyPhoto} />
        <View style={styles.sceneReadyCopy}>
          <Text style={styles.sceneReadyTitle}>Fotoğrafın sahne için hazır</Text>
          <Text style={styles.sceneReadyBody}>Seçimin final önizlemene aktarılır.</Text>
        </View>
      </View>

      <InfoNote icon="bulb-outline">
        Uzman ipucu: Amacına en yakın sahneyi seç; filtre adımında görünümünü ayrıca
        özelleştirebilirsin.
      </InfoNote>
      <MotionNote>
        Animasyon: Kartlar hafif fade-up ile gelir, seçilen sahne yumuşak ışıkla vurgulanır.
      </MotionNote>
    </Animated.View>
  );
}

function FilterStep({
  intensity,
  onIntensityChange,
  onSelect,
  photoSource,
  reducedMotion,
  selectedId,
}: {
  intensity: number;
  onIntensityChange: (value: number) => void;
  onSelect: (id: OnboardingFilterId) => void;
  photoSource: ImageSourcePropType;
  reducedMotion: boolean;
  selectedId: OnboardingFilterId | null;
}) {
  const { width } = useWindowDimensions();
  const trackWidth = Math.max(Math.min(width - 104, 420), 220);
  const sliderProgress = useSharedValue(intensity / 100);
  const sliderStart = useSharedValue(intensity / 100);

  useEffect(() => {
    sliderProgress.set(intensity / 100);
  }, [intensity, sliderProgress]);

  const commitIntensity = useCallback(
    (progress: number) => {
      onIntensityChange(Math.round(clamp(progress) * 100));
      selectionHaptic();
    },
    [onIntensityChange],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-4, 4])
        .failOffsetY([-24, 24])
        .onBegin(() => {
          sliderStart.set(sliderProgress.get());
        })
        .onUpdate((event) => {
          sliderProgress.set(clamp(sliderStart.get() + event.translationX / trackWidth));
          runOnJS(onIntensityChange)(Math.round(sliderProgress.get() * 100));
        })
        .onEnd(() => {
          runOnJS(commitIntensity)(sliderProgress.get());
        }),
    [commitIntensity, onIntensityChange, sliderProgress, sliderStart, trackWidth],
  );

  const sliderFillStyle = useAnimatedStyle(() => ({
    width: sliderProgress.get() * trackWidth,
  }));
  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderProgress.get() * trackWidth - 13 }],
  }));

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(180) : FadeInRight.duration(motion.duration.screen)}
      exiting={reducedMotion ? undefined : FadeOutLeft.duration(motion.duration.fast)}
      style={styles.stepContent}
    >
      <Animated.View
        entering={FadeInDown.delay(motion.stagger.short).duration(motion.duration.cardEnter)}
        style={styles.filterHero}
      >
        <FittedPhotoImage source={photoSource} style={StyleSheet.absoluteFill} />
        <FilterToneLayers filterId={selectedId} intensity={intensity} />
        <LinearGradient
          colors={['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.64)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.filterAiBadge}>
          <Ionicons color={colors.background} name="sparkles" size={13} />
          <Text style={styles.filterAiBadgeText}>
            Yaklaşık ton önizlemesi
          </Text>
        </View>
        <View style={styles.originalThumb}>
          <FittedPhotoImage source={photoSource} style={StyleSheet.absoluteFill} />
          <View style={styles.originalThumbCaption}>
            <Text style={styles.originalThumbText}>Orijinal</Text>
          </View>
        </View>
        <Text style={styles.filterPreviewCopy}>
          {selectedId
            ? (filters.find((item) => item.id === selectedId)?.title ?? 'Seçili filtre')
            : 'Bir filtre seç'}
        </Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {filters.map((filter, index) => {
          const active = selectedId === filter.id;
          return (
            <Animated.View
              entering={FadeInDown.delay(80 + index * 32).duration(motion.duration.imageChange)}
              key={filter.id}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => onSelect(filter.id)}
                style={({ pressed }) => [
                  styles.filterCard,
                  active && styles.filterCardActive,
                  pressed && styles.filterCardPressed,
                ]}
              >
                <FittedPhotoImage source={filter.source} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
                  style={StyleSheet.absoluteFill}
                />
                {active ? (
                  <View style={styles.filterCheck}>
                    <Ionicons color={colors.background} name="checkmark" size={14} />
                  </View>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[styles.filterCardTitle, active && styles.filterCardTitleActive]}
                >
                  {filter.title}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={styles.intensityCard}>
        <View style={styles.intensityHeader}>
          <Text style={styles.intensityTitle}>Filtre yoğunluğu</Text>
          <Text style={styles.intensityValue}>%{String(intensity)}</Text>
        </View>
        <GestureDetector gesture={sliderGesture}>
          <Animated.View
            accessibilityActions={[
              { name: 'increment', label: 'Yoğunluğu artır' },
              { name: 'decrement', label: 'Yoğunluğu azalt' },
            ]}
            accessibilityLabel="Filtre yoğunluğu kaydırıcısı"
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 0, max: 100, now: intensity, text: '%' + String(intensity) }}
            onAccessibilityAction={(event) => {
              const next = clamp(
                (intensity + (event.nativeEvent.actionName === 'increment' ? 5 : -5)) / 100,
              );
              sliderProgress.set(next);
              commitIntensity(next);
            }}
            style={[styles.sliderTouch, { width: trackWidth }]}
          >
            <View style={styles.sliderTrack} />
            <Animated.View style={[styles.sliderFill, sliderFillStyle]} />
            <Animated.View style={[styles.sliderThumb, sliderThumbStyle]} />
          </Animated.View>
        </GestureDetector>
        <View style={[styles.sliderLabels, { width: trackWidth }]}>
          <Text style={styles.sliderLabel}>Düşük</Text>
          <Text style={styles.sliderLabel}>Orta</Text>
          <Text style={styles.sliderLabel}>Yüksek</Text>
        </View>
      </View>

      <InfoNote icon="sparkles-outline">
        <Text style={styles.infoAccent}>Ücretsiz yerel önizleme: </Text>Yoğunluk burada ışık ve
        tonu değiştirir. Filtrenin gerçek AI dokusu üretim onayından sonra oluşur.
      </InfoNote>
      <MotionNote>
        Animasyon: Önizleme flu görünümden netliğe geçer, seçilen filtre hafif zoom ile öne çıkar.
      </MotionNote>
    </Animated.View>
  );
}

function PreviewStep({
  editMode,
  filterId,
  filterName,
  filterSource,
  intensity,
  onEdit,
  photoName,
  photoSource,
  reducedMotion,
  sceneName,
  sceneSource,
  tint,
}: {
  editMode: EditMode | null;
  filterId: OnboardingFilterId | null;
  filterName: string;
  filterSource?: ImageSourcePropType;
  intensity: number;
  onEdit: () => void;
  photoName: string;
  photoSource: ImageSourcePropType;
  reducedMotion: boolean;
  sceneName: string;
  sceneSource?: ImageSourcePropType;
  tint: string;
}) {
  const [comparisonWidth, setComparisonWidth] = useState(0);
  const dividerProgress = useSharedValue(0.5);
  const dividerStart = useSharedValue(0.5);

  const compareGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-7, 7])
        .failOffsetY([-28, 28])
        .onBegin(() => {
          dividerStart.set(dividerProgress.get());
        })
        .onUpdate((event) => {
          if (comparisonWidth > 0) {
            dividerProgress.set(
              clamp(dividerStart.get() + event.translationX / comparisonWidth, 0.08, 0.92),
            );
          }
        }),
    [comparisonWidth, dividerProgress, dividerStart],
  );

  const afterSliceStyle = useAnimatedStyle(() => {
    const left = dividerProgress.get() * comparisonWidth;
    return { left, width: Math.max(comparisonWidth - left, 0) };
  });
  const afterCanvasStyle = useAnimatedStyle(() => ({
    width: comparisonWidth,
    transform: [{ translateX: -dividerProgress.get() * comparisonWidth }],
  }));
  const dividerStyle = useAnimatedStyle(() => ({
    left: dividerProgress.get() * comparisonWidth - 1,
  }));

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(180) : FadeInRight.duration(motion.duration.screen)}
      exiting={reducedMotion ? undefined : FadeOutLeft.duration(motion.duration.fast)}
      style={styles.stepContent}
    >
      <Animated.View
        entering={FadeInDown.delay(motion.stagger.short).duration(motion.duration.cardEnter)}
        style={styles.compareCard}
      >
        <GestureDetector gesture={compareGesture}>
          <Animated.View
            accessibilityActions={[
              { name: 'increment', label: 'Sonra görünümünü genişlet' },
              { name: 'decrement', label: 'Önce görünümünü genişlet' },
            ]}
            accessibilityHint="Önce ve sonra görünümünü karşılaştırmak için yatay kaydır."
            accessibilityLabel="Önce ve sonra karşılaştırması"
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 8, max: 92, text: 'Kaydırılabilir karşılaştırma' }}
            onAccessibilityAction={(event) => {
              const delta = event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1;
              dividerProgress.set(clamp(dividerProgress.get() + delta, 0.08, 0.92));
            }}
            onLayout={(event) => setComparisonWidth(event.nativeEvent.layout.width)}
            style={styles.compareCanvas}
          >
            <FittedPhotoImage source={photoSource} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)']}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.afterSlice, afterSliceStyle]}>
              <Animated.View style={[styles.afterCanvas, afterCanvasStyle]}>
                {sceneSource ? (
                  <Image
                    fadeDuration={0}
                    resizeMode="cover"
                    source={sceneSource}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <LinearGradient
                  colors={['rgba(5,5,5,0.08)', 'rgba(5,5,5,0.22)', 'rgba(5,5,5,0.62)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.afterSubjectFrame}>
                  {editMode === 'Kadraj' ? (
                    <Image
                      fadeDuration={0}
                      source={photoSource}
                      style={[StyleSheet.absoluteFill, styles.imageCover, styles.afterPhotoCropped]}
                    />
                  ) : (
                    <FittedPhotoImage source={photoSource} style={StyleSheet.absoluteFill} />
                  )}
                  <FilterToneLayers filterId={filterId} intensity={intensity} />
                  {editMode === 'Işık' ? (
                    <View pointerEvents="none" style={styles.lightLayer} />
                  ) : null}
                </View>
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: tint, opacity: intensity / 2000 },
                  ]}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.48)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.compareDivider, dividerStyle]}>
              <View style={styles.compareHandle}>
                <Ionicons color={colors.accentYellow} name="chevron-back-outline" size={15} />
                <Ionicons color={colors.accentYellow} name="chevron-forward-outline" size={15} />
              </View>
            </Animated.View>
            <View style={styles.beforeLabel}>
              <Text style={styles.beforeLabelText}>Önce</Text>
            </View>
            <View style={styles.afterLabel}>
              <Text style={styles.afterLabelText}>Sonra</Text>
            </View>
            {editMode === 'Yüz koruma' ? (
              <View style={styles.faceChip}>
                <Ionicons color={colors.background} name="shield-checkmark" size={12} />
                <Text style={styles.faceChipText}>Yüz koruma</Text>
              </View>
            ) : null}
            <View style={styles.compareTip}>
              <Ionicons color={colors.textPrimary} name="arrow-back" size={14} />
              <Text style={styles.compareTipText}>Kaydırarak karşılaştır</Text>
              <Ionicons color={colors.textPrimary} name="arrow-forward" size={14} />
            </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>

      <View style={styles.selectionPreviewRow}>
        <PreviewSelection imageSource={photoSource} label="FOTOĞRAF" value={photoName} />
        <PreviewSelection imageSource={sceneSource} label="SAHNE" value={sceneName} />
        <PreviewSelection imageSource={filterSource} label="FİLTRE" value={filterName} />
      </View>

      <View style={styles.previewActions}>
        <ActionCard icon="options-outline" label="Düzenle" onPress={onEdit} />
      </View>

      <View style={styles.generationCard}>
        <View style={styles.generationIcon}>
          <Ionicons color={colors.accentYellow} name="shield-checkmark-outline" size={21} />
        </View>
        <View style={styles.generationCopy}>
          <Text style={styles.generationTitle}>Seçimlerin gerçek üretime hazır</Text>
          <Text style={styles.generationBody}>
            {sceneName}, {filterName} ve %{String(intensity)} yoğunluk; onay ve girişten sonra aynı
            ayarlarla gerçek AI üretimine aktarılacak.
          </Text>
        </View>
      </View>
      <InfoNote icon="shield-checkmark-outline">
        Uzman notu: Işık ve yüz dengesi uygunsa önizleme çok daha doğal görünür.
      </InfoNote>
      <MotionNote>
        Temsilî karşılaştırmayı kaydırarak inceleyebilir, üretimi hesabınla güvenli biçimde
        başlatabilirsin.
      </MotionNote>
    </Animated.View>
  );
}

function PreviewSelection({
  imageSource,
  label,
  value,
}: {
  imageSource?: ImageSourcePropType;
  label: string;
  value: string;
}) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.selectionPreviewCard}>
      {imageSource ? (
        <FittedPhotoImage source={imageSource} style={styles.selectionPreviewImage} />
      ) : (
        <View style={styles.selectionPreviewImageFallback}>
          <Ionicons color={colors.accentYellow} name="image-outline" size={18} />
        </View>
      )}
      <Text style={styles.selectionPreviewLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.selectionPreviewValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        impactHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionCard,
        disabled && styles.actionCardDisabled,
        pressed && !disabled && styles.pressedCard,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons color={disabled ? colors.textMuted : colors.accentYellow} name={icon} size={25} />
      </View>
      <Text numberOfLines={2} style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniPill({
  icon,
  label,
  strong = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  strong?: boolean;
}) {
  return (
    <View style={[styles.miniPill, strong && styles.miniPillStrong]}>
      <Ionicons color={colors.accentYellow} name={icon} size={15} />
      <Text style={[styles.miniPillText, strong && styles.miniPillTextStrong]}>{label}</Text>
    </View>
  );
}

function InfoNote({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.infoNote}>
      <Ionicons color={colors.accentYellow} name={icon} size={20} />
      <Text style={styles.infoNoteText}>{children}</Text>
    </View>
  );
}

function MotionNote({ children }: { children: string }) {
  return (
    <View style={styles.motionNote}>
      <Ionicons color={colors.accentYellow} name="sparkles-outline" size={15} />
      <Text style={styles.motionNoteText}>{children}</Text>
    </View>
  );
}

function StepProgress({ active }: { active: StepIndex }) {
  return (
    <View
      accessibilityLabel={'Onboarding ' + String(active + 1) + ' / 4'}
      style={styles.progressRow}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.progressItem}>
          <View style={[styles.progressDot, index <= active && styles.progressDotActive]} />
          {index < 3 ? (
            <View style={[styles.progressLine, index < active && styles.progressLineActive]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function EditSheet({
  onApply,
  onClose,
  selected,
  visible,
}: {
  onApply: (mode: EditMode) => void;
  onClose: () => void;
  selected: EditMode | null;
  visible: boolean;
}) {
  const [chosen, setChosen] = useState<EditMode>(selected ?? 'Işık');
  const options = [
    { label: 'Işık' as EditMode, icon: 'sunny-outline' as const },
    { label: 'Kadraj' as EditMode, icon: 'crop-outline' as const },
    { label: 'Yüz koruma' as EditMode, icon: 'shield-checkmark-outline' as const },
  ];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityLabel="Düzenlemeyi kapat"
          onPress={onClose}
          style={styles.sheetBackdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>HIZLI DÜZENLEME</Text>
              <Text style={styles.sheetTitle}>Küçük dokunuşlar</Text>
            </View>
            <Pressable
              accessibilityLabel="Düzenlemeyi kapat"
              onPress={onClose}
              style={styles.sheetClose}
            >
              <Ionicons color={colors.textPrimary} name="close" size={20} />
            </Pressable>
          </View>
          <Text style={styles.sheetBody}>
            Seçimin yerel önizlemene anında uygulanır. Asıl AI üretimi yalnızca onayından sonra
            başlar.
          </Text>
          <View style={styles.editOptionRow}>
            {options.map((option) => {
              const active = chosen === option.label;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  key={option.label}
                  onPress={() => {
                    setChosen(option.label);
                    selectionHaptic();
                  }}
                  style={[styles.editOption, active && styles.editOptionActive]}
                >
                  <Ionicons
                    color={active ? colors.background : colors.accentYellow}
                    name={option.icon}
                    size={22}
                  />
                  <Text style={[styles.editOptionText, active && styles.editOptionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => onApply(chosen)} style={styles.sheetDone}>
            <Text style={styles.sheetDoneText}>Uygula ve dön</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  logoSafe: {
    backgroundColor: '#000000',
    flex: 1,
  },
  logoCanvas: {
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  logoOrbitTop: {
    borderColor: 'rgba(255,196,0,0.22)',
    borderRadius: 430,
    borderWidth: 1,
    height: 860,
    position: 'absolute',
    right: -515,
    top: -475,
    width: 860,
  },
  logoOrbitBottom: {
    borderColor: 'rgba(255,196,0,0.17)',
    borderRadius: 390,
    borderWidth: 1,
    bottom: -545,
    height: 780,
    left: -420,
    position: 'absolute',
    width: 780,
  },
  logoWarmVeil: {
    bottom: 0,
    left: 0,
    opacity: 0.48,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  logoTopShade: {
    height: '54%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  logoHeroLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  logoBloom: {
    backgroundColor: 'rgba(255,196,0,0.08)',
    borderRadius: 180,
    height: 360,
    left: '50%',
    marginLeft: -180,
    position: 'absolute',
    top: '25%',
    width: 360,
  },
  logoCenterFlare: {
    backgroundColor: '#FFD54A',
    borderRadius: 999,
    height: 1.5,
    left: '50%',
    marginLeft: -180,
    position: 'absolute',
    top: '50%',
    width: 360,
    zIndex: 3,
  },
  logoCenterFlareGlow: {
    backgroundColor: 'rgba(255,196,0,0.22)',
    borderRadius: 999,
    height: 14,
    left: '50%',
    marginLeft: -190,
    marginTop: -6,
    position: 'absolute',
    shadowColor: '#FFC400',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.58,
    shadowRadius: 18,
    top: '50%',
    width: 380,
    zIndex: 2,
  },
  logoArc: {
    borderColor: 'rgba(255,196,0,0.88)',
    borderRadius: 180,
    borderRightColor: 'rgba(255,196,0,0.04)',
    borderTopColor: 'rgba(255,196,0,0.13)',
    borderWidth: 1.15,
    height: 360,
    left: '50%',
    marginLeft: -180,
    position: 'absolute',
    top: '25%',
    width: 360,
  },
  logoMarkSlot: {
    height: 188,
    left: '50%',
    marginLeft: -94,
    position: 'absolute',
    top: '31%',
    width: 188,
  },
  logoMarkImage: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  logoCopyBlock: {
    alignItems: 'center',
    bottom: '16%',
    left: 18,
    position: 'absolute',
    right: 18,
  },
  logoWordMask: {
    height: 64,
    overflow: 'hidden',
  },
  logoWordLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    width: 332,
  },
  logoWordText: {
    color: '#FFD34F',
    fontSize: 49,
    fontWeight: '500',
    letterSpacing: -2.25,
    lineHeight: 62,
    textShadowColor: 'rgba(255,196,0,0.24)',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 9,
  },
  logoWordAi: {
    color: '#FFE899',
    fontSize: 47,
    fontWeight: '400',
    letterSpacing: -1.6,
    lineHeight: 62,
    marginLeft: 9,
    textShadowColor: 'rgba(255,196,0,0.22)',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 9,
  },
  logoCaption: {
    marginTop: 6,
  },
  logoCaptionText: {
    color: '#E8DEC8',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.45,
  },
  bridgeCanvas: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bridgeOrbitOne: {
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: 230,
    borderWidth: 1,
    height: 460,
    left: -230,
    position: 'absolute',
    top: -100,
    width: 460,
  },
  bridgeOrbitTwo: {
    borderColor: 'rgba(124,58,237,0.38)',
    borderRadius: 260,
    borderWidth: 1,
    bottom: -210,
    height: 520,
    position: 'absolute',
    right: -280,
    width: 520,
  },
  showcaseRailViewport: {
    height: SHOWCASE_CARD_HEIGHT + 6,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  showcaseRailTop: {
    top: 58,
  },
  showcaseRailBottom: {
    top: 218,
  },
  showcaseRail: {
    flexDirection: 'row',
  },
  showcasePhotoCard: {
    alignItems: 'center',
    backgroundColor: '#15120C',
    borderColor: 'rgba(255,220,121,0.68)',
    borderRadius: 19,
    borderWidth: 1,
    height: SHOWCASE_CARD_HEIGHT,
    justifyContent: 'center',
    marginRight: SHOWCASE_CARD_GAP,
    overflow: 'hidden',
    width: SHOWCASE_CARD_WIDTH,
    ...shadows.floating,
  },
  bridgeCenter: {
    alignItems: 'center',
    maxWidth: 300,
    paddingHorizontal: 22,
    position: 'absolute',
    bottom: 93,
  },
  bridgeMarkHalo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.10)',
    borderColor: 'rgba(255,196,0,0.42)',
    borderRadius: 43,
    borderWidth: 1,
    height: 86,
    justifyContent: 'center',
    width: 86,
    ...shadows.yellow,
  },
  bridgeMark: {
    height: 67,
    resizeMode: 'contain',
    width: 67,
  },
  bridgeEyebrow: {
    color: colors.accentYellow,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginTop: 19,
  },
  bridgeTitle: {
    color: colors.textPrimary,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -1.1,
    lineHeight: 36,
    marginTop: 9,
    textAlign: 'center',
  },
  bridgeBody: {
    color: '#C4C0B6',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    textAlign: 'center',
  },
  bridgeContinue: {
    alignItems: 'center',
    bottom: 35,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    position: 'absolute',
  },
  bridgeContinuePressed: {
    opacity: 0.7,
    transform: [{ scale: motion.scale.pressed }],
  },
  bridgeContinueText: {
    color: '#D5D0C4',
    fontSize: 13,
    fontWeight: '800',
  },
  guidedContainer: {
    alignSelf: 'center',
    flex: 1,
    width: '100%',
  },
  guidedScroll: {
    flex: 1,
  },
  guidedScrollContent: {
    // Keep the final image row clear of the persistent CTA.  This matters on
    // compact iPhones, where a natural-height ScrollView otherwise renders the
    // demo rail below the footer and makes it appear as though the assets are
    // missing.
    paddingBottom: 142,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  stepHeader: {
    paddingHorizontal: 8,
  },
  stepHeaderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepEyebrowWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 34,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stepEyebrow: {
    color: colors.accentYellow,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  stepCount: {
    alignItems: 'center',
    backgroundColor: 'rgba(21,17,7,0.72)',
    borderColor: 'rgba(255,196,0,0.34)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stepCountActive: {
    color: colors.accentYellow,
    fontSize: 18,
    fontWeight: '900',
  },
  stepCountDivider: {
    color: '#83795D',
    fontSize: 14,
    fontWeight: '700',
  },
  stepCountTotal: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -1.35,
    lineHeight: 39,
    marginTop: 9,
  },
  stepBody: {
    color: '#B7B7B9',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    maxWidth: 410,
  },
  stepContent: {
    marginTop: 15,
  },
  photoHero: {
    // The aspect ratio is applied per source in `PhotoStep`.  `contain`
    // preserves a picked image's original ratio instead of silently forcing
    // it into a 4:5 or landscape crop.
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.yellow,
  },
  // An ordinary 100% x 100% Image child is deliberately used instead of a
  // purely absolute Image. It makes iOS honour `contain` consistently after
  // reloads, so demo and showcase images are never silently cropped.
  fittedPhotoCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fittedPhotoImage: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  imageCover: {
    objectFit: 'cover',
  },
  photoHeroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'space-between',
    left: 13,
    position: 'absolute',
    right: 13,
    top: 13,
  },
  miniPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.82)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  miniPillStrong: {
    borderColor: 'rgba(255,196,0,0.52)',
  },
  miniPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  miniPillTextStrong: {
    color: colors.accentYellow,
  },
  photoHeroCopy: {
    bottom: 0,
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
  },
  photoHeroTitle: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  photoHeroBody: {
    color: '#D4D4D5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: 'rgba(255,196,0,0.27)',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 9,
    justifyContent: 'center',
    minHeight: 86,
    paddingHorizontal: 8,
  },
  actionCardDisabled: {
    borderColor: colors.border,
    opacity: 0.45,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.14)',
    borderRadius: 15,
    height: 47,
    justifyContent: 'center',
    width: 47,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  actionLabelDisabled: {
    color: colors.textMuted,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  sectionHint: {
    color: colors.accentYellow,
    fontSize: 11,
    fontWeight: '800',
  },
  demoRow: {
    gap: 7,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 12,
  },
  demoCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    // Supplied demos are 4:5 portraits. Matching that canvas shows the full
    // frame—including the lower part—without a crop.
    height: 90,
    overflow: 'hidden',
    justifyContent: 'center',
    width: 72,
  },
  demoCardActive: {
    borderColor: colors.accentYellow,
    borderWidth: 2,
    transform: [{ scale: motion.scale.thumbnailSelected }],
  },
  demoCheck: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
  },
  infoNote: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,26,14,0.62)',
    borderColor: 'rgba(255,196,0,0.32)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 22,
    padding: 14,
  },
  infoNoteText: {
    color: '#D1C7AD',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  infoAccent: {
    color: colors.accentYellow,
    fontWeight: '900',
  },
  motionNote: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,196,0,0.04)',
    borderColor: 'rgba(255,196,0,0.20)',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 17,
    maxWidth: 340,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  motionNoteText: {
    color: '#AAA18E',
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  sceneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sceneGridItem: {
    flexBasis: '46%',
    flexGrow: 1,
    maxWidth: '49%',
    minWidth: 0,
  },
  sceneCard: {
    aspectRatio: 1122 / 1402,
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sceneCardActive: {
    borderColor: colors.accentYellow,
    borderWidth: 2,
    shadowColor: colors.accentYellow,
    shadowOpacity: 0.28,
    shadowRadius: 13,
    transform: [{ scale: motion.scale.selected }],
  },
  sceneCardPressed: {
    opacity: 0.87,
    transform: [{ scale: motion.scale.pressed }],
  },
  sceneCheck: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 9,
    top: 9,
    width: 30,
  },
  scenePopularBadge: {
    backgroundColor: 'rgba(5,5,5,0.82)',
    borderColor: 'rgba(255,196,0,0.48)',
    borderRadius: 999,
    borderWidth: 1,
    left: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
    top: 9,
  },
  scenePopularBadgeText: {
    color: colors.accentYellow,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  sceneCardCopy: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 7,
    left: 0,
    padding: 12,
    position: 'absolute',
    right: 0,
  },
  sceneIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.80)',
    borderColor: 'rgba(255,196,0,0.45)',
    borderRadius: 18,
    borderWidth: 1,
    height: 35,
    justifyContent: 'center',
    width: 35,
  },
  sceneTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  sceneReadyRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.06)',
    borderColor: 'rgba(255,196,0,0.23)',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 19,
    padding: 10,
  },
  sceneReadyPhoto: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    height: 46,
    overflow: 'hidden',
    width: 38,
  },
  sceneReadyCopy: {
    flex: 1,
  },
  sceneReadyTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  sceneReadyBody: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
  filterHero: {
    isolation: 'isolate',
    aspectRatio: 1.28,
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterAiBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    left: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 13,
  },
  filterAiBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '900',
  },
  originalThumb: {
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    borderWidth: 1,
    height: 98,
    overflow: 'hidden',
    position: 'absolute',
    right: 13,
    top: 13,
    width: 73,
  },
  originalThumbCaption: {
    backgroundColor: 'rgba(5,5,5,0.76)',
    bottom: 0,
    left: 0,
    paddingVertical: 6,
    position: 'absolute',
    right: 0,
  },
  originalThumbText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  filterPreviewCopy: {
    bottom: 15,
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: '900',
    left: 16,
    position: 'absolute',
  },
  filterRow: {
    gap: 10,
    paddingRight: 20,
    paddingTop: 16,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 142,
    overflow: 'hidden',
    width: 104,
  },
  filterCardActive: {
    borderColor: colors.accentYellow,
    borderWidth: 2,
    transform: [{ scale: motion.scale.selected }],
  },
  filterCardPressed: {
    opacity: 0.86,
    transform: [{ scale: motion.scale.pressed }],
  },
  filterCheck: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 28,
  },
  filterCardTitle: {
    bottom: 10,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    left: 10,
    position: 'absolute',
    right: 10,
  },
  filterCardTitleActive: {
    color: colors.accentYellow,
  },
  intensityCard: {
    backgroundColor: '#111111',
    borderColor: colors.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  intensityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  intensityValue: {
    color: colors.accentYellow,
    fontSize: 14,
    fontWeight: '900',
  },
  sliderTouch: {
    height: 42,
    justifyContent: 'center',
    marginTop: 12,
  },
  sliderTrack: {
    backgroundColor: '#2E2E2E',
    borderRadius: 999,
    height: 8,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sliderFill: {
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    height: 8,
    left: 0,
    position: 'absolute',
  },
  sliderThumb: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFF1A3',
    borderRadius: 15,
    borderWidth: 1,
    height: 27,
    left: 0,
    position: 'absolute',
    width: 27,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  compareCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.yellow,
  },
  compareCanvas: {
    aspectRatio: 4 / 5,
    overflow: 'hidden',
  },
  afterSlice: {
    bottom: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  afterCanvas: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  afterSubjectFrame: {
    isolation: 'isolate',
    backgroundColor: '#080808',
    borderColor: 'rgba(255,255,255,0.58)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 34,
    left: 23,
    overflow: 'hidden',
    position: 'absolute',
    right: 23,
    top: 34,
    ...shadows.floating,
  },
  afterPhotoCropped: {
    transform: [{ scale: 1.08 }],
  },
  lightLayer: {
    backgroundColor: '#FFF3C4',
    bottom: 0,
    left: 0,
    opacity: 0.12,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  compareDivider: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  compareHandle: {
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: colors.accentYellow,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    left: -23,
    position: 'absolute',
    top: '50%',
    width: 48,
  },
  beforeLabel: {
    backgroundColor: 'rgba(5,5,5,0.79)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    left: 13,
    paddingHorizontal: 13,
    paddingVertical: 8,
    position: 'absolute',
    top: 13,
  },
  beforeLabelText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  afterLabel: {
    backgroundColor: 'rgba(5,5,5,0.79)',
    borderColor: 'rgba(255,196,0,0.42)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    position: 'absolute',
    right: 13,
    top: 13,
  },
  afterLabelText: {
    color: colors.accentYellow,
    fontSize: 12,
    fontWeight: '800',
  },
  faceChip: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    bottom: 55,
    flexDirection: 'row',
    gap: 4,
    left: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  faceChipText: {
    color: colors.background,
    fontSize: 9,
    fontWeight: '900',
  },
  compareTip: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.68)',
    borderRadius: 999,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
    left: '50%',
    marginLeft: -103,
    paddingHorizontal: 13,
    paddingVertical: 8,
    position: 'absolute',
  },
  compareTipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  processingShimmer: {
    backgroundColor: colors.accentYellow,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  selectionPreviewRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  selectionPreviewCard: {
    backgroundColor: '#101010',
    borderColor: 'rgba(255,196,0,0.22)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    paddingBottom: 9,
  },
  selectionPreviewImage: {
    backgroundColor: '#080808',
    height: 58,
    overflow: 'hidden',
    width: '100%',
  },
  selectionPreviewImageFallback: {
    alignItems: 'center',
    backgroundColor: '#18140A',
    height: 58,
    justifyContent: 'center',
    width: '100%',
  },
  selectionPreviewLabel: {
    color: colors.accentYellow,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.75,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  selectionPreviewValue: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    marginTop: 3,
    minHeight: 26,
    paddingHorizontal: 8,
  },
  generationCard: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: 'rgba(255,196,0,0.27)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 20,
    padding: 14,
  },
  generationCardDone: {
    backgroundColor: 'rgba(23,29,16,0.95)',
    borderColor: 'rgba(48,209,88,0.45)',
  },
  generationIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.13)',
    borderRadius: 20,
    height: 41,
    justifyContent: 'center',
    width: 41,
  },
  generationCopy: {
    flex: 1,
  },
  generationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  generationBody: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  stageRail: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  stageItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stageDot: {
    backgroundColor: '#3A3528',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  stageDotActive: {
    backgroundColor: colors.accentYellow,
  },
  stageLine: {
    backgroundColor: '#3A3528',
    height: 2,
    width: 38,
  },
  stageLineActive: {
    backgroundColor: colors.accentYellow,
  },
  generateButton: {
    borderRadius: 21,
    marginTop: 20,
    overflow: 'hidden',
    ...shadows.yellow,
  },
  generateButtonBusy: {
    opacity: 0.78,
  },
  generateGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 65,
    paddingHorizontal: 20,
  },
  generateText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '900',
  },
  guidedFooter: {
    backgroundColor: 'rgba(5,5,5,0.96)',
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    gap: 11,
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  progressRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  progressItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  progressDot: {
    backgroundColor: '#332E21',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  progressDotActive: {
    backgroundColor: colors.accentYellow,
  },
  progressLine: {
    backgroundColor: '#332E21',
    height: 2,
    width: 38,
  },
  progressLineActive: {
    backgroundColor: colors.accentYellow,
  },
  continueButton: {
    borderRadius: 21,
    overflow: 'hidden',
    ...shadows.yellow,
  },
  continueButtonDisabled: {
    opacity: 0.3,
  },
  continueButtonPressed: {
    transform: [{ scale: motion.scale.pressed }],
  },
  continueGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 59,
    paddingHorizontal: 18,
  },
  continueText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '900',
  },
  pressedCard: {
    opacity: 0.83,
    transform: [{ scale: motion.scale.pressed }],
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.64)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: '#121212',
    borderColor: 'rgba(255,196,0,0.22)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#4A4A4A',
    borderRadius: 99,
    height: 5,
    width: 42,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  sheetEyebrow: {
    color: colors.accentYellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },
  sheetClose: {
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sheetBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 13,
  },
  editOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  editOption: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 89,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  editOptionActive: {
    backgroundColor: colors.accentYellow,
    borderColor: colors.accentYellow,
  },
  editOptionText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  editOptionTextActive: {
    color: colors.background,
  },
  sheetDone: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 17,
    marginTop: 20,
    minHeight: 52,
    justifyContent: 'center',
  },
  sheetDoneText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
});
