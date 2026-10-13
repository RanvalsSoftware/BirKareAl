import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components';
import { useCopy } from '@/features/settings/language-store';
import { SplashIntro } from '@/features/onboarding/SplashIntro';
import { BrandLogo } from '@/components/BrandLogo';

type ProductOnboardingProps = {
  onFinished: () => void;
  onSkipped: () => void;
};

type Slide = {
  id: string;
  eyebrowTr: string;
  eyebrowEn: string;
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
  image: ImageSourcePropType;
  icon: React.ComponentProps<typeof Icon>['name'];
  pointsTr: readonly string[];
  pointsEn: readonly string[];
};

const slides: readonly Slide[] = [
  {
    id: 'source',
    eyebrowTr: 'ÜRÜN FOTOĞRAFIYLA BAŞLA',
    eyebrowEn: 'START WITH A PRODUCT PHOTO',
    titleTr: 'Tek kareyi düzenli bir ürün projesine dönüştür.',
    titleEn: 'Turn one frame into an organized product project.',
    bodyTr: 'Ürünü adlandır, kategorisini seç ve kaynak fotoğrafını aynı çalışma alanında tut.',
    bodyEn: 'Name the product, choose its category, and keep the source photo in one workspace.',
    image: require('../../../assets/products/ui/product-shoot.webp'),
    icon: 'cube-outline',
    pointsTr: ['Ürün adıyla katalog kaydı', 'Net kaynak fotoğraf kontrolü', 'Ürün kategorisine göre koruma'],
    pointsEn: ['Catalog entry with product name', 'Clear source-photo checklist', 'Category-aware preservation'],
  },
  {
    id: 'plan',
    eyebrowTr: 'KULLANIM AMACINI PLANLA',
    eyebrowEn: 'PLAN THE INTENDED USE',
    titleTr: 'Katalog, ürün sayfası, sosyal ilan veya web vitrini.',
    titleEn: 'Catalog, product page, social ad, or web hero.',
    bodyTr: 'Amaç seçimi sahne ve oran için anlaşılır bir başlangıç ayarı hazırlar; tüm ayarlar değiştirilebilir.',
    bodyEn: 'Your goal prepares a sensible scene and ratio while keeping every setting editable.',
    image: require('../../../assets/products/ui/catalog-shoot.webp'),
    icon: 'options-outline',
    pointsTr: ['15 ürün sahnesi', 'Dört kanal formatı', 'Üretmeden önce net kredi maliyeti'],
    pointsEn: ['15 product scenes', 'Four channel formats', 'Clear credit cost before you generate'],
  },
  {
    id: 'alternatives',
    eyebrowTr: 'GERÇEK ALTERNATİFLER ÜRET',
    eyebrowEn: 'GENERATE REAL ALTERNATIVES',
    titleTr: '1, 2 veya 4 sonucu aynı ürün projesinde karşılaştır.',
    titleEn: 'Compare 1, 2, or 4 results in the same product project.',
    bodyTr: 'Alternatifleri, yeni versiyonları ve dışa aktarılan görselleri ürün kataloğunda birlikte yönet.',
    bodyEn: 'Manage alternatives, new versions, and exported visuals together in the product catalog.',
    image: require('../../../assets/products/ui/scenes/glass-surface.webp'),
    icon: 'albums-outline',
    pointsTr: ['Gerçek çoklu çıktı', 'Proje ve versiyon geçmişi', 'Kaydetme ve paylaşma'],
    pointsEn: ['Real multi-output generation', 'Project and version history', 'Save and share'],
  },
] as const;

export function ProductLogoIntro({ onFinished }: { onFinished: () => void }) {
  return <SplashIntro onFinished={onFinished} />;
}

