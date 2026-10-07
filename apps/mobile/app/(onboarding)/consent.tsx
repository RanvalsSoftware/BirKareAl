import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboarding } from '@/features/onboarding/context';
import { colors, radii, spacing } from '@/theme';

export default function ConsentScreen() {
  const languageRevision = useLanguageRevision();

  const { completed, markCompleted, ready } = useOnboarding();
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!rightsAccepted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await markCompleted();
      router.replace('/(auth)/login');
    } catch {
      setError(translateCopy('Başlangıç onayı kaydedilemedi. Lütfen tekrar dene.'));
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
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={translateCopy('Geri')}
            accessibilityRole="button"
            hitSlop={10}
            onPress={returnFromConsent}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons color={colors.textPrimary} name="arrow-back" size={21} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerStep}>{translateCopy('BAŞLAMADAN ÖNCE')}</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {translateCopy('Kaynak görsel hakları')}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>
            {translateCopy('Güvenli bir alan{{p0}}oluşturalım.', { p0: `\n` })}
          </Text>
          <Text style={styles.subtitle}>
            {translateCopy(
              'BirKare Studio’ya yalnızca kullanma hakkına sahip olduğun ürün görsellerini yüklemelisin.',
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
            <View style={styles.consentNotice}>
              <Ionicons color="#91BBA0" name="shield-checkmark-outline" size={19} />
              <Text style={styles.consentNoticeText}>
                {translateCopy(
                  'Bu adım yüz verisi işlemeye izin vermez. Yüz içeren bir aracı seçersen açık rızan ilgili işlemden hemen önce ayrıca istenir; onay vermemen hesap açmanı engellemez.',
                )}
              </Text>
            </View>
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !rightsAccepted || submitting }}
            disabled={!rightsAccepted || submitting}
            onPress={() => void continueToLogin()}
            style={({ pressed }) => [
              styles.continueButton,
              (!rightsAccepted || submitting) && styles.continueButtonDisabled,
              pressed && rightsAccepted && !submitting && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#0B2118" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {translateCopy('Onayla ve devam et')}
                </Text>
                <Ionicons color="#0B2118" name="arrow-forward" size={20} />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 680,
    paddingHorizontal: 20,
    paddingTop: spacing.xs,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
  },
  backButton: {
    alignItems: 'center',
    borderColor: '#28342D',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  headerStep: { color: '#91BBA0', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 3 },
  headerSpacer: { width: 44 },
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
  rowChecked: { backgroundColor: '#15251C', borderColor: 'rgba(145,187,160,0.65)' },
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
  iconBoxChecked: { backgroundColor: '#B8F1CD', borderColor: '#B8F1CD' },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  rowDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 5 },
  consentNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#111815',
    borderColor: '#28342D',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  consentNoticeText: { color: colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 17 },
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
  legalLink: { color: '#B8F1CD', fontWeight: '800', textDecorationLine: 'underline' },
  bottom: { paddingBottom: 8, paddingTop: 10 },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#B8F1CD',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  continueButtonDisabled: { opacity: 0.38 },
  continueButtonText: { color: '#0B2118', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.78 },
});
