import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/features/auth/auth-store';
import { AppleSignInButton } from '@/features/auth/apple-sign-in';
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
  authColors,
} from '@/features/auth/auth-ui';
import { loginSchema, type LoginValues } from '@/features/auth/validation';
import { useCopy } from '@/features/settings/language-store';

export default function LoginScreen() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const verified = params.verified === '1';
  const verifiedEmail = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const signIn = useAuthStore((store) => store.signIn);
  const signInWithGoogle = useAuthStore((store) => store.signInWithGoogle);
  const signInWithApple = useAuthStore((store) => store.signInWithApple);
  const passwordInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: verifiedEmail, password: '' },
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
          error instanceof Error
            ? error.message
            : copy(
                'Giriş yapılamadı. Lütfen tekrar deneyin.',
                'Could not sign in. Please try again.',
              ),
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
          provider: 'Google',
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

  const completeAppleSignIn = useCallback(
    async (input: { idToken: string; firstName?: string; lastName?: string }) => {
      setSocialError(null);
      const result = await signInWithApple(input);
      if (result.kind === 'profile_completion_required') {
        setPendingSocialRegistration({
          pendingToken: result.pendingToken,
          profile: result.profile,
          provider: 'Apple',
        });
        router.push('/(auth)/social-complete');
        return;
      }
      continueToStudio();
    },
    [continueToStudio, signInWithApple],
  );

  return (
    <AuthLayout>
      <AuthBrandBar
        actionLabel={copy('Kayıt ol', 'Sign up')}
        onAction={() => router.push('/(auth)/register')}
      />
      <AuthHero variant="login" />
      <AuthTitle
        eyebrow={copy('STÜDYONA DÖN', 'BACK TO YOUR STUDIO')}
        title={copy('Tekrar hoş geldin.', 'Welcome back.')}
        subtitle={copy('Hayalindeki kareler seni bekliyor.', 'Your next creation is waiting.')}
      />
      <AuthFormCard>
        {verified ? (
          <View accessibilityLiveRegion="polite" style={styles.verifiedBanner}>
            <View style={styles.verifiedIcon}>
              <Ionicons color="#0A1C11" name="checkmark" size={17} />
            </View>
            <View style={styles.verifiedCopy}>
              <Text style={styles.verifiedTitle}>
                {copy('E-posta doğrulandı', 'Email verified')}
              </Text>
              <Text style={styles.verifiedText}>
                {copy(
                  'Hesabın hazır. Şimdi güvenle giriş yapabilirsin.',
                  'Your account is ready. You can sign in now.',
                )}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.socials}>
          <GoogleSignInButton
            label={copy('Google ile giriş yap', 'Sign in with Google')}
            disabled={isSubmitting}
            onError={showGoogleError}
            onSuccess={completeGoogleSignIn}
          />
          <AppleSignInButton
            disabled={isSubmitting}
            onError={showGoogleError}
            onSuccess={completeAppleSignIn}
          />
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
              <Text style={styles.label}>{copy('E-posta', 'Email')}</Text>
              <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                <Ionicons color={authColors.yellow} name="mail-outline" size={18} />
                <TextInput
                  accessibilityLabel={copy('E-posta', 'Email')}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  keyboardType="email-address"
                  onBlur={() => {
                    setEmailFocused(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  onFocus={() => setEmailFocused(true)}
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
              <Text style={styles.label}>{copy('Şifre', 'Password')}</Text>
              <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                <Ionicons color={authColors.yellow} name="lock-closed-outline" size={17} />
                <TextInput
                  ref={passwordInputRef}
                  accessibilityLabel={copy('Şifre', 'Password')}
                  autoComplete="current-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={() => {
                    setPasswordFocused(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  onFocus={() => setPasswordFocused(true)}
                  placeholder={copy('Şifreni gir', 'Enter your password')}
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
                  accessibilityLabel={
                    showPassword
                      ? copy('Şifreyi gizle', 'Hide password')
                      : copy('Şifreyi göster', 'Show password')
                  }
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
            {copy('Şifremi unuttum', 'Forgot password')}
          </AuthLink>
        </View>
        {errors.root?.message ? (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {errors.root.message}
          </Text>
        ) : null}
        <GradientAuthButton
          accessibilityLabel={copy('Giriş yap', 'Sign in')}
          icon="arrow-forward"
          loading={isSubmitting}
          onPress={() => void submit()}
        >
          {copy('Giriş yap', 'Sign in')}
        </GradientAuthButton>
        <AuthNote>
          {copy(
            'Bilgilerin şifreli olarak korunur. Yalnızca senin onayınla fotoğrafın işlenir.',
            'Your information is encrypted. Your photo is processed only with your consent.',
          )}
        </AuthNote>
      </AuthFormCard>
      <View style={styles.bottomText}>
        <Text style={styles.bottomCopy}>{copy('Henüz hesabın yok mu? ', 'New here? ')}</Text>
        <AuthLink onPress={() => router.push('/(auth)/register')}>
          {copy('Kayıt ol', 'Sign up')}
        </AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  verifiedBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(52,199,89,0.09)',
    borderColor: 'rgba(72,220,112,0.28)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 4,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  verifiedIcon: {
    alignItems: 'center',
    backgroundColor: '#57E58C',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    shadowColor: '#57E58C',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    width: 32,
  },
  verifiedCopy: { flex: 1 },
  verifiedTitle: { color: '#8FF0B0', fontSize: 13, fontWeight: '900' },
  verifiedText: { color: '#B8C8BE', fontSize: 11, lineHeight: 16, marginTop: 2 },
  socials: { marginTop: 0 },
  field: { marginTop: 16 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
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
  inputRowFocused: {
    borderColor: 'rgba(255,196,0,0.72)',
    shadowColor: '#FFC400',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
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
