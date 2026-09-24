import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
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
  AuthTitle,
  CheckRow,
  Divider,
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';
import { registerSchema, type RegisterValues } from '@/features/auth/validation';
import { verificationRecoveryParams } from '@/features/auth/email-delivery';

export default function RegisterScreen() {
  const signInWithGoogle = useAuthStore((store) => store.signInWithGoogle);
  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const birthYearInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmationInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/login');
  };
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      birthYear: undefined,
      acceptedTerms: false,
      acceptedPrivacy: false,
      acceptedAiDisclosure: false,
      acceptedAge: false,
      acceptedImageRights: false,
    },
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
      const onboardingDraft = consumePendingOnboardingCreateDraft();
      if (onboardingDraft?.sourceUri) {
        router.replace({ pathname: '/create/review', params: { autoStart: 'onboarding' } });
        return;
      }
      router.replace(onboardingDraft ? '/create/upload' : '/(tabs)/home');
    },
    [signInWithGoogle],
  );

  const showGoogleError = useCallback((error: Error) => {
    setSocialError(error.message);
  }, []);

  const submit = handleSubmit(async (values) => {
    try {
      const result = await apiRequest<{
        verificationRequired: true;
        developmentVerificationToken?: string;
      }>(
        '/v1/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email.trim().toLowerCase(),
            password: values.password,
            dateOfBirth: `${values.birthYear}-01-01`,
            locale: 'tr-TR',
            consent: {
              termsAccepted: values.acceptedTerms,
              privacyAccepted: values.acceptedPrivacy,
              aiDisclosureAccepted: values.acceptedAiDisclosure,
              ageConfirmed: values.acceptedAge,
              ownImageOrPermissionConfirmed: values.acceptedImageRights,
            },
          }),
        },
        { authenticated: false },
      );
      setRegistrationSuccess(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 1_400));
      router.push({
        pathname: '/(auth)/verify-email',
        params: {
          email: values.email.trim().toLowerCase(),
          ...(result.developmentVerificationToken
            ? { token: result.developmentVerificationToken }
            : {}),
        },
      });
    } catch (error) {
      const recovery = verificationRecoveryParams(error, values.email);
      if (recovery) {
        // The account already exists: recover delivery, do not ask for a second registration.
        router.push({ pathname: '/(auth)/verify-email', params: recovery });
        return;
      }
      setError('root', {
        message: error instanceof Error ? error.message : 'Kayıt oluşturulamadı.',
      });
    }
  });

  return (
    <AuthLayout>
      <AuthBrandBar
        actionLabel="Giriş yap"
        onAction={() => router.replace('/(auth)/login')}
        onBack={goBack}
      />
      <AuthHero variant="register" />
      <AuthTitle
        eyebrow="YENİ STÜDYO"
        title="Hesabını oluştur."
        subtitle="Hayalindeki kareleri saklayacağın kişisel stüdyona hoş geldin."
      />
      <AuthFormCard>
        <GoogleSignInButton
          disabled={isSubmitting}
          onError={showGoogleError}
          onSuccess={completeGoogleSignIn}
        />
        {socialError ? (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {socialError}
          </Text>
        ) : null}
        <Divider>veya e-posta ile kayıt ol</Divider>
        <View style={styles.names}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onBlur, onChange, value } }) => (
              <View style={[styles.field, styles.nameField]}>
                <Text style={styles.label}>Ad</Text>
                <View style={styles.inputRow}>
                  <Ionicons pointerEvents="none" color={authColors.yellow} name="person-outline" size={16} />
                  <TextInput
                    pointerEvents="auto"
                    accessibilityLabel="Ad"
                    autoComplete="given-name"
                    blurOnSubmit={false}
                    cursorColor={authColors.yellow}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    onSubmitEditing={() => lastNameInputRef.current?.focus()}
                    placeholder="Adın"
                    placeholderTextColor={authColors.muted}
                    rejectResponderTermination={false}
                    returnKeyType="next"
                    selectionColor={authColors.yellow}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    value={value ?? ''}
                  />
                </View>
                {errors.firstName?.message ? (
                  <Text style={styles.fieldError}>{errors.firstName.message}</Text>
                ) : null}
              </View>
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onBlur, onChange, value } }) => (
              <View style={[styles.field, styles.nameField]}>
                <Text style={styles.label}>Soyad</Text>
                <View style={styles.inputRow}>
                  <Ionicons pointerEvents="none" color={authColors.yellow} name="person-outline" size={16} />
                  <TextInput
                    pointerEvents="auto"
                    ref={lastNameInputRef}
                    accessibilityLabel="Soyad"
                    autoComplete="family-name"
                    blurOnSubmit={false}
                    cursorColor={authColors.yellow}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    placeholder="Soyadın"
                    placeholderTextColor={authColors.muted}
                    rejectResponderTermination={false}
                    returnKeyType="next"
                    selectionColor={authColors.yellow}
                    style={styles.input}
                    underlineColorAndroid="transparent"
                    value={value ?? ''}
                  />
                </View>
                {errors.lastName?.message ? (
                  <Text style={styles.fieldError}>{errors.lastName.message}</Text>
                ) : null}
              </View>
            )}
          />
        </View>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>E-posta</Text>
              <View style={styles.inputRow}>
                <Ionicons pointerEvents="none" color={authColors.yellow} name="mail-outline" size={18} />
                <TextInput
                    pointerEvents="auto"
                  ref={emailInputRef}
                  accessibilityLabel="E-posta"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => birthYearInputRef.current?.focus()}
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
          name="birthYear"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Doğum yılı</Text>
              <View style={styles.inputRow}>
                <Ionicons pointerEvents="none" color={authColors.yellow} name="calendar-outline" size={17} />
                <TextInput
                    pointerEvents="auto"
                  ref={birthYearInputRef}
                  accessibilityLabel="Doğum yılı"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  keyboardType="number-pad"
                  maxLength={4}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text ? Number(text) : undefined)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder="1998"
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="next"
                  selectionColor={authColors.yellow}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={value ? String(value) : ''}
                />
              </View>
              {errors.birthYear?.message ? (
                <Text style={styles.fieldError}>{errors.birthYear.message}</Text>
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
                <Ionicons pointerEvents="none" color={authColors.yellow} name="lock-closed-outline" size={17} />
                <TextInput
                    pointerEvents="auto"
                  ref={passwordInputRef}
                  accessibilityLabel="Şifre"
                  autoComplete="new-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => confirmationInputRef.current?.focus()}
                  placeholder="En az 10 karakter"
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
              <Text style={styles.label}>Şifre tekrar</Text>
              <View style={styles.inputRow}>
                <Ionicons pointerEvents="none" color={authColors.yellow} name="shield-checkmark-outline" size={17} />
                <TextInput
                    pointerEvents="auto"
                  ref={confirmationInputRef}
                  accessibilityLabel="Şifre tekrar"
                  autoComplete="new-password"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Şifreni tekrar gir"
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
        <View style={styles.consentHeader}>
          <Ionicons pointerEvents="none" color={authColors.yellow} name="sparkles-outline" size={15} />
          <Text style={styles.consentHeaderText}>Güvenli kullanım onayları</Text>
        </View>
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <CheckRow
              checked={value}
              documentLink={{
                label: 'Kullanım Koşulları',
                onPress: () =>
                  router.push({ pathname: '/legal/[document]', params: { document: 'terms' } }),
              }}
              error={errors.acceptedTerms?.message}
              onPress={() => onChange(!value)}
            >
              ’nı okudum ve kabul ediyorum.
            </CheckRow>
          )}
        />
        <Controller
          control={control}
          name="acceptedPrivacy"
          render={({ field: { onChange, value } }) => (
            <CheckRow
              checked={value}
              documentLink={{
                label: 'Gizlilik Politikası',
                onPress: () =>
                  router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } }),
              }}
              error={errors.acceptedPrivacy?.message}
              onPress={() => onChange(!value)}
            >
              ’nı okudum ve kabul ediyorum.
            </CheckRow>
          )}
        />
        <Controller
          control={control}
          name="acceptedAiDisclosure"
          render={({ field: { onChange, value } }) => (
            <CheckRow
              checked={value}
              error={errors.acceptedAiDisclosure?.message}
              onPress={() => onChange(!value)}
            >
              Sonuçların AI ile oluşturulabileceğini ve etiketleneceğini kabul ediyorum.
            </CheckRow>
          )}
        />
        <Controller
          control={control}
          name="acceptedAge"
          render={({ field: { onChange, value } }) => (
            <CheckRow
              checked={value}
              error={errors.acceptedAge?.message}
              onPress={() => onChange(!value)}
            >
              18 yaşını doldurduğumu onaylıyorum.
            </CheckRow>
          )}
        />
        <Controller
          control={control}
          name="acceptedImageRights"
          render={({ field: { onChange, value } }) => (
            <CheckRow
              checked={value}
              error={errors.acceptedImageRights?.message}
              onPress={() => onChange(!value)}
            >
              Yüklediğim fotoğraf için gerekli kullanım hakkına sahibim.
            </CheckRow>
          )}
        />
        {errors.root?.message ? (
          <Text accessibilityLiveRegion="polite" style={styles.serverError}>
            {errors.root.message}
          </Text>
        ) : null}
        {registrationSuccess ? (
          <View accessibilityLiveRegion="polite" style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons color="#08180D" name="checkmark" size={19} />
            </View>
            <Text style={styles.successText}>Başarıyla kayıt oldunuz.</Text>
          </View>
        ) : null}
        <GradientAuthButton
          accessibilityLabel="Kayıt ol"
          icon="arrow-forward"
          loading={isSubmitting}
          onPress={() => void submit()}
        >
          Kayıt ol
        </GradientAuthButton>
      </AuthFormCard>
      <View style={styles.bottomText}>
        <Text style={styles.bottomCopy}>Zaten hesabın var mı? </Text>
        <AuthLink onPress={() => router.replace('/(auth)/login')}>Giriş yap</AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 1 },
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
  consentHeader: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 24,
    paddingTop: 17,
  },
  consentHeaderText: { color: '#F0D173', fontSize: 12, fontWeight: '800' },
  serverError: {
    color: '#FF877D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(61, 215, 120, 0.12)',
    borderColor: 'rgba(91, 235, 145, 0.48)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: '#55E58C',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    shadowColor: '#55E58C',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 32,
  },
  successText: { color: '#7CF0A7', flex: 1, fontSize: 14, fontWeight: '800' },
  bottomText: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  bottomCopy: { color: authColors.secondary, fontSize: 14 },
});
