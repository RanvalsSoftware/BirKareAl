import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

const consentRows = [
  {
    id: 'rights',
    title: 'Fotoğraf kullanım hakkım var',
    detail: 'Yüklediğiniz fotoğrafın size ait olduğunu veya gerekli kullanım iznine sahip olduğunuzu onaylarsınız.',
    icon: 'images-outline' as const,
  },
  {
    id: 'ai-disclosure',
    title: 'AI içeriği açıklamasını kabul ediyorum',
    detail: 'Sonuçların yapay zekâ ile üretildiğini, yanıltıcı veya aldatıcı kullanımın yasak olduğunu kabul edersiniz.',
    icon: 'sparkles-outline' as const,
  },
  {
    id: 'age',
    title: '18 yaşını doldurdum',
    detail: 'Bu demo akışı yalnızca 18 yaş ve üzeri kullanıcılar için tasarlanmıştır.',
    icon: 'calendar-outline' as const,
  },
] as const;

export default function ConsentScreen() {
  const { markCompleted } = useOnboarding();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const allAccepted = consentRows.every((row) => accepted[row.id]);

  const toggle = (id: string) => {
    setAccepted((current) => ({ ...current, [id]: !current[id] }));
    void Haptics.selectionAsync();
  };

  const continueToLogin = async () => {
    if (!allAccepted || submitting) return;
    setSubmitting(true);
    try {
      await markCompleted();
      router.replace('/(auth)/login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader step="Son adım" title="Güvenlik onayları" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>Güvenli bir alan{`\n`}oluşturalım.</Text>
          <Text style={styles.subtitle}>Fotoğrafların ve platformdaki herkesin haklarını korumak için aşağıdaki onayların tamamı gereklidir.</Text>

          <View style={styles.rows}>
            {consentRows.map((row) => {
              const checked = Boolean(accepted[row.id]);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  key={row.id}
                  onPress={() => toggle(row.id)}
                  style={({ pressed }) => [styles.row, checked && styles.rowChecked, pressed && styles.pressed]}
                >
                  <View style={[styles.iconBox, checked && styles.iconBoxChecked]}>
                    {checked ? <Ionicons color={colors.black} name="checkmark" size={20} /> : <Ionicons color={colors.textSecondary} name={row.icon} size={20} />}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDetail}>{row.detail}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legalBox}>
            <Ionicons color={colors.textMuted} name="document-text-outline" size={18} />
            <Text style={styles.legal}>Devam ederek Kullanım Koşulları’nı, Gizlilik Politikası’nı ve topluluk güvenliği kurallarını kabul etmiş olursunuz.</Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <PrimaryButton disabled={!allAccepted} label="Onayla ve devam et" loading={submitting} onPress={continueToLogin} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 26, paddingTop: 28 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, lineHeight: 36 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  rows: { gap: 11, marginTop: 26 },
  row: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 15 },
  rowChecked: { backgroundColor: '#14120A', borderColor: colors.accentBorder },
  iconBox: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 13, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  iconBoxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  rowDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 5 },
  legalBox: { alignItems: 'flex-start', flexDirection: 'row', gap: 9, marginTop: 20, paddingHorizontal: 4 },
  legal: { color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 17 },
  bottom: { paddingBottom: 8, paddingTop: 10 },
  pressed: { opacity: 0.78 },
});
