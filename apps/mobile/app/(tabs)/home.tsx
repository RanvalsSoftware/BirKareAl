import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentProps } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  CategoryChip,
  CharacterTile,
  CreditBadge,
  GlassSurface,
  Icon,
  LogoMark,
  SectionHeader,
  VisualTile,
} from '@/components';
import { fictionalPeople, filters, scenes } from '@/constants/catalog';
import { experienceScenes } from '@/constants/experience-scenes';
import { beautySceneImage } from '@/features/trends/catalog';
import { TrendRail } from '@/features/trends/TrendRail';
import {
  useCreateFlow,
  type Composition,
  type CreateFlow,
  type CreateMode,
} from '@/features/create/createFlow';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, gradients, radii, spacing, typography } from '@/theme';

type IconName = ComponentProps<typeof Icon>['name'];

type HomeSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  icon: IconName;
  palette: readonly [string, string];
  source?: ImageSourcePropType;
  route: string;
  createPreset?: CreatePreset;
};

type CreatePreset = {
  mode: CreateMode;
  sceneId: string | null;
  personId: string | null;
  composition: Composition;
} & Partial<Pick<CreateFlow, 'styleId' | 'preserveFace' | 'preserveClothes' | 'customInstruction'>>;

const stadiumScene = scenes.find((scene) => scene.id === 'scene-stadium-lights') ?? scenes[0]!;

const homeSlides: HomeSlide[] = [
  {
    id: 'football-scene',
    eyebrow: 'KURGUSAL SAHNE',
    title: 'Stadyumda futbol anı',
    description: 'Işıklar altında, futbol enerjisini taşıyan özgün bir sahne oluştur.',
    action: 'Sahneyi seç',
    icon: 'football',
    palette: ['#0B2939', '#52731D'],
    source: require('../../assets/home/images/slider/football.png'),
    route: '/create/upload',
    createPreset: {
      mode: 'scene',
      sceneId: stadiumScene.id,
      personId: null,
      composition: 'Selfie',
    },
  },
  {
    id: 'beauty-filter',
    eyebrow: 'GÜZELLİK STÜDYOSU',
    title: 'Işıltını öne çıkar',
    description: '10 görünüm, sana özel yoğunluk. Doğal rötuş ve makyajı birlikte seç.',
    action: 'Güzelliği keşfet',
    icon: 'color-filter',
    palette: ['#6B3240', '#D28A75'],
    source: require('../../assets/home/images/slider/beauty.png'),
    route: '/beauty',
  },
  {
    id: 'background-transform',
    eyebrow: 'ARKA PLAN DÖNÜŞÜMÜ',
    title: 'Manzaranı yeniden kur',
    description: 'Pozunu korurken fotoğrafını yeni bir şehir atmosferine taşı.',
    action: 'Arka planı seç',
    icon: 'layers',
    palette: ['#3A251F', '#D88835'],
    source: require('../../assets/home/images/slider/background.png'),
    route: '/create/upload',
    createPreset: {
      mode: 'background',
      sceneId: 'scene-sunset-terrace',
      personId: null,
      composition: 'Orta',
    },
  },
];

// Home and onboarding step 2 intentionally render the very same canonical
// cards so their names, artwork, order and production presets cannot diverge.
const popularSceneCards = experienceScenes;

