import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StepDots } from '@/src/components/StepDots';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { colors } from '@/src/theme/colors';
import { radius, shadow } from '@/src/theme/metrics';
import { resolvePhotoSource } from '@/src/utils/images';

const fallback = require('../../assets/images/onboarding/before-portrait.jpg');
const transformed = require('../../assets/images/onboarding/after-cinematic.jpg');

export default function WelcomeScreen() {
  const { selectedPhoto } = useOnboarding();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader onSkip={() => router.replace('/(auth)/login')} step="2 / 5" title="Nasıl çalışır?" />

        <View style={styles.hero}>
          <View style={styles.glow} />
          <Animated.View entering={FadeInLeft.duration(560)} style={[styles.photo, styles.before]}>
            <Image contentFit="cover" source={resolvePhotoSource(selectedPhoto, fallback)} style={StyleSheet.absoluteFill} transition={180} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.88)']} style={StyleSheet.absoluteFill} />
            <View style={styles.photoLabel}><Text style={styles.photoLabelText}>Seçtiğin fotoğraf</Text></View>
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(180).duration(580)} style={[styles.photo, styles.after]}>
            <Image contentFit="cover" source={transformed} style={StyleSheet.absoluteFill} transition={180} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.76)']} style={StyleSheet.absoluteFill} />
            <View style={[styles.photoLabel, styles.afterLabel]}><Ionicons color={colors.black} name="sparkles" size={13} /><Text style={styles.afterLabelText}>AI sonucu</Text></View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(410).duration(440)} style={styles.magicBadge}>
            <Ionicons color={colors.accent} name="color-wand-outline" size={21} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(360).duration(520)} style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>Fotoğrafını istediğin{`\n`}sahneye taşı.</Text>
          <Text style={styles.description}>BirKare AI, seçtiğin fotoğrafı referans alır. Sen sahneyi ve tarzı belirlersin; sistem yeni kareyi oluşturmak için seçimini hazırlar.</Text>

          <View style={styles.featureRow}>
            <View style={styles.feature}><Ionicons color={colors.accent} name="person-outline" size={18} /><Text style={styles.featureText}>Yüz odağı</Text></View>
            <View style={styles.feature}><Ionicons color={colors.accent} name="layers-outline" size={18} /><Text style={styles.featureText}>Sahne seçimi</Text></View>
            <View style={styles.feature}><Ionicons color={colors.accent} name="sparkles-outline" size={18} /><Text style={styles.featureText}>AI üretim</Text></View>
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          <StepDots active={1} total={5} />
          <PrimaryButton label="Sahneleri keşfet" onPress={() => router.push('/(onboarding)/categories')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  hero: { height: 348, marginTop: 12, position: 'relative' },
  glow: { backgroundColor: colors.purpleSoft, borderRadius: 180, height: 290, left: '50%', marginLeft: -145, marginTop: -145, position: 'absolute', top: '50%', width: 290 },
  photo: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.lg, borderWidth: 1, height: 250, overflow: 'hidden', position: 'absolute', top: 45, width: 178, ...shadow.card },
  before: { left: 12, transform: [{ rotate: '-8deg' }] },
  after: { right: 10, top: 18, transform: [{ rotate: '7deg' }] },
  photoLabel: { backgroundColor: 'rgba(5,5,5,0.80)', borderColor: colors.border, borderRadius: 999, borderWidth: 1, bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 7, position: 'absolute' },
  photoLabelText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  afterLabel: { alignItems: 'center', backgroundColor: colors.accent, borderColor: colors.accent, flexDirection: 'row', gap: 5 },
  afterLabelText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  magicBadge: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.accentBorder, borderRadius: 26, borderWidth: 1, bottom: 22, height: 52, justifyContent: 'center', left: '50%', marginLeft: -26, position: 'absolute', width: 52, ...shadow.accent },
  copy: { marginTop: 6 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, lineHeight: 36 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  featureRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  feature: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flex: 1, gap: 5, minHeight: 66, justifyContent: 'center', paddingHorizontal: 6 },
  featureText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  bottom: { gap: 15, marginTop: 'auto', paddingBottom: 8, paddingTop: 14 },
});