export function ProductOnboarding({ onFinished, onSkipped }: ProductOnboardingProps) {
  const copy = useCopy();
  const { height, width } = useWindowDimensions();
  const tablet = width >= 760 && height >= 600;
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  const points = useMemo(
    () => slide.pointsTr.map((value, pointIndex) => copy(value, slide.pointsEn[pointIndex] ?? value)),
    [copy, slide],
  );
  const last = index === slides.length - 1;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.onboardingPage}>
        <View style={styles.onboardingTop}>
          <View style={styles.miniBrand}>
            <BrandLogo size={34} glow={false} />
            <Text style={styles.miniBrandText}>BirKare Studio</Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onSkipped}>
            <Text style={styles.skipText}>{copy('Atla', 'Skip')}</Text>
          </Pressable>
        </View>

        <ScrollView
          key={slide.id}
          style={styles.slideScroller}
          contentContainerStyle={[styles.slide, tablet && styles.slideTablet]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.visualWrap, tablet && styles.visualWrapTablet]}>
            <Image source={slide.image} resizeMode="cover" style={styles.visual} />
            <View style={styles.visualScrim} />
            <View style={styles.visualLabel}>
              <Icon name={slide.icon} size={18} color="#F5C132" />
              <Text style={styles.visualLabelText}>
                {copy(`${index + 1}. adım`, `Step ${index + 1}`)}
              </Text>
            </View>
          </View>

          <View style={[styles.slideCopy, tablet && styles.slideCopyTablet]}>
            <Text style={styles.eyebrow}>{copy(slide.eyebrowTr, slide.eyebrowEn)}</Text>
            <Text style={styles.title}>{copy(slide.titleTr, slide.titleEn)}</Text>
            <Text style={styles.body}>{copy(slide.bodyTr, slide.bodyEn)}</Text>
            <View style={styles.pointList}>
              {points.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <View style={styles.pointIcon}><Icon name="checkmark" size={14} color="#1C1300" /></View>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityRole="tablist">
            {slides.map((item, dotIndex) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: dotIndex === index }}
                key={item.id}
                onPress={() => setIndex(dotIndex)}
                style={[styles.dot, dotIndex === index && styles.dotSelected]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => (last ? onFinished() : setIndex((value) => value + 1))}
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          >
            <Text style={styles.nextButtonText}>
              {last ? copy('Devam et', 'Continue') : copy('Sonraki', 'Next')}
            </Text>
            <Icon name={last ? 'checkmark' : 'arrow-forward'} size={20} color="#1C1300" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0A0906', flex: 1 },
  onboardingPage: { alignSelf: 'center', flex: 1, maxWidth: 980, paddingHorizontal: 20, width: '100%' },
  onboardingTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 62 },
  miniBrand: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  miniMark: { alignItems: 'center', backgroundColor: '#F5C132', borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  miniBrandText: { color: '#F4F2ED', fontSize: 15, fontWeight: '800' },
  skipText: { color: '#91A097', fontSize: 14, fontWeight: '700', padding: 6 },
  slideScroller: { flex: 1 },
  slide: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  slideTablet: { alignItems: 'center', flexDirection: 'row', gap: 42 },
  visualWrap: { aspectRatio: 1.12, borderColor: '#3B362A', borderRadius: 28, borderWidth: 1, maxHeight: 390, overflow: 'hidden', width: '100%' },
  visualWrapTablet: { aspectRatio: 0.92, flex: 0.92, maxHeight: 570, width: 'auto' },
  visual: { height: '100%', width: '100%' },
  visualScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4,11,7,0.13)' },
  visualLabel: { alignItems: 'center', backgroundColor: 'rgba(8,18,13,0.84)', borderColor: 'rgba(245,193,50,0.22)', borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 7, left: 13, paddingHorizontal: 11, paddingVertical: 9, position: 'absolute', top: 13 },
  visualLabelText: { color: '#F5C132', fontSize: 11, fontWeight: '800' },
  slideCopy: { paddingTop: 25 },
  slideCopyTablet: { flex: 1.08, paddingTop: 0 },
  eyebrow: { color: '#F3CF5C', fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  title: { color: '#F8F7F4', fontSize: 29, fontWeight: '900', letterSpacing: -0.9, lineHeight: 35, marginTop: 11 },
  body: { color: '#929F97', fontSize: 14, lineHeight: 21, marginTop: 12 },
  pointList: { gap: 9, marginTop: 20 },
  pointRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  pointIcon: { alignItems: 'center', backgroundColor: '#F5C132', borderRadius: 9, height: 26, justifyContent: 'center', width: 26 },
  pointText: { color: '#CED8D1', flex: 1, fontSize: 12, fontWeight: '600' },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 88 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { backgroundColor: '#35413A', borderRadius: 4, height: 7, width: 7 },
  dotSelected: { backgroundColor: '#F5C132', width: 25 },
  nextButton: { alignItems: 'center', backgroundColor: '#F5C132', borderRadius: 15, flexDirection: 'row', gap: 8, minHeight: 50, paddingHorizontal: 19 },
  nextButtonText: { color: '#1C1300', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.77, transform: [{ scale: 0.99 }] },
});
