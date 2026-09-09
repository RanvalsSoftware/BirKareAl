import { useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Icon, Notice, PrimaryButton, Screen } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { resolveSupportEmail } from '@/features/support/email';

const questions = [
  {
    question: 'Üretimim ne kadar sürer?',
    answer:
      'Üretim süresi seçtiğin sahne, kalite ve sıra durumuna göre değişir. Tamamlandığında uygulama içinden bildirim alırsın.',
  },
  {
    question: 'Kredim ne zaman düşer?',
    answer:
      'Kredi, yalnızca üretim görevi kabul edildiğinde düşer. Başlatılamayan veya politika nedeniyle engellenen görevlerde kredi alınmaz ya da iade edilir.',
  },
  {
    question: 'Fotoğraflarım nerede saklanır?',
    answer:
      'Kaynak fotoğrafın yalnızca üretim amacıyla güvenli depolamada işlenir. Ayarlardan üretim sonrası silme tercihini değiştirebilirsin.',
  },
  {
    question: 'Bir içeriği nasıl raporlarım?',
    answer:
      'Sonuç ekranındaki raporla seçeneğini veya destek talebini kullanabilirsin. İnceleme için gerekli bağlam istenir.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const supportEmail = resolveSupportEmail(Constants.expoConfig?.extra);
  const [open, setOpen] = useState<string | null>(questions[0].question);
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Yardım ve destek" subtitle="Buradayız" />
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="help-buoy-outline" size={29} color={colors.accentYellow} />
        </View>
        <Text style={styles.heroTitle}>Bir konuda takıldın mı?</Text>
        <Text style={styles.heroText}>
          Sık sorulanlara göz at ya da destek ekibine bir talep gönder.
        </Text>
        <PrimaryButton
          label="Destek talebi oluştur"
          icon="mail-outline"
          onPress={() => router.push('/support/ticket' as never)}
          style={styles.heroButton}
        />
      </View>
      <Text style={styles.sectionTitle}>Sık sorulanlar</Text>
      <View style={styles.faqs}>
        {questions.map((item) => (
          <Pressable
            key={item.question}
            accessibilityRole="button"
            accessibilityLabel={item.question}
            accessibilityState={{ expanded: open === item.question }}
            onPress={() => setOpen((current) => (current === item.question ? null : item.question))}
            style={styles.faq}
          >
            <View style={styles.faqTop}>
              <Text style={styles.question}>{item.question}</Text>
              <Icon
                name={open === item.question ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </View>
            {open === item.question ? <Text style={styles.answer}>{item.answer}</Text> : null}
          </Pressable>
        ))}
      </View>
      <Notice tone="neutral" title="Acil olmayan talepler">
        Hesap, ödeme ve içerik raporu talepleri için mümkün olduğunda proje veya işlem ayrıntısını
        ekle.
      </Notice>
      <Text selectable style={styles.email}>
        {supportEmail}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  hero: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: colors.accentYellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginTop: 14 },
  heroText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
  heroButton: { alignSelf: 'stretch', marginTop: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  faqs: {
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faq: {
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  faqTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  question: { flex: 1, ...typography.label, color: colors.textPrimary },
  answer: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    paddingRight: 12,
  },
  email: {
    ...typography.label,
    color: colors.accentYellow,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
