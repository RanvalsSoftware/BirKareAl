import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton, OnboardingHeader, StepProgress } from '@/features/onboarding/components';
import { fanScenes, onboardingImages, resolveOnboardingPhoto } from '@/features/onboarding/data';
import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, shadows, spacing } from '@/theme';

export default function FanMomentScreen() {
  const { selectedPhoto } = useOnboarding();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(onboarding)/filters');
          }}
          onSkip={() => router.replace('/(auth)/login')}
          step="4 / 4"
          title="Düzenle & paylaş"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.duration(530)} style={styles.resultCard}>
            <View style={styles.resultHalf}>
              <Image
                fadeDuration={0}
                resizeMode="contain"
                source={resolveOnboardingPhoto(selectedPhoto)}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.60)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.resultLabel, styles.beforeLabel]}>
                <Text style={styles.resultLabelText}>Önce</Text>
              </View>
            </View>
            <View style={styles.resultHalf}>
              <Image
                fadeDuration={0}
                resizeMode="contain"
                source={onboardingImages.afterCinematic}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.52)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.resultLabel, styles.afterLabel]}>
                <Ionicons color={colors.background} name="sparkles" size={11} />
                <Text style={styles.afterLabelText}>AI örneği</Text>
              </View>
            </View>
            <View style={styles.divider}>
              <View style={styles.dividerKnob}>
                <Ionicons color={colors.background} name="swap-horizontal" size={17} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(510)}>
            <Text accessibilityRole="header" style={styles.title}>
              Düzenle, kaydet{`\n`}ve paylaş.
            </Text>
            <Text style={styles.subtitle}>
              Üretim tamamlandığında sonuçlar arasında karşılaştırma yapabilir, küçük düzenlemeler
              isteyebilir ve paylaşmaya hazır bir çıktı alabilirsin.
            </Text>
          </Animated.View>

          <View style={styles.actionRow}>
            <View style={styles.action}>
              <View style={styles.actionIcon}>
                <Ionicons color={colors.accentYellow} name="refresh-outline" size={20} />
              </View>
              <Text style={styles.actionLabel}>Yeniden{`\n`}oluştur</Text>
            </View>
            <View style={styles.action}>
              <View style={styles.actionIcon}>
                <Ionicons color={colors.accentYellow} name="color-wand-outline" size={20} />
              </View>
              <Text style={styles.actionLabel}>Düzenle</Text>
            </View>
            <View style={styles.action}>
              <View style={styles.actionIcon}>
                <Ionicons color={colors.accentYellow} name="share-social-outline" size={20} />
              </View>
              <Text style={styles.actionLabel}>Paylaş</Text>
            </View>
          </View>

          <View style={styles.inspirationHeader}>
            <Text style={styles.inspirationTitle}>Fan Moment ilhamı</Text>
            <Text style={styles.inspirationHint}>Kurgusal sahneler</Text>
          </View>
          <ScrollView
            contentContainerStyle={styles.sceneRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {fanScenes.map((scene) => (
              <View key={scene.id} style={styles.sceneCard}>
                <Image
                  fadeDuration={0}
                  resizeMode="contain"
                  source={scene.source}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.90)']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sceneTitle}>{scene.title}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.disclosure}>
            <View style={styles.disclosureIcon}>
              <Ionicons color={colors.accentYellow} name="information-circle-outline" size={20} />
            </View>
            <View style={styles.disclosureCopy}>
              <Text style={styles.disclosureTitle}>Açık AI bildirimi</Text>
              <Text style={styles.disclosureText}>
                Örnek fan görselleri kurgusal kişileri temsil eder. Gerçek buluşma, onay veya
                sponsorluk kanıtı olarak sunulamaz.
              </Text>
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <StepProgress active={3} />
          <GoldButton label="Başlayalım" onPress={() => router.push('/(onboarding)/consent')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  content: { paddingBottom: 22, paddingTop: 18 },
  resultCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    height: 248,
    overflow: 'hidden',
    ...shadows.floating,
  },
  resultHalf: { flex: 1, overflow: 'hidden' },
  divider: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: 0,
    width: 2,
  },
  dividerKnob: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
    ...shadows.yellow,
  },
  resultLabel: {
    borderRadius: 999,
    bottom: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
  },
  beforeLabel: { backgroundColor: 'rgba(5,5,5,0.78)', left: 10 },
  afterLabel: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    gap: 4,
    left: 10,
  },
  resultLabelText: { color: colors.textPrimary, fontSize: 9, fontWeight: '800' },
  afterLabelText: { color: colors.background, fontSize: 9, fontWeight: '900' },
  title: {
    color: colors.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -1.15,
    lineHeight: 35,
    marginTop: 23,
  },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 18 },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 88,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentYellowSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },
  inspirationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  inspirationTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  inspirationHint: { color: colors.accentYellow, fontSize: 10, fontWeight: '800' },
  sceneRow: { gap: 10, paddingRight: 20, paddingTop: 11 },
  sceneCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 105,
    overflow: 'hidden',
    width: 118,
  },
  sceneTitle: {
    bottom: 9,
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '900',
    left: 9,
    position: 'absolute',
    right: 8,
  },
  disclosure: {
    alignItems: 'flex-start',
    backgroundColor: '#15130D',
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 19,
    padding: 13,
  },
  disclosureIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentYellowSoft,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  disclosureCopy: { flex: 1 },
  disclosureTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' },
  disclosureText: { color: '#C9BFA7', fontSize: 10, lineHeight: 15, marginTop: 4 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 8 },
});
