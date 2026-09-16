import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCopy } from '@/features/settings/language-store';

export default function VerifyEmailScreen() {
  const copy = useCopy();
  const reducedMotion = useReducedMotion();
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
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.72)).current;
  const successTranslateY = useRef(new Animated.Value(16)).current;

  const [token, setToken] = useState(authMailToken(tokenParam));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

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
    if (!error) return;
    const timeout = setTimeout(() => {
      setError(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    [],
  );

  const goBack = () => {
    if (verified) return;
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/register');
  };

  const showVerificationSuccess = () => {
    setVerified(true);
    inputRef.current?.blur();

    if (reducedMotion) {
      successOpacity.setValue(1);
      successScale.setValue(1);
      successTranslateY.setValue(0);
    } else {
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(successScale, {
            toValue: 1.08,
            damping: 11,
            stiffness: 180,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.spring(successScale, {
            toValue: 1,
            damping: 12,
            stiffness: 210,
            mass: 0.7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(successTranslateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }

    successTimer.current = setTimeout(
      () => {
        router.replace('/(auth)/login');
      },
      reducedMotion ? 500 : 1550,
    );
  };

  const verify = async () => {
    if (operation.current || verified) return;

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

      showVerificationSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kod doğrulanamadı.');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (operation.current || verified) return;

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
    <View style={styles.screen}>
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
                editable={!busy && !verified}
                keyboardType="default"
                maxLength={512}
                onChangeText={(value) => {
                  setToken(value);
                  if (error) setError(null);
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

              {token.length > 0 && !busy && !verified ? (
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
            disabled={resending || verified}
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

      {verified ? (
        <Animated.View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[styles.successOverlay, { opacity: successOpacity }]}
        >
          <Animated.View
            style={[
              styles.successContent,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }, { translateY: successTranslateY }],
              },
            ]}
          >
            <View style={styles.successHalo}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={52} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.successTitle}>
              {copy('E-posta doğrulandı', 'Email verified')}
            </Text>
            <Text style={styles.successText}>
              {copy(
                'Hesabın hazır. Giriş ekranına yönlendiriliyorsun…',
                'Your account is ready. Taking you to sign in…',
              )}
            </Text>
            <View style={styles.successProgressTrack}>
              <Animated.View
                style={[
                  styles.successProgress,
                  {
                    opacity: successOpacity,
                    transform: [{ scaleX: successOpacity }],
                  },
                ]}
              />
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050505',
  },
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
  successOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(5,5,5,0.96)',
  },
  successContent: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successHalo: {
    width: 122,
    height: 122,
    borderRadius: 61,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,199,89,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.18)',
    shadowColor: '#34C759',
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 8 },
  },
  successCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  successTitle: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.45,
    textAlign: 'center',
  },
  successText: {
    marginTop: 9,
    color: '#A9A7B0',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  successProgressTrack: {
    width: 88,
    height: 3,
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  successProgress: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#34C759',
  },
});
