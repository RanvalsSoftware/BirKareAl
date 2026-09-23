import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { GoogleSignInButton } from '@/features/auth/google-sign-in';
import { setPendingSocialRegistration } from '@/features/auth/social-registration';
import { recoveryUntilFromError, stageDeletionRecoveryHandoff } from '@/features/auth/deletion-recovery-handoff';
import { consumePendingOnboardingCreateDraft } from '@/features/create/createFlow';
import {
  AuthBrandBar, AuthFormCard, AuthHero, AuthLayout, AuthLink, AuthTitle,
  CheckRow, Divider, GradientAuthButton, authColors,
} from '@/features/auth/auth-ui';
import { registerSchema, type RegisterValues } from '@/features/auth/validation';
import { verificationRecoveryParams } from '@/features/auth/email-delivery';
import { useCopy } from '@/features/settings/language-store';

export default function RegisterScreen() {
  const copy = useCopy();
  const signInWithGoogle = useAuthStore((store) => store.signInWithGoogle);
  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const birthYearInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmationInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const screenRevision = useRef(0);
  const registering = useRef(false);
  useFocusEffect(useCallback(() => {
    screenRevision.current += 1;
    return () => { screenRevision.current += 1; };
  }, []));
  const goBack = () => {
    if (router.canGoBack()) { router.back(); return; }
    router.replace('/(auth)/login');
  };
  const { control, handleSubmit, formState: { errors, isSubmitting }, clearErrors, setError } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', password: '', passwordConfirmation: '', birthYear: undefined,
      acceptedTerms: false, acceptedPrivacy: false, acceptedAiDisclosure: false, acceptedAge: false, acceptedImageRights: false,
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

  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    setSocialError(null);
    try {
      const result = await signInWithGoogle(idToken);
      if (result.kind === 'deletion_recovery_required') {
        // A recovery choice is NOT a login. Keep the account anonymous and
        // open the same blurred dialog over LOGIN, including from registration.
        stageDeletionRecoveryHandoff({ kind: 'google', idToken, recoveryUntil: result.recoveryUntil });
        router.replace('/(auth)/login');
        return;
      }
      if (result.kind === 'profile_completion_required') {
        setPendingSocialRegistration({ pendingToken: result.pendingToken, profile: result.profile, provider: 'Google' });
        router.push('/(auth)/social-complete');
        return;
      }
      const onboardingDraft = consumePendingOnboardingCreateDraft();
      if (onboardingDraft?.sourceUri) {
        router.replace({ pathname: '/create/review', params: { autoStart: 'onboarding' } });
        return;
      }
      router.replace(onboardingDraft ? '/create/upload' : '/(tabs)/home');
    } catch (error) {
      const recoveryUntil = recoveryUntilFromError(error);
      if (recoveryUntil) {
        stageDeletionRecoveryHandoff({ kind: 'google', idToken, recoveryUntil });
        router.replace('/(auth)/login');
        return;
      }
      throw error;
    }
  }, [signInWithGoogle]);
  const showGoogleError = useCallback((error: Error) => { setSocialError(error.message); }, []);
  const submit = handleSubmit(async (values) => {
    if (registering.current) return;
    registering.current = true;
    const revision = screenRevision.current;
    try {
      const result = await apiRequest<{ verificationRequired: true; developmentVerificationToken?: string }>(
        '/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            firstName: values.firstName, lastName: values.lastName,
            email: values.email.trim().toLowerCase(), password: values.password,
            dateOfBirth: `${values.birthYear}-01-01`, locale: 'tr-TR',
            consent: {
              termsAccepted: values.acceptedTerms, privacyAccepted: values.acceptedPrivacy,
              aiDisclosureAccepted: values.acceptedAiDisclosure, ageConfirmed: values.acceptedAge,
              ownImageOrPermissionConfirmed: values.acceptedImageRights,
            },
          }),
        }, { authenticated: false },
      );
      if (revision !== screenRevision.current) return;
      // Do not hold the registration form behind a success flag/delay. The
      // destination shows a one-time notice; verification is still required.
      router.replace({ pathname: '/(auth)/verify-email', params: {
        registered: '1',
        email: values.email.trim().toLowerCase(),
        ...(result.developmentVerificationToken ? { code: result.developmentVerificationToken } : {}),
      } });
    } catch (error) {
      if (revision !== screenRevision.current) return;
      const recovery = verificationRecoveryParams(error, values.email);
      if (recovery) {
        router.replace({ pathname: '/(auth)/verify-email', params: recovery });
        return;
      }
      setError('root', { message: error instanceof Error ? error.message : 'Kayıt oluşturulamadı.' });
    } finally {
      registering.current = false;
    }
  });

  return (
    <AuthLayout>
      <AuthBrandBar actionLabel={copy('Giriş yap', 'Sign in')} onAction={() => router.replace('/(auth)/login')} onBack={goBack} />
      <AuthHero variant="register" />
      <AuthTitle eyebrow={copy('YENİ STÜDYO', 'NEW STUDIO')} title={copy('Hesabını oluştur.', 'Create your account.')}
        subtitle={copy('Hayalindeki kareleri saklayacağın kişisel stüdyona hoş geldin.', 'Welcome to your personal studio for every image you imagine.')} />
      <AuthFormCard>
        <GoogleSignInButton label={copy('Google ile devam et', 'Continue with Google')} disabled={isSubmitting} onError={showGoogleError} onSuccess={completeGoogleSignIn} />
        {socialError ? <Text accessibilityLiveRegion="polite" style={styles.serverError}>{socialError}</Text> : null}
        <Divider>{copy('veya e-posta ile kayıt ol', 'or sign up with email')}</Divider>
        <View style={styles.names}>
          <Controller control={control} name="firstName" render={({ field: { onBlur, onChange, value } }) => (
            <View style={[styles.field, styles.nameField]}>
              <Text style={styles.label}>{copy('Ad', 'First name')}</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="person-outline" size={16} />
                <TextInput accessibilityLabel="Ad" autoComplete="given-name" blurOnSubmit={false} cursorColor={authColors.yellow}
                  onBlur={onBlur} onChangeText={onChange} onSubmitEditing={() => lastNameInputRef.current?.focus()}
                  placeholder={copy('Adın', 'Your first name')} placeholderTextColor={authColors.muted} rejectResponderTermination={false}
                  returnKeyType="next" selectionColor={authColors.yellow} style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
              </View>
              {errors.firstName?.message ? <Text style={styles.fieldError}>{errors.firstName.message}</Text> : null}
            </View>
          )} />
          <Controller control={control} name="lastName" render={({ field: { onBlur, onChange, value } }) => (
            <View style={[styles.field, styles.nameField]}>
              <Text style={styles.label}>{copy('Soyad', 'Last name')}</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="person-outline" size={16} />
                <TextInput ref={lastNameInputRef} accessibilityLabel="Soyad" autoComplete="family-name" blurOnSubmit={false} cursorColor={authColors.yellow}
                  onBlur={onBlur} onChangeText={onChange} onSubmitEditing={() => emailInputRef.current?.focus()}
                  placeholder={copy('Soyadın', 'Your last name')} placeholderTextColor={authColors.muted} rejectResponderTermination={false}
                  returnKeyType="next" selectionColor={authColors.yellow} style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
              </View>
              {errors.lastName?.message ? <Text style={styles.fieldError}>{errors.lastName.message}</Text> : null}
            </View>
          )} />
        </View>
        <Controller control={control} name="email" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('E-posta', 'Email')}</Text>
            <View style={styles.inputRow}>
              <Ionicons color={authColors.yellow} name="mail-outline" size={18} />
              <TextInput ref={emailInputRef} accessibilityLabel="E-posta" autoCapitalize="none" autoComplete="email" autoCorrect={false}
                blurOnSubmit={false} cursorColor={authColors.yellow} keyboardType="email-address" onBlur={onBlur} onChangeText={onChange}
                onSubmitEditing={() => birthYearInputRef.current?.focus()} placeholder="ornek@gmail.com" placeholderTextColor={authColors.muted}
                rejectResponderTermination={false} returnKeyType="next" selectionColor={authColors.yellow} style={styles.input}
                underlineColorAndroid="transparent" value={value ?? ''} />
            </View>
            <Text style={styles.emailHint}>{copy(
              'Gmail, Outlook/Hotmail, Yandex, iCloud, Yahoo, Proton ve desteklenen diğer kalıcı sağlayıcılar. Yeni kayıtlarda kurumsal adresler desteklenmiyor.',
              'Gmail, Outlook/Hotmail, Yandex, iCloud, Yahoo, Proton and other supported providers. Custom domains are not supported for new accounts.',
            )}</Text>
            {errors.email?.message ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
          </View>
        )} />
        <Controller control={control} name="birthYear" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('Doğum yılı', 'Birth year')}</Text>
            <View style={styles.inputRow}>
              <Ionicons color={authColors.yellow} name="calendar-outline" size={17} />
              <TextInput ref={birthYearInputRef} accessibilityLabel="Doğum yılı" blurOnSubmit={false} cursorColor={authColors.yellow}
                keyboardType="number-pad" maxLength={4} onBlur={onBlur} onChangeText={(text) => onChange(text ? Number(text) : undefined)}
                onSubmitEditing={() => passwordInputRef.current?.focus()} placeholder="1998" placeholderTextColor={authColors.muted}
                rejectResponderTermination={false} returnKeyType="next" selectionColor={authColors.yellow} style={styles.input}
                underlineColorAndroid="transparent" value={value ? String(value) : ''} />
            </View>
            {errors.birthYear?.message ? <Text style={styles.fieldError}>{errors.birthYear.message}</Text> : null}
          </View>
        )} />
        <Controller control={control} name="password" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('Şifre', 'Password')}</Text>
            <View style={styles.inputRow}>
              <Ionicons color={authColors.yellow} name="lock-closed-outline" size={17} />
              <TextInput ref={passwordInputRef} accessibilityLabel="Şifre" autoComplete="new-password" blurOnSubmit={false} cursorColor={authColors.yellow}
                onBlur={onBlur} onChangeText={onChange} onSubmitEditing={() => confirmationInputRef.current?.focus()}
                placeholder={copy('En az 10 karakter', 'At least 10 characters')} placeholderTextColor={authColors.muted}
                rejectResponderTermination={false} returnKeyType="next" secureTextEntry={!showPassword} selectionColor={authColors.yellow}
                style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
              <Pressable accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} accessibilityRole="button" hitSlop={10}
                onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
                <Ionicons color={authColors.secondary} name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} />
              </Pressable>
            </View>
            {errors.password?.message ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}
          </View>
        )} />
        <Controller control={control} name="passwordConfirmation" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('Şifre tekrar', 'Confirm password')}</Text>
            <View style={styles.inputRow}>
              <Ionicons color={authColors.yellow} name="shield-checkmark-outline" size={17} />
              <TextInput ref={confirmationInputRef} accessibilityLabel="Şifre tekrar" autoComplete="new-password" blurOnSubmit={false}
                cursorColor={authColors.yellow} onBlur={onBlur} onChangeText={onChange} placeholder={copy('Şifreni tekrar gir', 'Enter your password again')}
                placeholderTextColor={authColors.muted} rejectResponderTermination={false} returnKeyType="done" secureTextEntry={!showConfirmation}
                selectionColor={authColors.yellow} style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
              <Pressable accessibilityLabel={showConfirmation ? 'Şifreyi gizle' : 'Şifreyi göster'} accessibilityRole="button" hitSlop={10}
                onPress={() => setShowConfirmation((current) => !current)} style={styles.eyeButton}>
                <Ionicons color={authColors.secondary} name={showConfirmation ? 'eye-off-outline' : 'eye-outline'} size={19} />
              </Pressable>
            </View>
            {errors.passwordConfirmation?.message ? <Text style={styles.fieldError}>{errors.passwordConfirmation.message}</Text> : null}
          </View>
        )} />
        <View style={styles.consentHeader}>
          <Ionicons color={authColors.yellow} name="sparkles-outline" size={15} />
          <Text style={styles.consentHeaderText}>{copy('Güvenli kullanım onayları', 'Safe-use consents')}</Text>
        </View>
        <Controller control={control} name="acceptedTerms" render={({ field: { onChange, value } }) => (
          <CheckRow checked={value} documentLink={{ label: copy('Kullanım Koşulları', 'Terms of Use'), onPress: () => router.push({ pathname: '/legal/[document]', params: { document: 'terms' } }) }}
            error={errors.acceptedTerms?.message} onPress={() => onChange(!value)}>{copy('’nı okudum ve kabul ediyorum.', ' — I have read and accept them.')}</CheckRow>
        )} />
        <Controller control={control} name="acceptedPrivacy" render={({ field: { onChange, value } }) => (
          <CheckRow checked={value} documentLink={{ label: copy('Gizlilik Politikası', 'Privacy Policy'), onPress: () => router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } }) }}
            error={errors.acceptedPrivacy?.message} onPress={() => onChange(!value)}>{copy('’nı okudum ve kabul ediyorum.', ' — I have read and accept it.')}</CheckRow>
        )} />
        <Controller control={control} name="acceptedAiDisclosure" render={({ field: { onChange, value } }) => (
          <CheckRow checked={value} error={errors.acceptedAiDisclosure?.message} onPress={() => onChange(!value)}>
            {copy('Sonuçların AI ile oluşturulabileceğini ve etiketleneceğini kabul ediyorum.', 'I understand that results may be AI-generated and labeled.')}
          </CheckRow>
        )} />
        <Controller control={control} name="acceptedAge" render={({ field: { onChange, value } }) => (
          <CheckRow checked={value} error={errors.acceptedAge?.message} onPress={() => onChange(!value)}>{copy('18 yaşını doldurduğumu onaylıyorum.', 'I confirm that I am at least 18.')}</CheckRow>
        )} />
        <Controller control={control} name="acceptedImageRights" render={({ field: { onChange, value } }) => (
          <CheckRow checked={value} error={errors.acceptedImageRights?.message} onPress={() => onChange(!value)}>
            {copy('Yüklediğim fotoğraf için gerekli kullanım hakkına sahibim.', 'I have the necessary rights to use the photo I upload.')}
          </CheckRow>
        )} />
        {errors.root?.message ? <Text accessibilityLiveRegion="polite" style={styles.serverError}>{errors.root.message}</Text> : null}
        <GradientAuthButton accessibilityLabel={copy('Kayıt ol', 'Sign up')} icon="arrow-forward" loading={isSubmitting} onPress={() => void submit()}>
          {copy('Kayıt ol', 'Sign up')}
        </GradientAuthButton>
      </AuthFormCard>
      <View style={styles.bottomText}>
        <Text style={styles.bottomCopy}>{copy('Zaten hesabın var mı? ', 'Already have an account? ')}</Text>
        <AuthLink onPress={() => router.replace('/(auth)/login')}>{copy('Giriş yap', 'Sign in')}</AuthLink>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: 'row', gap: 12 }, nameField: { flex: 1 }, field: { marginTop: 16 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
  inputRow: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 13, minHeight: 56, paddingLeft: 15 },
  input: { color: authColors.text, flex: 1, fontSize: 16, minHeight: 55, paddingVertical: 0 },
  eyeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  fieldError: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  emailHint: { color: authColors.secondary, fontSize: 11, lineHeight: 16, marginTop: 8 },
  consentHeader: { alignItems: 'center', borderTopColor: 'rgba(255,255,255,.08)', borderTopWidth: 1, flexDirection: 'row', gap: 7, marginTop: 24, paddingTop: 17 },
  consentHeaderText: { color: '#F0D173', fontSize: 12, fontWeight: '800' },
  serverError: { color: '#FF877D', fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  bottomText: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  bottomCopy: { color: authColors.secondary, fontSize: 14 },
});
