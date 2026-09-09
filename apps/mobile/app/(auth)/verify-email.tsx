import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { authMailToken, EMAIL_REQUEST_NOTICE } from '@/features/auth/email-delivery';
import {
  AuthBrandBar,
  AuthFormCard,
  AuthLayout,
  AuthLink,
  AuthLogo,
  AuthNote,
  AuthTitle,
  FormField,
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';

export default function VerifyEmailScreen() {
  const { email: emailParam, token: tokenParam, delivery } = useLocalSearchParams<{
    email?: string;
    token?: string;
    delivery?: string;
  }>();
  const email = typeof emailParam === 'string' ? emailParam.trim() : '';
  const [token, setToken] = useState(authMailToken(tokenParam));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const operation = useRef(false);

  useEffect(() => {
    // A new email link can open while this screen is already mounted.
    const incoming = authMailToken(tokenParam);
    if (incoming) setToken(incoming);
  }, [tokenParam]);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [error]);
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/register');
  };
  const verify = async () => {
    if (operation.current) return;
    const normalized = authMailToken(token);
    if (normalized.length < 40) {
      setError('E-postadaki doğrulama kodunun tamamını gir.');
      return;
    }
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        '/v1/auth/verify-email',
        { method: 'POST', body: JSON.stringify({ token: normalized }) },
        { authenticated: false },
      );
      router.replace('/(auth)/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kod doğrulanamadı.');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const resend = async () => {
    if (operation.current) return;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Tekrar göndermek için kayıt ekranındaki e-posta adresin gerekli.');
      return;
    }
    operation.current = true;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiRequest<{ developmentVerificationToken?: string }>(
        '/v1/auth/resend-verification',
        { method: 'POST', body: JSON.stringify({ email }) },
        { authenticated: false },
      );
      if (result.developmentVerificationToken)
        setToken(authMailToken(result.developmentVerificationToken));
      setNotice(EMAIL_REQUEST_NOTICE);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'E-posta gönderilemedi.');
    } finally {
      operation.current = false;
      setResending(false);
    }
  };
  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />
      <AuthLogo compact />
      <View style={styles.icon}>
        <Ionicons name="mail-open-outline" size={27} color="#FFC400" />
      </View>
      <AuthTitle
        eyebrow="GÜVENLİ BAŞLANGIÇ"
        title="E-postanı doğrula."
        subtitle={`Hesabını etkinleştirmek için ${email || 'e-posta adresine'} gelen doğrulama bağlantısını aç veya e-postadaki kodu buraya yapıştır.`}
      />
      <AuthFormCard>
        {delivery === 'failed' ? (
          <AuthNote icon="alert-circle-outline" tone="warning">
            Hesabın oluşturuldu ancak doğrulama e-postası gönderilemedi. Yeniden kayıt olman
            gerekmiyor; aşağıdan e-postayı tekrar göndermeyi deneyebilirsin.
          </AuthNote>
        ) : null}
        <FormField
          accessibilityLabel="Doğrulama kodu veya token"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={512}
          icon={<Ionicons color={authColors.muted} name="key-outline" size={18} />}
          label="Doğrulama kodu"
          onChangeText={setToken}
          placeholder="Doğrulama kodunu gir"
          value={token}
        />
        {notice ? (
          <AuthNote icon="checkmark-circle-outline" tone="success">
            {notice}
          </AuthNote>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <GradientAuthButton
          icon="checkmark"
          loading={busy}
          disabled={resending}
          onPress={() => void verify()}
        >
          E-postamı doğrula
        </GradientAuthButton>
      </AuthFormCard>
      <View style={styles.links}>
        <AuthLink onPress={() => void resend()}>
          {resending ? 'Talep işleniyor…' : 'E-postayı tekrar gönder'}
        </AuthLink>
        <AuthLink onPress={() => router.push('/(auth)/register')}>
          E-posta adresini değiştir
        </AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,196,0,.10)',
    borderColor: 'rgba(255,196,0,.30)',
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginBottom: 15,
    marginTop: 8,
    width: 46,
  },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 14 },
  links: { alignItems: 'center', gap: 17, marginTop: 23 },
});