function displayFirstName(user: AuthUser | null): string | null {
  const firstName = user?.firstName?.trim();
  if (firstName) return firstName;

  const emailPrefix = user?.email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  return emailPrefix
    ? emailPrefix.charAt(0).toLocaleUpperCase('tr-TR') + emailPrefix.slice(1)
    : null;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((store) => store.user);
  const availableCredits = useAvailableCredits();
  const { reset: resetCreateFlow, set: setCreateFlow } = useCreateFlow();
  const sliderRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const firstName = displayFirstName(user);
  const slideWidth = Math.min(Math.max(width - spacing.lg * 2, 300), 500);
  const slideStep = slideWidth + spacing.sm;

  function selectSlide(index: number) {
    setActiveSlide(index);
    sliderRef.current?.scrollTo({ x: index * slideStep, animated: true });
  }

  function handleSliderEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.max(
      0,
      Math.min(homeSlides.length - 1, Math.round(event.nativeEvent.contentOffset.x / slideStep)),
    );
    setActiveSlide(nextIndex);
  }

  function startCreatePreset(preset: CreatePreset, route: string) {
    // Begin each curated card from a clean draft, so a prior filter/person
    // selection cannot silently change the selected scene's server prompt.
    resetCreateFlow();
    setCreateFlow({
      ...preset,
      mode: preset.mode === 'character' ? 'scene' : preset.mode,
      personId: null,
      ...(preset.mode === 'character'
        ? {
            customInstruction:
              'Seçilen kaynak kişiyi gece stadyumunda tek ana kişi olarak göster. Yüzünü, yaşını ve kıyafetini koru; tribünleri ve projektör ışığını arka planda kullan. Yanına başka bir kişi veya sporcu ekleme.',
          }
        : {}),
    });
    router.push(route as never);
  }

  function openSlide(slide: HomeSlide) {
    if (slide.createPreset) {
      startCreatePreset(slide.createPreset, slide.route);
      return;
    }
    if (slide.route === '/beauty') resetCreateFlow();
    router.push(slide.route as never);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xs }]}
      showsVerticalScrollIndicator={false}
    >
      <GlassSurface tone="gold" radius={30} contentStyle={styles.topBar}>
        <LogoMark size={43} withWordmark />
        <CreditBadge credits={availableCredits} />
      </GlassSurface>

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{firstName ? `Merhaba, ${firstName}` : 'Merhaba'}</Text>
        <Text style={styles.greetingHint}>Bugün ne yaratmak istersin?</Text>
      </View>

      <View style={styles.modeRow} accessibilityRole="tablist">
        <CategoryChip label="Görsel" selected icon="image-outline" />
        <CategoryChip
          label="Kurgusal"
          onPress={() => router.push('/create/person' as never)}
          icon="sparkles-outline"
        />
        <CategoryChip
          label="AI Araçları"
          onPress={() => router.push('/(tabs)/explore' as never)}
          icon="construct-outline"
        />
      </View>

      <ScrollView
        ref={sliderRef}
        horizontal
        bounces={false}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleSliderEnd}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={slideStep}
        contentContainerStyle={styles.sliderContent}
      >
        {homeSlides.map((slide) => (
          <HomeSlideCard
            key={slide.id}
            slide={slide}
            width={slideWidth}
            onPress={() => openSlide(slide)}
          />
        ))}
      </ScrollView>

      <View style={styles.pagination} accessibilityRole="tablist">
        {homeSlides.map((slide, index) => (
          <Pressable
            key={slide.id}
            accessibilityRole="tab"
            accessibilityLabel={`${slide.title}, ${index + 1}. kart`}
            accessibilityState={{ selected: index === activeSlide }}
            onPress={() => selectSlide(index)}
            style={[styles.paginationDot, index === activeSlide && styles.paginationDotActive]}
          />
        ))}
      </View>

      <View style={styles.quickActions}>
        <QuickAction
          icon="camera-outline"
          title="Fotoğraf yükle"
          onPress={() => {
            resetCreateFlow();
            router.push('/create/upload' as never);
          }}
        />
        <QuickAction
          icon="color-filter-outline"
          title="Filtre dene"
          onPress={() => router.push('/filters' as never)}
        />
        <QuickAction
          icon="sparkles-outline"
          title="AI araçları"
          onPress={() => router.push('/(tabs)/explore' as never)}
        />
      </View>

      <SectionHeader title="Popüler sahneler" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {popularSceneCards.map((item) => (
          <PopularSceneCard
            key={item.id}
            title={item.id === 'face' ? 'Güzellik' : item.title}
            subtitle={
              item.id === 'face' ? 'Doğal rötuş, makyaj ve sana özel yoğunluk' : item.description
            }
            source={item.id === 'face' ? beautySceneImage : item.source}
            palette={item.palette}
            badge={item.id === 'face' ? '10 görünüm' : `${item.creditCost} kredi`}
            onPress={() => {
              if (item.id === 'face') {
                resetCreateFlow();
                router.push('/beauty' as never);
              } else startCreatePreset(item.preset, '/create/upload');
            }}
          />
        ))}
      </ScrollView>

      <SectionHeader title="Akımlar" />
      <TrendRail
        onSelect={(id) => {
          resetCreateFlow();
          router.push(`/trends/${id}` as never);
        }}
      />

      <SectionHeader
        title="AI filtreler"
        action="Filtreleri aç"
        onActionPress={() => router.push('/filters' as never)}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {filters.slice(0, 5).map((item) => (
          <VisualTile
            key={item.id}
            title={item.name}
            subtitle="AI ile uygulanır"
            palette={item.palette}
            icon={item.icon}
            imageSource={item.previewSource}
            badge={item.isPro ? 'PRO' : undefined}
            onPress={() => router.push(`/filters/${item.slug}` as never)}
          />
        ))}
      </ScrollView>

      <SectionHeader
        title="Kurgusal karakterler"
        action="Keşfet"
        onActionPress={() => router.push('/create/person' as never)}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {fictionalPeople.map((item) => (
          <CharacterTile
            key={item.id}
            name={item.name}
            subtitle="Kurgusal karakter"
            initials={item.icon}
            palette={item.palette}
            imageSource={item.previewSource}
            onPress={() =>
              router.push({ pathname: '/create/person', params: { selected: item.id } } as never)
            }
          />
        ))}
      </ScrollView>

      <LinearGradient colors={gradients.midnight} style={styles.bottomCard}>
        <View style={styles.bottomCardIcon}>
          <Icon name="shield-checkmark-outline" size={23} color={colors.accentYellow} />
        </View>
        <View style={styles.bottomCardCopy}>
          <Text style={styles.bottomCardTitle}>Senin fotoğrafın, senin kontrolün.</Text>
          <Text style={styles.bottomCardText}>
            Her üretim AI etiketiyle ve izin odaklı hazırlanır.
          </Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

