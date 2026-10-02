import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton, OnboardingHeader } from '@/features/onboarding/components';
import { confirmOnboardingCreateDraftRights } from '@/features/onboarding/create-handoff';
import { useOnboarding } from '@/features/onboarding/context';
import { explicitConsentSections } from '@/features/legal/privacy-notice';
import { savePendingImageProcessingConsent } from '@/features/legal/image-processing-consent';
import { colors, radii, spacing } from '@/theme';

export default function ConsentScreen() {
  const languageRevision = useLanguageRevision();

  const { completed, markCompleted, ready } = useOnboarding();
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [explicitConsentAccepted, setExplicitConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allAccepted = rightsAccepted && explicitConsentAccepted;

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
    setError(null);
    try {
      await savePendingImageProcessingConsent();
      await markCompleted();
      confirmOnboardingCreateDraftRights();
      router.replace('/(auth)/login');
    } catch {
      setError(translateCopy('Açık rıza kaydedilemedi. Lütfen tekrar dene.'));
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
          title={translateCopy('Güvenlik onayları')}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>
            {translateCopy('Güvenli bir alan{{p0}}oluşturalım.', { p0: `\n` })}
          </Text>
          <Text style={styles.subtitle}>
            {translateCopy(
              'Fotoğrafların ve platformdaki herkesin haklarını korumak için aşağıdaki onayların tamamı gerekli.',
            )}
          </Text>
          <View style={styles.rows}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rightsAccepted }}
              onPress={() => {
                setRightsAccepted((value) => !value);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [styles.row, rightsAccepted && styles.rowChecked, pressed && styles.pressed]}
            >
              <View style={[styles.iconBox, rightsAccepted && styles.iconBoxChecked]}>
                {rightsAccepted ? (
                  <Ionicons color={colors.background} name="checkmark" size={20} />
                ) : (
                  <Ionicons color={colors.textSecondary} name="images-outline" size={20} />
                )}
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{translateCopy('Fotoğraf Kullanım Hakkı')}</Text>
                <Text style={styles.rowDetail}>
                  {translateCopy(
                    'Yüklediğim fotoğrafın bana ait olduğunu veya gerekli kullanım iznine sahip olduğumu beyan ederim.',
                  )}
                </Text>
              </View>
            </Pressable>
            <View style={styles.explicitDocument}>
              <Text style={styles.explicitTitle}>{translateCopy('Açık Rıza Metni')}</Text>
              {explicitConsentSections.map((section) => (
                <View key={section.heading} style={styles.explicitSection}>
                  <Text style={styles.explicitHeading}>{translateCopy(section.heading)}</Text>
                  <Text style={styles.explicitBody}>{translateCopy(section.body)}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: explicitConsentAccepted }}
              onPress={() => {
                setExplicitConsentAccepted((value) => !value);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [styles.explicitCheck, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, explicitConsentAccepted && styles.checkboxChecked]}>
                {explicitConsentAccepted ? (
                  <Ionicons color={colors.background} name="checkmark" size={18} />
                ) : null}
              </View>
              <Text style={styles.explicitCheckText}>
                {translateCopy("Açık Rıza Metni'ni okudum, izin veriyorum.")}
              </Text>
            </Pressable>
          </View>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <View style={styles.legalBox}>
            <Ionicons color={colors.textMuted} name="document-text-outline" size={18} />
            <Text style={styles.legalText}>
              {translateCopy(
                'Aydınlatma Metni ve Kullanım Koşulları kayıt sırasında ayrı olarak sunulur.',
              )}{' '}
              <Text
                accessibilityHint={translateCopy('Belgeyi açar')}
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/legal/[document]', params: { document: 'terms' } })
                }
                style={styles.legalLink}
              >
                {translateCopy('Kullanım Koşulları')}
              </Text>
              {' · '}
              <Text
                accessibilityHint={translateCopy('Belgeyi açar')}
                accessibilityRole="link"
                onPress={() => router.push('/legal/privacy' as never)}
                style={styles.legalLink}
              >
                {translateCopy('Gizlilik Politikası')}
              </Text>
            </Text>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <GoldButton
            disabled={!allAccepted}
            label={translateCopy('Onayla ve devam et')}
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
  explicitDocument: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 17,
    padding: 16,
  },
  explicitTitle: { color: colors.accentYellow, fontSize: 18, fontWeight: '900' },
  explicitSection: { gap: 6 },
  explicitHeading: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  explicitBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  explicitCheck: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkboxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  explicitCheckText: { color: colors.textPrimary, flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  noticeLink: { marginTop: 14, paddingHorizontal: 4, paddingVertical: 6 },
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
