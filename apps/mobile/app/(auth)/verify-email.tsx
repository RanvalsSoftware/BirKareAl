import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { emailVerificationCode, EMAIL_REQUEST_NOTICE } from '@/features/auth/email-delivery';
import { AuthSuccessNotice } from '@/features/auth/AuthSuccessNotice';
import { useAuthNotice, useRouteAuthNotice } from '@/features/auth/use-auth-notice';
import {
  AuthBrandBar, AuthFormCard, AuthLayout, AuthLink, AuthLogo, AuthNote,
  AuthTitle, GradientAuthButton, authColors,
} from '@/features/auth/auth-ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCopy } from '@/features/settings/language-store';

export default function VerifyEmailScreen() {
  const copy = useCopy();
  const reducedMotion = useReducedMotion();
  const { email: emailParam, code: codeParam, token: tokenParam, delivery, registered } = useLocalSearchParams<{
    email?: string; code?: string; token?: string; delivery?: string; registered?: string;
  }>();
  const email = typeof emailParam === 'string' ? emailParam.trim() : '';
  const registrationNotice = useRouteAuthNotice('registered', registered);
  const { notice, setNotice, dismissNotice } = useAuthNotice<string>();
  const inputRef = useRef<TextInput>(null);
  const operation = useRef(false);
  const navigated = useRef(false);
  const screenRevision = useRef(0);
  const [successOpacity] = useState(() => new Animated.Value(0));
  const [successScale] = useState(() => new Animated.Value(0.72));
  const [successTranslateY] = useState(() => new Animated.Value(16));
  const [otpFocusScale] = useState(() => new Animated.Value(0.96));
  const [code, setCode] = useState(emailVerificationCode(codeParam ?? tokenParam));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const activeOtpIndex = Math.min(code.length, 5);

  useFocusEffect(useCallback(() => {
    screenRevision.current += 1;
    return () => { screenRevision.current += 1; };
  }, []));

  // The animation is decorative; navigation never waits for its completion.
  // A manual continue action is also available if a timer is delayed.
  const finishVerification = useCallback(() => {
    if (!verified || navigated.current) return;
    navigated.current = true;
    router.replace({ pathname: '/(auth)/login', params: { verified: '1', ...(email ? { email } : {}) } });
  }, [verified, email]);
  useFocusEffect(useCallback(() => {
    if (!verified) return;
    const timer = setTimeout(finishVerification, reducedMotion ? 500 : 1550);
    return () => clearTimeout(timer);
  }, [verified, reducedMotion, finishVerification]));

  useEffect(() => {
    if (reducedMotion) { otpFocusScale.setValue(1); return; }
    otpFocusScale.setValue(0.96);
    Animated.spring(otpFocusScale, { toValue: 1, damping: 12, stiffness: 240, mass: 0.55, useNativeDriver: true }).start();
  }, [activeOtpIndex, inputFocused, otpFocusScale, reducedMotion]);
  useEffect(() => {
    const incoming = emailVerificationCode(codeParam ?? tokenParam);
    if (!incoming) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) setCode(incoming); });
    return () => { active = false; };
  }, [codeParam, tokenParam]);
  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timeout);
  }, [error]);

  const goBack = () => {
    if (verified) { finishVerification(); return; }
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/(auth)/register');
  };
  const showVerificationSuccess = () => {
    setVerified(true);
    inputRef.current?.blur();
    if (reducedMotion) {
      successOpacity.setValue(1); successScale.setValue(1); successTranslateY.setValue(0);
    } else {
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(successScale, { toValue: 1.08, damping: 11, stiffness: 180, mass: 0.8, useNativeDriver: true }),
          Animated.spring(successScale, { toValue: 1, damping: 12, stiffness: 210, mass: 0.7, useNativeDriver: true }),
        ]),
        Animated.timing(successTranslateY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  };
  const verify = async () => {
    if (operation.current || verified) return;
    const normalized = emailVerificationCode(code);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Kodu doğrulamak için kayıt ekranındaki e-posta adresin gerekli.'); return;
    }
    if (!/^\d{6}$/.test(normalized)) {
      setError('E-postandaki 6 haneli doğrulama kodunu gir.'); inputRef.current?.focus(); return;
    }
    operation.current = true;
    const revision = screenRevision.current;
    setBusy(true); setError(null); dismissNotice(); registrationNotice.dismiss();
    try {
      await apiRequest('/v1/auth/verify-email', {
        method: 'POST', body: JSON.stringify({ email, code: normalized }),
      }, { authenticated: false });
      if (revision === screenRevision.current) showVerificationSuccess();
    } catch (reason) {
      if (revision === screenRevision.current) setError(reason instanceof Error ? reason.message : 'Kod doğrulanamadı.');
    } finally {
      operation.current = false; setBusy(false);
    }
  };
  const resend = async () => {
    if (operation.current || verified) return;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Tekrar göndermek için kayıt ekranındaki e-posta adresin gerekli.'); return;
    }
    operation.current = true;
    const revision = screenRevision.current;
    setResending(true); setError(null); dismissNotice(); registrationNotice.dismiss();
    try {
      const result = await apiRequest<{ developmentVerificationToken?: string }>(
        '/v1/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }, { authenticated: false },
      );
      if (revision !== screenRevision.current) return;
      if (result.developmentVerificationToken) setCode(emailVerificationCode(result.developmentVerificationToken));
      setNotice(EMAIL_REQUEST_NOTICE);
      // The old delivery warning no longer describes this latest accepted request.
      // The notice still does NOT claim confirmed SMTP delivery.
      if (delivery === 'failed') router.setParams({ delivery: '0' });
    } catch (reason) {
      if (revision === screenRevision.current) setError(reason instanceof Error ? reason.message : 'E-posta gönderilemedi.');
    } finally {
      operation.current = false; setResending(false);
    }
  };
  const clearCode = () => {
    setCode(''); setError(null); dismissNotice(); registrationNotice.dismiss();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <View style={styles.screen}>
      <AuthLayout>
        <AuthBrandBar onBack={goBack} />
        <AuthLogo compact />
        <View style={styles.icon}><Ionicons name="mail-open-outline" size={27} color="#FFC400" /></View>
        <AuthTitle eyebrow={copy('GÜVENLİ BAŞLANGIÇ', 'SECURE START')} title={copy('E-postanı doğrula.', 'Verify your email.')}
          subtitle={copy(`Hesabını etkinleştirmek için ${email || 'e-posta adresine'} gelen bağlantıyı aç veya 6 haneli kodu gir.`,
            `Open the verification link sent to ${email || 'your email address'} or enter the six-digit code to activate your account.`)} />
        <AuthFormCard>
          {registrationNotice.visible ? <AuthSuccessNotice title={copy('Hesabın oluşturuldu', 'Account created')}
            message={copy('Kaydını tamamlamak için e-postandaki doğrulama kodunu gir.', 'Enter the code from your email to complete registration.')}
            onDismiss={registrationNotice.dismiss} /> : null}
          {delivery === 'failed' ? <AuthNote icon="alert-circle-outline" tone="warning">
            Hesabın oluşturuldu ancak doğrulama e-postası gönderilemedi. Yeniden kayıt olman
            gerekmiyor; aşağıdan e-postayı tekrar göndermeyi deneyebilirsin.
          </AuthNote> : null}
          <View style={styles.field}>
            <Text style={styles.label}>{copy('Doğrulama kodu', 'Verification code')}</Text>
            <View style={styles.otpInputShell}>
              <TextInput ref={inputRef} accessibilityLabel={copy('Doğrulama kodu', 'Verification code')}
                autoCapitalize="none" autoCorrect={false} autoComplete="one-time-code" autoFocus blurOnSubmit={false}
                caretHidden cursorColor={authColors.yellow} editable={!busy && !verified} keyboardType="number-pad" maxLength={6}
                onChangeText={(value) => { setCode(emailVerificationCode(value)); dismissNotice(); registrationNotice.dismiss(); if (error) setError(null); }}
                onBlur={() => setInputFocused(false)} onFocus={() => setInputFocused(true)} onSubmitEditing={() => { void verify(); }}
                rejectResponderTermination={false} returnKeyType="done" selectionColor={authColors.yellow} selectTextOnFocus={false}
                spellCheck={false} style={styles.otpNativeInput} textContentType="oneTimeCode" underlineColorAndroid="transparent" value={code} />
              <Pressable accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
                {Array.from({ length: 6 }, (_, index) => {
                  const digit = code[index] ?? '';
                  const active = inputFocused && !verified && index === activeOtpIndex;
                  return (
                    <Animated.View key={index} testID={`verification-code-cell-${index + 1}`}
                      style={[styles.otpCell, digit ? styles.otpCellFilled : null, active ? styles.otpCellActive : null,
                        error ? styles.otpCellError : null, active ? { transform: [{ scale: otpFocusScale }] } : null]}>
                      {digit ? <Text style={styles.otpDigit}>{digit}</Text> : active ? <View style={styles.otpCursorDot} /> : null}
                    </Animated.View>
                  );
                })}
              </Pressable>
            </View>
            <View style={styles.otpActions}>
              <Pressable accessibilityLabel={copy('Kodu temizle', 'Clear code')} accessibilityRole="button"
                disabled={!code.length || busy || verified} hitSlop={8} onPress={clearCode}
                style={({ pressed }) => [styles.otpAction, !code.length || busy || verified ? styles.otpActionDisabled : null, pressed ? styles.otpActionPressed : null]}>
                <Ionicons color={authColors.secondary} name="close-circle-outline" size={16} />
                <Text style={styles.otpActionText}>{copy('Temizle', 'Clear')}</Text>
              </Pressable>
              <Pressable accessibilityLabel={copy('Kodu tekrar gönder', 'Resend code')} accessibilityRole="button"
                disabled={resending || busy || verified} onPress={() => void resend()}
                style={({ pressed }) => [styles.otpAction, resending || busy || verified ? styles.otpActionDisabled : null, pressed ? styles.otpActionPressed : null]}>
                <Ionicons color={authColors.secondary} name="refresh-outline" size={16} />
                <Text style={styles.otpActionText}>{resending ? copy('Gönderiliyor…', 'Sending…') : copy('Kodu tekrar gönder', 'Resend code')}</Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>{copy('E-postandaki 6 haneli kod 10 dakika geçerlidir ve yalnızca bir kez kullanılabilir.', 'The six-digit code is valid for 10 minutes and can be used only once.')}</Text>
          </View>
          {notice ? <AuthSuccessNotice title={copy('İstek alındı', 'Request accepted')} message={notice} onDismiss={dismissNotice} /> : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <GradientAuthButton accessibilityLabel={copy('E-postamı doğrula', 'Verify my email')} icon="checkmark"
            loading={busy} disabled={resending || verified} onPress={() => { void verify(); }}>
            {copy('E-postamı doğrula', 'Verify my email')}
          </GradientAuthButton>
        </AuthFormCard>
        <View style={styles.links}>
          <AuthLink onPress={() => router.push('/(auth)/register')}>{copy('E-posta adresini değiştir', 'Change email address')}</AuthLink>
        </View>
      </AuthLayout>
      {verified ? (
        <Animated.View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={[styles.successOverlay, { opacity: successOpacity }]}>
          <Animated.View style={[styles.successContent, { opacity: successOpacity, transform: [{ scale: successScale }, { translateY: successTranslateY }] }]}>
            <View style={styles.successHalo}><View style={styles.successCircle}><Ionicons name="checkmark" size={52} color="#FFFFFF" /></View></View>
            <Text style={styles.successTitle}>{copy('E-posta doğrulandı', 'Email verified')}</Text>
            <Text style={styles.successText}>{copy('Hesabın hazır. Giriş ekranına yönlendiriliyorsun…', 'Your account is ready. Taking you to sign in…')}</Text>
            <View style={styles.successProgressTrack}><Animated.View style={[styles.successProgress, { opacity: successOpacity, transform: [{ scaleX: successOpacity }] }]} /></View>
            <Pressable testID="continue-after-verification" accessibilityRole="button" onPress={finishVerification} style={styles.successContinue}>
              <Text style={styles.successContinueText}>{copy('Giriş ekranına geç', 'Continue to sign in')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' },
  icon: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,196,0,.10)', borderColor: 'rgba(255,196,0,.30)', borderRadius: 23, borderWidth: 1, height: 46, justifyContent: 'center', marginBottom: 15, marginTop: 8, width: 46 },
  field: { marginTop: 4 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
  otpInputShell: { position: 'relative', width: '100%' },
  otpNativeInput: { position: 'absolute', top: 30, left: '50%', zIndex: 2, color: 'transparent', height: 1, opacity: 0.01, padding: 0, width: 1 },
  otpRow: { flexDirection: 'row', gap: 7, justifyContent: 'center', width: '100%' },
  otpCell: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 15, borderWidth: 1, flex: 1, height: 64, justifyContent: 'center', maxWidth: 48, minWidth: 0 },
  otpCellFilled: { backgroundColor: 'rgba(255,196,0,0.075)', borderColor: 'rgba(255,196,0,0.34)', shadowColor: '#FFC400', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  otpCellActive: { backgroundColor: 'rgba(255,196,0,0.11)', borderColor: '#FFD55A', borderWidth: 1.5, shadowColor: '#FFC400', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 15 },
  otpCellError: { borderColor: 'rgba(255,135,125,.7)' },
  otpDigit: { color: '#FFFFFF', fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '800', lineHeight: 31 },
  otpCursorDot: { backgroundColor: '#FFD55A', borderRadius: 4, height: 7, shadowColor: '#FFC400', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, width: 7 },
  otpActions: { alignItems: 'center', flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 12 },
  otpAction: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.055)', borderColor: 'rgba(255,255,255,0.13)', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: 13 },
  otpActionDisabled: { opacity: 0.42 }, otpActionPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  otpActionText: { color: authColors.secondary, fontSize: 12, fontWeight: '700' },
  helperText: { color: authColors.muted, fontSize: 11, lineHeight: 16, marginTop: 7 },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 14 },
  links: { alignItems: 'center', gap: 17, marginTop: 23 },
  successOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, elevation: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: 'rgba(5,5,5,0.96)' },
  successContent: { width: '100%', maxWidth: 340, alignItems: 'center' },
  successHalo: { width: 122, height: 122, borderRadius: 61, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52,199,89,0.09)', borderWidth: 1, borderColor: 'rgba(52,199,89,0.18)', shadowColor: '#34C759', shadowOpacity: 0.3, shadowRadius: 26, shadowOffset: { width: 0, height: 8 } },
  successCircle: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34C759', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  successTitle: { marginTop: 24, color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.45, textAlign: 'center' },
  successText: { marginTop: 9, color: '#A9A7B0', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  successProgressTrack: { width: 88, height: 3, marginTop: 24, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  successProgress: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: '#34C759' },
  successContinue: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, marginTop: 12 },
  successContinueText: { color: '#8FF0B0', fontSize: 14, fontWeight: '700' },
});