function HomeSlideCard({
  slide,
  width,
  onPress,
}: {
  slide: HomeSlide;
  width: number;
  onPress: () => void;
}) {
  // iOS can resolve a percentage-based absolute image before an aspect-ratio
  // only parent has settled. Give campaign cards an explicit 3:2 canvas so
  // the supplied artwork is present on the first render as well as after HMR.
  const height = Math.round((width * 2) / 3);

  return (
    <Pressable
      accessibilityLabel={`${slide.title}. ${slide.action}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.slide, { height, width }, pressed && styles.pressed]}
    >
      <LinearGradient colors={slide.palette} style={StyleSheet.absoluteFill} />
      {slide.source ? <FittedCoverImage source={slide.source} /> : null}
      <LinearGradient
        colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.08)', 'rgba(5,5,5,0.76)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.slideCopy}>
        <View style={styles.slideEyebrow}>
          <Icon name={slide.icon} size={13} color={colors.accentYellow} />
          <Text style={styles.slideEyebrowText}>{slide.eyebrow}</Text>
        </View>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideDescription}>{slide.description}</Text>
        <View style={styles.slideAction}>
          <Text style={styles.slideActionText}>{slide.action}</Text>
          <Icon name="arrow-forward" size={17} color={colors.textPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * On iOS a directly absolute static Image can remain blank after a hot reload.
 * A regular 100% × 100% child keeps campaign and popular-scene artwork visible.
 */
function FittedCoverImage({ source }: { source: ImageSourcePropType }) {
  return (
    <View pointerEvents="none" style={styles.coverImageCanvas}>
      <Image fadeDuration={0} source={source} style={styles.coverImage} />
    </View>
  );
}

function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  function animate(pressed: boolean) {
    scale.set(reducedMotion ? 1 : withSpring(pressed ? 0.965 : 1, { damping: 18, stiffness: 320 }));
  }
  return (
    <Animated.View style={[styles.quickAction, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          onPress();
        }}
        onPressIn={() => animate(true)}
        onPressOut={() => animate(false)}
        style={styles.quickActionPressable}
      >
        <GlassSurface
          radius={23}
          tone="iridescent"
          style={styles.quickActionSurface}
          contentStyle={styles.quickActionInner}
        >
          <GlassSurface
            radius={25}
            tone="iridescent"
            style={styles.quickActionIcon}
            contentStyle={styles.quickIconContent}
          >
            <Icon name={icon} size={26} color={colors.textPrimary} />
          </GlassSurface>
          <Text numberOfLines={2} style={styles.quickActionText}>
            {title === 'Fotoğraf yükle'
              ? 'Fotoğraf\nyükle'
              : title === 'Filtre dene'
                ? 'Filtre\ndene'
                : 'AI\naraçları'}
          </Text>
          <LinearGradient
            colors={['#8146D9', '#B15DC0', '#E78D3D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.quickUnderline}
          />
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

function PopularSceneCard({
  title,
  subtitle,
  source,
  palette,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  source: ImageSourcePropType;
  palette: readonly [string, string];
  badge: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${badge}`}
      onPress={onPress}
      style={({ pressed }) => [styles.sceneCard, pressed && styles.pressed]}
    >
      <LinearGradient colors={palette} style={StyleSheet.absoluteFill} />
      <FittedCoverImage source={source} />
      <LinearGradient
        colors={['rgba(5,5,5,0.02)', 'rgba(5,5,5,0.66)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sceneBadge}>
        <Icon name="sparkles" size={11} color={colors.accentYellow} />
        <Text style={styles.sceneBadgeText}>{badge}</Text>
      </View>
      <View style={styles.sceneCopy}>
        <Text numberOfLines={1} style={styles.sceneTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.sceneSubtitle}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 78,
    padding: 12,
    gap: 8,
  },
  greetingBlock: { marginTop: spacing.lg },
  greeting: { ...typography.h2, color: colors.textPrimary },
  greetingHint: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  sliderContent: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  slide: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    justifyContent: 'flex-end',
  },
  coverImageCanvas: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coverImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  slideCopy: {
    bottom: 0,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
  },
  slideEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  slideEyebrowText: { ...typography.overline, color: colors.accentYellow, fontSize: 10 },
  slideTitle: { ...typography.h2, color: colors.textPrimary, marginTop: 5 },
  slideDescription: {
    ...typography.caption,
    color: '#E7E3EA',
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 310,
  },
  slideAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  slideActionText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  pagination: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginTop: 10 },
  paginationDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  paginationDotActive: { width: 22, backgroundColor: colors.accentYellow },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  quickAction: {
    aspectRatio: 0.9,
    minHeight: 124,
    flex: 1,
    borderRadius: 23,
  },
  quickActionPressable: { flex: 1, borderRadius: 23 },
  quickActionSurface: { flex: 1 },
  quickActionInner: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 12,
  },
  quickActionIcon: {
    width: 47,
    height: 47,
  },
  quickIconContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quickActionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  quickUnderline: {
    borderRadius: 2,
    height: 2,
    marginTop: 9,
    width: 22,
  },
  horizontalList: { gap: 12, paddingRight: spacing.lg },
  sceneCard: {
    // The shared category artwork is 1122 × 1402. Matching that 4:5 canvas
    // keeps the same full composition visible here and in onboarding step 2.
    width: 166,
    aspectRatio: 1122 / 1402,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  sceneBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(5,5,5,0.56)',
  },
  sceneBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sceneCopy: { position: 'absolute', left: 11, right: 11, bottom: 10 },
  sceneTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  sceneSubtitle: { ...typography.caption, color: '#E6E2E8', marginTop: 2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  bottomCard: {
    minHeight: 84,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  bottomCardIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentYellowSoft,
  },
  bottomCardCopy: { flex: 1 },
  bottomCardTitle: { ...typography.label, color: colors.textPrimary },
  bottomCardText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
});
