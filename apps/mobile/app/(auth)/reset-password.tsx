import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import {
  AuthBrandBar,
  AuthFormCard,
  AuthLayout,
  AuthLogo,
  AuthNote,
  AuthTitle,
  FormField,
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/validation';
import { authMailToken } from '@/features/auth/email-delivery';
import { useCopy } from '@/features/settings/language-store';

export default function ResetPasswordScreen() {
  const copy = useCopy();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [tokenValue, setTokenValue] = useState(authMailToken(token));
  const confirmationInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  useEffect(() => {
    const incoming = authMailToken(token);
    if (!incoming) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setTokenValue(incoming);
    });
    return () => {
      active = false;
    };
  }, [token]);
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/forgot-password');
  };
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirmation: '', signOutEverywhere: true },
  });

  useEffect(() => {
    if (!errors.root?.message) return;
    const timeout = setTimeout(() => clearErrors('root'), 4_000);
    return () => clearTimeout(timeout);
  }, [clearErrors, errors.root?.message]);
  const submit = handleSubmit(async (values) => {
    const normalizedToken = authMailToken(tokenValue);
    if (normalizedToken.length < 40) {
      setError('root', {
        message: copy(
          'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
          'The reset link is invalid or has expired.',
        ),
      });
      return;
    }
    try {
      await apiRequest(
        '/v1/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({ token: normalizedToken, password: values.password }),
        },
        { authenticated: false },
      );
      router.replace('/(auth)/login');
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : copy('Şifre güncellenemedi.', 'Could not update the password.'),
      });
    }
  });
  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />
      <AuthLogo compact />
      <AuthTitle
        eyebrow={copy('HESAP GÜVENLİĞİ', 'ACCOUNT SECURITY')}
        title={copy('Yeni şifre belirle.', 'Create a new password.')}
        subtitle={copy(
          'Güçlü ve daha önce kullanmadığın bir şifre seç.',
          'Choose a strong password you have not used before.',
        )}
      />
      <AuthFormCard>
        <FormField
          label={copy('Sıfırlama kodu', 'Reset code')}
          accessibilityLabel={copy('E-postadaki sıfırlama kodu', 'Reset code from your email')}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={512}
          placeholder={copy(
            'E-postadaki kodun tamamını yapıştır',
            'Paste the full code from your email',
          )}
          value={tokenValue}
          onChangeText={setTokenValue}
          icon={<Ionicons color={authColors.muted} name="key-outline" size={17} />}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>{copy('Yeni şifre', 'New password')}</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.muted} name="lock-closed-outline" size={17} />
                <TextInput
                  accessibilityLabel="Yeni şifre"
                  autoComplete="new-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => confirmationInputRef.current?.focus()}
                  placeholder={copy('En az 10 karakter', 'At least 10 characters')}
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="next"
                  secureTextEntry={!showPassword}
                  selectionColor={authColors.yellow}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={value ?? ''}
                />
                <Pressable
                  accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    color={authColors.secondary}
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                  />
                </Pressable>
              </View>
              {errors.password?.message ? (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              ) : null}
            </View>
          )}
        />
        <Controller
          control={control}
          name="passwordConfirmation"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>{copy('Şifre tekrar', 'Confirm password')}</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.muted} name="shield-checkmark-outline" size={17} />
                <TextInput
                  ref={confirmationInputRef}
                  accessibilityLabel="Şifre tekrar"
                  autoComplete="new-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={copy('Şifreni tekrar gir', 'Enter your password again')}
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="done"
                  secureTextEntry={!showConfirmation}
                  selectionColor={authColors.yellow}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={value ?? ''}
                />
                <Pressable
                  accessibilityLabel={showConfirmation ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setShowConfirmation((current) => !current)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    color={authColors.secondary}
                    name={showConfirmation ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                  />
                </Pressable>
              </View>
              {errors.passwordConfirmation?.message ? (
                <Text style={styles.fieldError}>{errors.passwordConfirmation.message}</Text>
              ) : null}
            </View>
          )}
        />
        <AuthNote icon="lock-closed-outline" tone="warning">
          {copy(
            'Güvenlik için şifren değiştiğinde tüm açık oturumların kapatılır.',
            'For security, changing your password signs out all active sessions.',
          )}
        </AuthNote>
        {errors.root?.message ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {errors.root.message}
          </Text>
        ) : null}
        <GradientAuthButton icon="checkmark" loading={isSubmitting} onPress={() => void submit()}>
          {copy('Şifreyi güncelle', 'Update password')}
        </GradientAuthButton>
      </AuthFormCard>
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
  eyeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  fieldError: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 16 },
});
