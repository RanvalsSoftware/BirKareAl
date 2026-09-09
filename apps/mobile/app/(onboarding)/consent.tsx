import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton, OnboardingHeader } from '@/features/onboarding/components';
import { confirmOnboardingCreateDraftRights } from '@/features/onboarding/create-handoff';
import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, spacing } from '@/theme';

const consentRows = [
  {
    id: 'rights',
    icon: 'images-outline' as const,
    title: 'Fotoğraf kullanım hakkım var',
    detail:
      'Yüklediğim fotoğrafın bana ait olduğunu veya gerekli kullanım iznine sahip olduğumu onaylıyorum.',
  },
  {
    id: 'ai',
    icon: 'sparkles-outline' as const,
    title: 'AI içeriği açıklamasını kabul ediyorum',
    detail: 'Sonuçların AI ile üretildiğini ve yanıltıcı kullanımın yasak olduğunu anlıyorum.',
  },
  {
    id: 'age',
    icon: 'calendar-outline' as const,
    title: '18 yaşını doldurdum',
    detail: 'BirKare AI şu anda 18 yaş ve üzeri kullanıcılar için tasarlanmıştır.',
  },
] as const;

export default function ConsentScreen() {
  const { completed, markCompleted, ready } = useOnboarding();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const allAccepted = consentRows.every((row) => accepted[row.id]);

  useEffect(() => {
    // A completed user can still reach this route through a stale deep link or
    // a restored navigation state. Do not make them approve the same consent
    // twice; send them directly to the next unauthenticated screen instead.
    if (ready && completed) {
      router.replace('/(auth)/login');
    }
  }, [completed, ready]);

  function returnFromConsent() {
    // Consent may be entered with `replace` after the four-step guided flow.
    // In that case there is no previous route, so `back()` would surface an
    // unhandled GO_BACK action. Restart the entry flow instead.
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  async function continueToLogin() {
    if (!allAccepted || submitting) return;
    setSubmitting(true);
    try {
      await markCompleted();
      confirmOnboardingCreateDraftRights();
      router.replace('/(auth)/login');
    } finally {
      setSubmitting(false);
    }
  }

  // Avoid briefly flashing the consent controls while their persisted state is
  // loading, or after a completed user reaches an old route in navigation.
  if (!ready || completed) {
    return <SafeAreaView edges={['top', 'bottom']} style={styles.safe} />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={returnFromConsent}
          step="BAŞLAMADAN ÖNCE"
          title="Güvenlik onayları"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>
            Güvenli bir alan{`\n`}oluşturalım.
          </Text>
          <Text style={styles.subtitle}>
            Fotoğrafların ve platformdaki herkesin haklarını korumak için aşağıdaki onayların tamamı
            gerekli.
          </Text>
          <View style={styles.rows}>
            {consentRows.map((row) => {
              const checked = Boolean(accepted[row.id]);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  key={row.id}
                  onPress={() => {
                    setAccepted((current) => ({ ...current, [row.id]: !current[row.id] }));
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    checked && styles.rowChecked,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.iconBox, checked && styles.iconBoxChecked]}>
                    {checked ? (
                      <Ionicons color={colors.background} name="checkmark" size={20} />
                    ) : (
                      <Ionicons color={colors.textSecondary} name={row.icon} size={20} />
                    )}
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDetail}>{row.detail}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.legalBox}>
            <Ionicons color={colors.textMuted} name="document-text-outline" size={18} />
            <Text style={styles.legalText}>
              Devam ederek{' '}
              <Text
                accessibilityHint="Belgeyi açar"
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/legal/[document]', params: { document: 'terms' } })
                }
                style={styles.legalLink}
              >
                Kullanım Koşulları
              </Text>
              ’nı,{' '}
              <Text
                accessibilityHint="Belgeyi açar"
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } })
                }
                style={styles.legalLink}
              >
                Gizlilik Politikası
              </Text>
              ’nı ve topluluk güvenliği kurallarını kabul etmiş olursun.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <GoldButton
            disabled={!allAccepted}
            label="Onayla ve devam et"
            loading={submitting}
            onPress={continueToLogin}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  content: { paddingBottom: 25, paddingTop: 28 },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.15,
    lineHeight: 36,
  },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  rows: { gap: 11, marginTop: 26 },
  row: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 15,
  },
  rowChecked: { backgroundColor: '#15130D', borderColor: 'rgba(255,196,0,0.50)' },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconBoxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  rowDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 5 },
  legalBox: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
    marginTop: 21,
    paddingHorizontal: 4,
  },
  legalText: { color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 17 },
  legalLink: { color: colors.accentYellow, fontWeight: '800', textDecorationLine: 'underline' },
  bottom: { paddingBottom: 8, paddingTop: 10 },
  pressed: { opacity: 0.78 },
});
