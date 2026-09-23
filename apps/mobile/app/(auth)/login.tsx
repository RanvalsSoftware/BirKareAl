import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/features/auth/auth-store';
import { AppleSignInButton } from '@/features/auth/apple-sign-in';
import { GoogleSignInButton } from '@/features/auth/google-sign-in';
import { consumeDeletionRecoveryHandoff, recoveryUntilFromError, type SocialDeletionRecoveryAttempt } from '@/features/auth/deletion-recovery-handoff';
import { setPendingSocialRegistration } from '@/features/auth/social-registration';
import { AuthSuccessNotice } from '@/features/auth/AuthSuccessNotice';
import { useRouteAuthNotice } from '@/features/auth/use-auth-notice';
import { consumePendingOnboardingCreateDraft } from '@/features/create/createFlow';
import {
  AuthBrandBar, AuthFormCard, AuthHero, AuthLayout, AuthLink, AuthNote, AuthTitle,
  Divider, GradientAuthButton, authColors,
} from '@/features/auth/auth-ui';
import { loginSchema, type LoginValues } from '@/features/auth/validation';
import { useCopy } from '@/features/settings/language-store';

type DeletionRecoveryAttempt =
  | { kind: 'password'; values: LoginValues; recoveryUntil: string }
  | SocialDeletionRecoveryAttempt;

