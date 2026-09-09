import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboarding } from '@/src/context/OnboardingContext';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

type MenuItem = { icon: keyof typeof Ionicons.glyphMap; title: string; value?: string };
const menu: MenuItem[] = [
  { icon: 'sparkles-outline', title: 'Kredi satın al', value: '24 kredi' },
  { icon: 'diamond-outline', title: 'Abonelik planı', value: 'Ücretsiz' },
  { icon: 'lock-closed-outline', title: 'Gizlilik ve izinler' },
  { icon: 'notifications-outline', title: 'Bildirimler' },
  { icon: 'help-circle-outline', title: 'Yardım ve destek' },
  { icon: 'document-text-outline', title: 'Kullanım koşulları' },
];

export default function ProfileScreen() {
  const { resetDemo } = useOnboarding();

  const restart = async () => {
    await resetDemo();
    router.replace('/(onboarding)/splash');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>Profil</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Ionicons color={colors.text} name="person" size={36} /></View>
          <Text style={styles.name}>Demo Kullanıcı</Text>
          <Text style={styles.plan}>BirKare AI · Ücretsiz plan</Text>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>24</Text><Text style={styles.statLabel}>Kredi</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Text style={styles.statValue}>8</Text><Text style={styles.statLabel}>Proje</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Text style={styles.statValue}>3</Text><Text style={styles.statLabel}>Favori</Text></View>
          </View>
        </View>

        <View style={styles.menu}>
          {menu.map((item) => (
            <Pressable accessibilityRole="button" key={item.title} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
              <View style={styles.menuIcon}><Ionicons color={colors.accent} name={item.icon} size={19} /></View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
              <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={restart} style={styles.restart}><Ionicons color={colors.accent} name="refresh" size={18} /><Text style={styles.restartText}>Onboarding demosunu yeniden başlat</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} style={styles.logout}><Ionicons color={colors.danger} name="log-out-outline" size={18} /><Text style={styles.logoutText}>Çıkış yap</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 34, paddingHorizontal: 18, paddingTop: 10 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -1 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, marginTop: 20, padding: 20 },
  avatar: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.accentBorder, borderRadius: 38, borderWidth: 1, height: 76, justifyContent: 'center', width: 76 },
  name: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 13 },
  plan: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  stats: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.background, borderRadius: 17, flexDirection: 'row', justifyContent: 'space-around', marginTop: 18, minHeight: 72 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  divider: { backgroundColor: colors.borderStrong, height: 30, width: 1 },
  menu: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginTop: 16, overflow: 'hidden' },
  menuRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, minHeight: 62, paddingHorizontal: 14 },
  menuIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  menuTitle: { color: colors.text, flex: 1, fontSize: 12, fontWeight: '800' },
  menuValue: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  restart: { alignItems: 'center', backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 16, minHeight: 54 },
  restartText: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  logout: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 13, minHeight: 50 },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.74 },
});
