import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/features/auth/auth-store';
import { GoogleSignInButton } from '@/features/auth/google-sign-in';
import { setPendingSocialRegistration } from '@/features/auth/social-registration';
import { consumePendingOnboardingCreateDraft } from '@/features/create/createFlow';
import {
  AuthBrandBar,
  AuthFormCard,
  AuthHero,
  AuthLayout,
  AuthLink,
  AuthNote,
  AuthTitle,
  Divider,
  GradientAuthButton,
  SocialButton,
  authColors,
} from '@/features/auth/auth-ui';
import { loginSchema, type LoginValues } from '@/features/auth/validation';

export default function LoginScreen() {
  const signIn = useAuthStore((store) => store.signIn);
  const signInWithGoogle = useAuthStore((store) => store.signInWithGoogle);
  const passwordInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!socialError) return;
    const timeout = setTimeout(() => setSocialError(null), 4_000);
    return () => clearTimeout(timeout);
  }, [socialError]);

  useEffect(() => {
    if (!errors.root?.message) return;
    const timeout = setTimeout(() => clearErrors('root'), 4_000);
    return () => clearTimeout(timeout);
  }, [clearErrors, errors.root?.message]);

  const continueToStudio = useCallback(() => {
    const onboardingDraft = consumePendingOnboardingCreateDraft();
    if (onboardingDraft?.sourceUri) {
      router.replace({ pathname: '/create/review', params: { autoStart: 'onboarding' } });
      return;
    }
    router.replace(onboardingDraft ? '/create/upload' : '/(tabs)/home');
  }, []);

  const submit = handleSubmit(async (values) => {
    try {
      await signIn(values);
      continueToStudio();
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error ? error.message : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      });
    }
  });

  const completeGoogleSignIn = useCallback(
    async (idToken: string) => {
      setSocialError(null);
      const result = await signInWithGoogle(idToken);
      if (result.kind === 'profile_completion_required') {
        setPendingSocialRegistration({
          pendingToken: result.pendingToken,
          profile: result.profile,
        });
        router.push('/(auth)/social-complete');
        return;
      }
      continueToStudio();
    },
    [continueToStudio, signInWithGoogle],
  );

  const showGoogleError = useCallback((error: Error) => {
    setSocialError(error.message);
  }, []);

  const socialSignIn = (provider: 'apple') => {
    const label = provider === 'apple' ? 'Apple' : 'Google';
    Alert.alert(
      `${label} ile giriş`,
      `${label} kimliği ve sunucu tarafı ID-token doğrulaması bu dağıtım ortamı için henüz tanımlı değil. E-posta ile güvenle giriş yapabilir veya kayıt olabilirsin.`,
    );
  };

  return (
    <AuthLayout>
      <AuthBrandBar actionLabel="Kayıt ol" onAction={() => router.push('/(auth)/register')} />
      <AuthHero variant="login" />
      <AuthTitle
        eyebrow="STÜDYONA DÖN"
        title="Tekrar hoş geldin."
        subtitle="Hayalindeki kareler seni bekliyor."
      />
      <AuthFormCard>
        <View style={styles.socials}>
          <GoogleSignInButton
            disabled={isSubmitting}
            onError={showGoogleError}
            onSuccess={completeGoogleSignIn}
          />
          <SocialButton
            icon={<Ionicons name="logo-apple" color="#fff" size={21} />}
            onPress={() => socialSignIn('apple')}
          >
            Apple ile devam et
          </SocialButton>
        </View>
        {socialError ? (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {socialError}
          </Text>
        ) : null}
        <Divider />

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
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder="ornek@eposta.com"
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="next"
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
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Şifre</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="lock-closed-outline" size={17} />
                <TextInput
                  ref={passwordInputRef}
                  accessibilityLabel="Şifre"
                  autoComplete="current-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Şifreni gir"
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="go"
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

        <View style={styles.forgot}>
          <AuthLink onPress={() => router.push('/(auth)/forgot-password')}>
            Şifremi unuttum
          </AuthLink>
        </View>
        {errors.root?.message ? (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {errors.root.message}
          </Text>
        ) : null}
        <GradientAuthButton
          accessibilityLabel="Giriş yap"
          icon="arrow-forward"
          loading={isSubmitting}
          onPress={() => void submit()}
        >
          Giriş yap
        </GradientAuthButton>
        <AuthNote>
          Bilgilerin şifreli olarak korunur. Yalnızca senin onayınla fotoğrafın işlenir.
        </AuthNote>
      </AuthFormCard>
      <View style={styles.bottomText}>
        <Text style={styles.bottomCopy}>Henüz hesabın yok mu? </Text>
        <AuthLink onPress={() => router.push('/(auth)/register')}>Kayıt ol</AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  socials: { marginTop: -10 },
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
  forgot: { alignItems: 'flex-end', marginTop: 13 },
  serverError: {
    color: '#FF877D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  bottomText: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  bottomCopy: { color: authColors.secondary, fontSize: 14 },
});
