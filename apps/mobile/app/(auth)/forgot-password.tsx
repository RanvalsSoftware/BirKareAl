import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import {
  AuthBrandBar, AuthFormCard, AuthHero, AuthLayout, AuthLink,
  AuthTitle, GradientAuthButton, authColors,
} from '@/features/auth/auth-ui';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/validation';
import { EMAIL_REQUEST_NOTICE } from '@/features/auth/email-delivery';
import { AuthSuccessNotice } from '@/features/auth/AuthSuccessNotice';
import { useAuthNotice } from '@/features/auth/use-auth-notice';
import { useCopy } from '@/features/settings/language-store';

export default function ForgotPasswordScreen() {
  const copy = useCopy();
  const { notice, setNotice, dismissNotice } = useAuthNotice<string>();
  const screenRevision = useRef(0);
  useFocusEffect(useCallback(() => {
    screenRevision.current += 1;
    return () => { screenRevision.current += 1; };
  }, []));
  const { control, handleSubmit, formState: { errors, isSubmitting }, clearErrors, setError } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!errors.root?.message) return;
    const timeout = setTimeout(() => clearErrors('root'), 4_000);
    return () => clearTimeout(timeout);
  }, [clearErrors, errors.root?.message]);
  const submit = handleSubmit(async (values) => {
    dismissNotice();
    const revision = screenRevision.current;
    try {
      const result = await apiRequest<{ accepted: true; developmentResetToken?: string }>(
        '/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) }, { authenticated: false },
      );
      if (revision !== screenRevision.current) return;
      // Show success only for an accepted API response, not react-hook-form's
      // isSubmitSuccessful (a caught API failure can also resolve that callback).
      setNotice(EMAIL_REQUEST_NOTICE);
      // Only explicitly enabled local development may return a test token.
      // SMTP delivery itself is never inferred from the anonymous response.
      if (result.developmentResetToken) {
        router.push({ pathname: '/(auth)/reset-password', params: { token: result.developmentResetToken } });
      }
    } catch (error) {
      if (revision !== screenRevision.current) return;
      setError('root', { message: error instanceof Error ? error.message : copy('İstek gönderilemedi.', 'Could not send the request.') });
    }
  });

  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/(auth)/login');
  };

  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />
      <AuthHero variant="forgot" />
      <AuthTitle eyebrow={copy('HESAP GÜVENLİĞİ', 'ACCOUNT SECURITY')} title={copy('Şifreni yenile.', 'Reset your password.')}
        subtitle={copy('E-posta adresini gir; hesabın varsa güvenli bir sıfırlama bağlantısı göndereceğiz.', 'Enter your email and we will send a secure reset link if an account exists.')} />
      <AuthFormCard>
        <Controller control={control} name="email" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('E-posta', 'Email')}</Text>
            <View style={styles.inputRow}>
              <Ionicons color={authColors.yellow} name="mail-outline" size={18} />
              <TextInput accessibilityLabel={copy('E-posta', 'Email')} autoCapitalize="none" autoComplete="email" autoCorrect={false}
                blurOnSubmit={false} cursorColor={authColors.yellow} keyboardType="email-address" onBlur={onBlur}
                onChangeText={(value) => { dismissNotice(); onChange(value); }} placeholder="ornek@eposta.com"
                placeholderTextColor={authColors.muted} rejectResponderTermination={false} returnKeyType="send"
                selectionColor={authColors.yellow} style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
            </View>
            {errors.email?.message ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
          </View>
        )} />
        {notice ? <AuthSuccessNotice title={copy('İstek alındı', 'Request accepted')} message={notice} onDismiss={dismissNotice} /> : null}
        {errors.root?.message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.root.message}</Text> : null}
        <GradientAuthButton icon="send-outline" loading={isSubmitting} onPress={() => void submit()}>
          {copy('Bağlantı gönder', 'Send link')}
        </GradientAuthButton>
      </AuthFormCard>
      <View style={styles.returnLink}><AuthLink onPress={goBack}>{copy('Giriş ekranına dön', 'Back to sign in')}</AuthLink></View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
  inputRow: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 13, minHeight: 56, paddingLeft: 15 },
  input: { color: authColors.text, flex: 1, fontSize: 16, minHeight: 55, paddingVertical: 0 },
  fieldError: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 16 },
  returnLink: { alignItems: 'center', marginTop: 21 },
});