export default function LoginScreen() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const { visible: verified, dismiss: dismissVerified } = useRouteAuthNotice('verified', params.verified);
  const verifiedEmail = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const signIn = useAuthStore((store) => store.signIn);
  const signInWithGoogle = useAuthStore((store) => store.signInWithGoogle);
  const signInWithApple = useAuthStore((store) => store.signInWithApple);
  const passwordInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [recovery, setRecovery] = useState<DeletionRecoveryAttempt | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting }, clearErrors, setError, setValue } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: verifiedEmail, password: '' },
  });

  useEffect(() => {
    if (verifiedEmail) setValue('email', verifiedEmail);
  }, [verifiedEmail, setValue]);
  // RegisterScreen must not route a deletion-pending identity into the studio.
  // Consume its one-use in-memory handoff here and keep LOGIN behind the blur.
  useFocusEffect(useCallback(() => {
    const pending = consumeDeletionRecoveryHandoff();
    if (pending) { setRecoveryError(null); setRecovery(pending); }
  }, []));
  useEffect(() => { if (recovery) { Keyboard.dismiss(); dismissVerified(); } }, [recovery, dismissVerified]);
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
  const stageDeletionRecovery = useCallback((
    error: unknown,
    attempt:
      | { kind: 'password'; values: LoginValues }
      | { kind: 'google'; idToken: string }
      | { kind: 'apple'; input: { idToken: string; firstName?: string; lastName?: string } },
  ) => {
    const recoveryUntil = recoveryUntilFromError(error);
    if (!recoveryUntil) return false;
    setRecoveryError(null);
    setRecovery({ ...attempt, recoveryUntil } as DeletionRecoveryAttempt);
    return true;
  }, []);

  const recoverAccount = useCallback(async () => {
    if (!recovery || recoveryBusy) return;
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      if (recovery.kind === 'password') {
        await signIn({ ...recovery.values, recoverDeletion: true });
      } else if (recovery.kind === 'google') {
        const result = await signInWithGoogle(recovery.idToken, { recoverDeletion: true });
        if (result.kind !== 'authenticated') throw new Error(copy('Hesap geri getirilemedi. Lütfen yeniden giriş yap.', 'Could not restore your account. Please sign in again.'));
      } else {
        const result = await signInWithApple({ ...recovery.input, recoverDeletion: true });
        if (result.kind !== 'authenticated') throw new Error(copy('Hesap geri getirilemedi. Lütfen yeniden giriş yap.', 'Could not restore your account. Please sign in again.'));
      }
      setRecovery(null);
      continueToStudio();
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : copy('Hesap geri getirilemedi. Lütfen tekrar deneyin.', 'The account could not be restored. Please try again.'));
    } finally {
      setRecoveryBusy(false);
    }
  }, [continueToStudio, copy, recovery, recoveryBusy, signIn, signInWithApple, signInWithGoogle]);

  const submit = handleSubmit(async (values) => {
    dismissVerified();
    try {
      await signIn(values);
      continueToStudio();
    } catch (error) {
      if (stageDeletionRecovery(error, { kind: 'password', values })) return;
      setError('root', { message: error instanceof Error ? error.message : copy('Giriş yapılamadı. Lütfen tekrar deneyin.', 'Could not sign in. Please try again.') });
    }
  });
  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    dismissVerified();
    setSocialError(null);
    try {
      const result = await signInWithGoogle(idToken);
      if (result.kind === 'profile_completion_required') {
        setPendingSocialRegistration({ pendingToken: result.pendingToken, profile: result.profile, provider: 'Google' });
        router.push('/(auth)/social-complete');
        return;
      }
      if (result.kind === 'deletion_recovery_required') {
        setRecoveryError(null);
        setRecovery({ kind: 'google', idToken, recoveryUntil: result.recoveryUntil });
        return;
      }
      continueToStudio();
    } catch (error) {
      if (stageDeletionRecovery(error, { kind: 'google', idToken })) return;
      throw error;
    }
  }, [continueToStudio, signInWithGoogle, stageDeletionRecovery, dismissVerified]);
  const showGoogleError = useCallback((error: Error) => { dismissVerified(); setSocialError(error.message); }, [dismissVerified]);
  const completeAppleSignIn = useCallback(async (input: { idToken: string; firstName?: string; lastName?: string }) => {
    dismissVerified();
    setSocialError(null);
    try {
      const result = await signInWithApple(input);
      if (result.kind === 'profile_completion_required') {
        setPendingSocialRegistration({ pendingToken: result.pendingToken, profile: result.profile, provider: 'Apple' });
        router.push('/(auth)/social-complete');
        return;
      }
      if (result.kind === 'deletion_recovery_required') {
        setRecoveryError(null);
        setRecovery({ kind: 'apple', input, recoveryUntil: result.recoveryUntil });
        return;
      }
      continueToStudio();
    } catch (error) {
      if (stageDeletionRecovery(error, { kind: 'apple', input })) return;
      throw error;
    }
  }, [continueToStudio, signInWithApple, stageDeletionRecovery, dismissVerified]);

  return (
    <AuthLayout>
      <AuthBrandBar actionLabel={copy('Kayıt ol', 'Sign up')} onAction={() => router.push('/(auth)/register')} />
      <AuthHero variant="login" />
      <AuthTitle eyebrow={copy('STÜDYONA DÖN', 'BACK TO YOUR STUDIO')} title={copy('Tekrar hoş geldin.', 'Welcome back.')}
        subtitle={copy('Hayalindeki kareler seni bekliyor.', 'Your next creation is waiting.')} />
      <AuthFormCard>
        {verified ? <AuthSuccessNotice title={copy('E-posta doğrulandı', 'Email verified')}
          message={copy('Hesabın hazır. Şimdi güvenle giriş yapabilirsin.', 'Your account is ready. You can sign in now.')}
          onDismiss={dismissVerified} /> : null}
        <View style={styles.socials}>
          <GoogleSignInButton label={copy('Google ile giriş yap', 'Sign in with Google')} disabled={isSubmitting || Boolean(recovery)} onError={showGoogleError} onSuccess={completeGoogleSignIn} />
          <AppleSignInButton disabled={isSubmitting || Boolean(recovery)} onError={showGoogleError} onSuccess={completeAppleSignIn} />
        </View>
        {socialError ? <Text accessibilityLiveRegion="polite" style={styles.serverError}>{socialError}</Text> : null}
        <Divider />
        <Controller control={control} name="email" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('E-posta', 'Email')}</Text>
            <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
              <Ionicons color={authColors.yellow} name="mail-outline" size={18} />
              <TextInput accessibilityLabel={copy('E-posta', 'Email')} autoCapitalize="none" autoComplete="email" autoCorrect={false}
                blurOnSubmit={false} cursorColor={authColors.yellow} keyboardType="email-address"
                onBlur={() => { setEmailFocused(false); onBlur(); }} onChangeText={onChange} onFocus={() => { dismissVerified(); setEmailFocused(true); }}
                onSubmitEditing={() => passwordInputRef.current?.focus()} placeholder="ornek@eposta.com" placeholderTextColor={authColors.muted}
                rejectResponderTermination={false} returnKeyType="next" selectionColor={authColors.yellow} style={styles.input}
                underlineColorAndroid="transparent" value={value ?? ''} />
            </View>
            {errors.email?.message ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
          </View>
        )} />
        <Controller control={control} name="password" render={({ field: { onBlur, onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{copy('Şifre', 'Password')}</Text>
            <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
              <Ionicons color={authColors.yellow} name="lock-closed-outline" size={17} />
              <TextInput ref={passwordInputRef} accessibilityLabel={copy('Şifre', 'Password')} autoComplete="current-password" blurOnSubmit={false}
                cursorColor={authColors.yellow} onBlur={() => { setPasswordFocused(false); onBlur(); }} onChangeText={onChange}
                onFocus={() => { dismissVerified(); setPasswordFocused(true); }} placeholder={copy('Şifreni gir', 'Enter your password')} placeholderTextColor={authColors.muted}
                rejectResponderTermination={false} returnKeyType="go" secureTextEntry={!showPassword} selectionColor={authColors.yellow}
                style={styles.input} underlineColorAndroid="transparent" value={value ?? ''} />
              <Pressable accessibilityLabel={showPassword ? copy('Şifreyi gizle', 'Hide password') : copy('Şifreyi göster', 'Show password')}
                accessibilityRole="button" hitSlop={10} onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
                <Ionicons color={authColors.secondary} name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} />
              </Pressable>
            </View>
            {errors.password?.message ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}
          </View>
        )} />
        <View style={styles.forgot}><AuthLink onPress={() => router.push('/(auth)/forgot-password')}>{copy('Şifremi unuttum', 'Forgot password')}</AuthLink></View>
        {errors.root?.message ? <Text accessibilityLiveRegion="polite" style={styles.serverError}>{errors.root.message}</Text> : null}
        <GradientAuthButton accessibilityLabel={copy('Giriş yap', 'Sign in')} icon="arrow-forward" loading={isSubmitting} onPress={() => void submit()}>{copy('Giriş yap', 'Sign in')}</GradientAuthButton>
        <AuthNote>{copy('Bilgilerin şifreli olarak korunur. Yalnızca senin onayınla fotoğrafın işlenir.', 'Your information is encrypted. Your photo is processed only with your consent.')}</AuthNote>
      </AuthFormCard>
      <View style={styles.bottomText}>
        <Text style={styles.bottomCopy}>{copy('Henüz hesabın yok mu? ', 'New here? ')}</Text>
        <AuthLink onPress={() => router.push('/(auth)/register')}>{copy('Kayıt ol', 'Sign up')}</AuthLink>
      </View>
      <Modal transparent visible={Boolean(recovery)} animationType="fade" statusBarTranslucent onRequestClose={() => { if (!recoveryBusy) setRecovery(null); }}>
        <View style={styles.recoveryModal}>
          <BlurView intensity={62} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.recoveryShade} />
          <View accessibilityViewIsModal style={styles.recoverySheet}>
            <View style={styles.recoveryHandle} />
            <View style={styles.recoveryIcon}><Ionicons name="arrow-undo-outline" size={28} color="#0B0904" /></View>
            <Text style={styles.recoveryEyebrow}>{copy('HESAP SİLME BEKLEMEDE', 'ACCOUNT DELETION PENDING')}</Text>
            <Text style={styles.recoveryTitle}>{copy('Hesabını silmekten vaz mı geçtin?', 'Changed your mind about deleting your account?')}</Text>
            <Text style={styles.recoveryBody}>{copy(
              'Hesabın henüz kalıcı olarak silinmedi. 30 günlük geri alma süresi içinde hesabını mevcut projelerin ve verilerinle yeniden etkinleştirebilirsin.',
              'Your account has not been permanently deleted. Within the 30-day recovery period you can reactivate it with your existing projects and data.',
            )}</Text>
            {recovery ? <View style={styles.recoveryDeadline}>
              <Ionicons name="time-outline" size={18} color="#E7C46E" />
              <Text style={styles.recoveryDeadlineText}>{copy('Son geri alma tarihi: ', 'Recovery deadline: ')}{new Date(recovery.recoveryUntil).toLocaleString(copy('tr-TR', 'en-US'), { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View> : null}
            {recoveryError ? <Text accessibilityRole="alert" style={styles.recoveryError}>{recoveryError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: recoveryBusy }} disabled={recoveryBusy} onPress={() => void recoverAccount()}
              style={({ pressed }) => [styles.recoveryPrimary, recoveryBusy && styles.recoveryDisabled, pressed && styles.recoveryPressed]}>
              <Ionicons name="refresh-outline" size={21} color="#0A0804" />
              <Text style={styles.recoveryPrimaryText}>{recoveryBusy ? copy('Hesap geri getiriliyor…', 'Restoring account…') : copy('Hesabı geri getir', 'Restore account')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={recoveryBusy} onPress={() => { setRecoveryError(null); setRecovery(null); }} style={styles.recoverySecondary}>
              <Text style={styles.recoverySecondaryText}>{copy('Silme işlemine devam et', 'Keep deletion scheduled')}</Text>
            </Pressable>
            <Text style={styles.recoveryFootnote}>{copy('Geri getirmezsen süre sonunda kalıcı silme başlar. Bu ekranı kapatmak silme tarihini değiştirmez.', 'Permanent deletion starts after the deadline. Closing this dialog does not change the scheduled date.')}</Text>
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  socials: { marginTop: 0 }, field: { marginTop: 16 },
  label: { color: '#EFEFEF', fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginBottom: 8 },
  inputRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 13, minHeight: 56, paddingLeft: 15 },
  inputRowFocused: { borderColor: 'rgba(255,196,0,0.72)', shadowColor: '#FFC400', shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.14, shadowRadius: 7 },
  input: { color: authColors.text, flex: 1, fontSize: 16, minHeight: 55, paddingVertical: 0 },
  eyeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  fieldError: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 }, forgot: { alignItems: 'flex-end', marginTop: 13 },
  serverError: { color: '#FF877D', fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  bottomText: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  bottomCopy: { color: authColors.secondary, fontSize: 14 },
  recoveryModal: { flex: 1, justifyContent: 'flex-end' },
  recoveryShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  recoverySheet: { marginHorizontal: 10, marginBottom: 10, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(13,13,15,0.96)', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 24 },
  recoveryHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.26)', marginBottom: 18 },
  recoveryIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3D275', marginBottom: 13 },
  recoveryEyebrow: { color: '#E3C46E', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  recoveryTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 31, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  recoveryBody: { color: '#B9B5BF', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10, paddingHorizontal: 5 },
  recoveryDeadline: { width: '100%', marginTop: 16, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(231,196,110,0.25)', backgroundColor: 'rgba(231,196,110,0.07)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  recoveryDeadlineText: { color: '#DED7C5', flex: 1, fontSize: 12, lineHeight: 18 },
  recoveryError: { color: '#FF8E85', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  recoveryPrimary: { width: '100%', minHeight: 56, borderRadius: 18, backgroundColor: '#F1CF70', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  recoveryPrimaryText: { color: '#0A0804', fontSize: 16, fontWeight: '900' },
  recoverySecondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  recoverySecondaryText: { color: '#C7C2CD', fontSize: 13, textDecorationLine: 'underline' },
  recoveryFootnote: { color: '#7F7A85', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 16 },
  recoveryDisabled: { opacity: 0.6 }, recoveryPressed: { opacity: 0.82 },
});
