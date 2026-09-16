import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';
import { useCopy } from '@/features/settings/language-store';

export default function VerifyEmailScreen() {
  const copy = useCopy();
  const {
    email: emailParam,
    token: tokenParam,
    delivery,
  } = useLocalSearchParams<{
    email?: string;
    token?: string;
    delivery?: string;
  }>();

  const email = typeof emailParam === 'string' ? emailParam.trim() : '';

  const inputRef = useRef<TextInput>(null);
  const operation = useRef(false);

  const [token, setToken] = useState(authMailToken(tokenParam));

  const [notice, setNotice] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const incoming = authMailToken(tokenParam);
    if (!incoming) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setToken(incoming);
    });
    return () => {
      active = false;
    };
  }, [tokenParam]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = setTimeout(() => {
      setError(null);
    }, 4000);

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
    if (operation.current) {
      return;
    }

    const normalized = authMailToken(token);

    if (normalized.length < 40) {
      setError('E-postadaki doğrulama kodunun tamamını gir.');

      inputRef.current?.focus();
      return;
    }

    operation.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await apiRequest(
        '/v1/auth/verify-email',
        {
          method: 'POST',
          body: JSON.stringify({
            token: normalized,
          }),
        },
        {
          authenticated: false,
        },
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
    if (operation.current) {
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Tekrar göndermek için kayıt ekranındaki e-posta adresin gerekli.');
      return;
    }

    operation.current = true;
    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await apiRequest<{
        developmentVerificationToken?: string;
      }>(
        '/v1/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
          }),
        },
        {
          authenticated: false,
        },
      );

      if (result.developmentVerificationToken) {
        setToken(authMailToken(result.developmentVerificationToken));
      }

      setNotice(EMAIL_REQUEST_NOTICE);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'E-posta gönderilemedi.');
    } finally {
      operation.current = false;
      setResending(false);
    }
  };

  const clearToken = () => {
    setToken('');
    setError(null);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />

      <AuthLogo compact />

      <View style={styles.icon}>
        <Ionicons name="mail-open-outline" size={27} color="#FFC400" />
      </View>

      <AuthTitle
        eyebrow={copy('GÜVENLİ BAŞLANGIÇ', 'SECURE START')}
        title={copy('E-postanı doğrula.', 'Verify your email.')}
        subtitle={copy(
          `Hesabını etkinleştirmek için ${email || 'e-posta adresine'} gelen doğrulama bağlantısını aç veya e-postadaki kodu buraya yapıştır.`,
          `Open the verification link sent to ${email || 'your email address'} or paste the code here to activate your account.`,
        )}
      />

      <AuthFormCard>
        {delivery === 'failed' ? (
          <AuthNote icon="alert-circle-outline" tone="warning">
            Hesabın oluşturuldu ancak doğrulama e-postası gönderilemedi. Yeniden kayıt olman
            gerekmiyor; aşağıdan e-postayı tekrar göndermeyi deneyebilirsin.
          </AuthNote>
        ) : null}

        {/* DOĞRULAMA INPUT */}
        <View style={styles.field}>
          <Text style={styles.label}>{copy('Doğrulama kodu', 'Verification code')}</Text>

          <View style={[styles.inputRow, error && styles.inputRowError]}>
            <Ionicons color={authColors.yellow} name="key-outline" size={18} />

            <TextInput
              ref={inputRef}
              accessibilityLabel={copy('Doğrulama kodu', 'Verification code')}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              blurOnSubmit={false}
              cursorColor={authColors.yellow}
              editable={!busy}
              keyboardType="default"
              maxLength={512}
              onChangeText={(value) => {
                setToken(value);

                if (error) {
                  setError(null);
                }
              }}
              onSubmitEditing={() => {
                void verify();
              }}
              placeholder={copy(
                'Doğrulama kodunu gir veya yapıştır',
                'Enter or paste the verification code',
              )}
              placeholderTextColor={authColors.muted}
              rejectResponderTermination={false}
              returnKeyType="done"
              selectionColor={authColors.yellow}
              selectTextOnFocus={false}
              spellCheck={false}
              style={styles.input}
              underlineColorAndroid="transparent"
              value={token}
            />

            {token.length > 0 && !busy ? (
              <Pressable
                accessibilityLabel="Kodu temizle"
                accessibilityRole="button"
                hitSlop={10}
                onPress={clearToken}
                style={styles.clearButton}
              >
                <Ionicons color={authColors.secondary} name="close-circle" size={20} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.helperText}>
            {copy(
              'E-postadaki doğrulama kodunu eksiksiz olarak buraya yapıştır.',
              'Paste the complete verification code from your email here.',
            )}
          </Text>
        </View>

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
          accessibilityLabel={copy('E-postamı doğrula', 'Verify my email')}
          icon="checkmark"
          loading={busy}
          disabled={resending}
          onPress={() => {
            void verify();
          }}
        >
          {copy('E-postamı doğrula', 'Verify my email')}
        </GradientAuthButton>
      </AuthFormCard>

      <View style={styles.links}>
        <AuthLink
          onPress={() => {
            void resend();
          }}
        >
          {resending
            ? copy('Talep işleniyor…', 'Processing…')
            : copy('E-postayı tekrar gönder', 'Resend email')}
        </AuthLink>

        <AuthLink onPress={() => router.push('/(auth)/register')}>
          {copy('E-posta adresini değiştir', 'Change email address')}
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

  field: {
    marginTop: 4,
  },

  label: {
    color: '#EFEFEF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginBottom: 8,
  },

  inputRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 56,
    paddingLeft: 15,
  },

  inputRowError: {
    borderColor: 'rgba(255,135,125,.65)',
  },

  input: {
    color: authColors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 55,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  clearButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 46,
  },

  helperText: {
    color: authColors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },

  error: {
    color: '#FF928A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },

  links: {
    alignItems: 'center',
    gap: 17,
    marginTop: 23,
  },
});
