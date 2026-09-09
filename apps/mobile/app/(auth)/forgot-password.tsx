import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import {
  AuthBrandBar,
  AuthFormCard,
  AuthHero,
  AuthLayout,
  AuthLink,
  AuthNote,
  AuthTitle,
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/validation';
import { EMAIL_REQUEST_NOTICE } from '@/features/auth/email-delivery';

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    clearErrors,
    setError,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!errors.root?.message) return;
    const timeout = setTimeout(() => clearErrors('root'), 4_000);
    return () => clearTimeout(timeout);
  }, [clearErrors, errors.root?.message]);
  const submit = handleSubmit(async (values) => {
    try {
      const result = await apiRequest<{
        accepted: true;
        developmentResetToken?: string;
      }>(
        '/v1/auth/forgot-password',
        { method: 'POST', body: JSON.stringify(values) },
        { authenticated: false },
      );
      // Only explicitly enabled local development may return a test token.
      // SMTP delivery itself is never inferred from the anonymous response.
      if (result.developmentResetToken) {
        router.push({
          pathname: '/(auth)/reset-password',
          params: { token: result.developmentResetToken },
        });
      }
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'İstek gönderilemedi.',
      });
    }
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/login');
  };

  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />
      <AuthHero variant="forgot" />
      <AuthTitle
        eyebrow="HESAP GÜVENLİĞİ"
        title="Şifreni yenile."
        subtitle="E-posta adresini gir; hesabın varsa güvenli bir sıfırlama bağlantısı göndereceğiz."
      />
      <AuthFormCard>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>E-posta</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="mail-outline" size={18} />
                <TextInput
                  accessibilityLabel="E-posta"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="ornek@eposta.com"
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="send"
                  selectionColor={authColors.yellow}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={value ?? ''}
                />
              </View>
              {errors.email?.message ? (
                <Text style={styles.fieldError}>{errors.email.message}</Text>
              ) : null}
            </View>
          )}
        />
        {isSubmitSuccessful ? (
          <AuthNote icon="checkmark-circle-outline" tone="success">
            {EMAIL_REQUEST_NOTICE}
          </AuthNote>
        ) : null}
        {errors.root?.message ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {errors.root.message}
          </Text>
        ) : null}
        <GradientAuthButton
          icon="send-outline"
          loading={isSubmitting}
          onPress={() => void submit()}
        >
          Bağlantı gönder
        </GradientAuthButton>
      </AuthFormCard>
      <View style={styles.returnLink}>
        <AuthLink onPress={goBack}>Giriş ekranına dön</AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
  inputRow: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 56,
    paddingLeft: 15,
  },
  input: { color: authColors.text, flex: 1, fontSize: 16, minHeight: 55, paddingVertical: 0 },
  fieldError: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 16 },
  returnLink: { alignItems: 'center', marginTop: 21 },
});
