import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StepDots } from '@/src/components/StepDots';
import { scenes } from '@/src/data/scenes';
import { colors } from '@/src/theme/colors';
import { radius, shadow } from '@/src/theme/metrics';

const hero = require('../../assets/images/categories/fan-selfie.jpg');
const fanScenes = scenes.filter((item) => item.category === 'fan').slice(0, 3);

export default function FanMomentScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader onSkip={() => router.replace('/(auth)/login')} step="5 / 5" title="Fan Moment" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.duration(540)} style={styles.hero}>
            <Image contentFit="cover" source={hero} style={StyleSheet.absoluteFill} transition={180} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.18)', 'rgba(5,5,5,0.94)']} locations={[0.35, 0.58, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroBadge}><Ionicons color={colors.black} name="sparkles" size={14} /><Text style={styles.heroBadgeText}>Fan Moment</Text></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Stadyumda özel bir kare</Text>
              <Text style={styles.heroSubtitle}>Kurgusal futbol yıldızıyla örnek AI sahnesi</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(520)}>
            <Text accessibilityRole="header" style={styles.title}>Fan karelerini güvenli{`\n`}şekilde oluştur.</Text>
            <Text style={styles.description}>Uygulama, gerçek kişileri izinsiz taklit etmek yerine özgün karakterleri veya kullanım hakkı doğrulanmış içerikleri temel alacak şekilde planlanmalıdır.</Text>
          </Animated.View>

          <ScrollView contentContainerStyle={styles.sceneRow} horizontal showsHorizontalScrollIndicator={false}>
            {fanScenes.map((scene) => (
              <Pressable accessibilityRole="imagebutton" key={scene.id} style={({ pressed }) => [styles.sceneCard, pressed && styles.pressed]}>
                <Image contentFit="cover" source={scene.image} style={StyleSheet.absoluteFill} transition={150} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.sceneTitle}>{scene.title}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.disclosure}>
            <View style={styles.disclosureIcon}><Ionicons color={colors.accent} name="information-circle-outline" size={22} /></View>
            <View style={styles.disclosureCopy}>
              <Text style={styles.disclosureTitle}>Açık AI bildirimi</Text>
              <Text style={styles.disclosureText}>Oluşturulan fan görselleri gerçek bir buluşma, onay, sponsorluk veya tarihî olay kanıtı olarak sunulmamalıdır.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <StepDots active={4} total={5} />
          <PrimaryButton label="Kuralları onayla" onPress={() => router.push('/(onboarding)/consent')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 24, paddingTop: 15 },
  hero: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.xl, borderWidth: 1, height: 315, overflow: 'hidden', position: 'relative', ...shadow.card },
  heroBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 999, flexDirection: 'row', gap: 5, left: 14, paddingHorizontal: 10, paddingVertical: 7, position: 'absolute', top: 14 },
  heroBadgeText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  heroCopy: { bottom: 0, left: 0, padding: 18, position: 'absolute', right: 0 },
  heroTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  heroSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -1.1, lineHeight: 35, marginTop: 24 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  sceneRow: { gap: 10, paddingRight: 20, paddingTop: 18 },
  sceneCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 140, overflow: 'hidden', position: 'relative', width: 112 },
  sceneTitle: { bottom: 10, color: colors.text, fontSize: 11, fontWeight: '900', left: 10, position: 'absolute', right: 8 },
  disclosure: { alignItems: 'flex-start', backgroundColor: '#15130D', borderColor: colors.accentBorder, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 11, marginTop: 22, padding: 14 },
  disclosureIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  disclosureCopy: { flex: 1 },
  disclosureTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  disclosureText: { color: '#C9BFA7', fontSize: 11, lineHeight: 17, marginTop: 4 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 8 },
  pressed: { opacity: 0.8 },
});
