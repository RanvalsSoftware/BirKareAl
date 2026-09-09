import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  clearPendingSocialRegistration,
  getPendingSocialRegistration,
} from '@/features/auth/social-registration';
import { consumePendingOnboardingCreateDraft } from '@/features/create/createFlow';
import {
  AuthBrandBar,
  AuthFormCard,
  AuthLayout,
  AuthLogo,
  AuthNote,
  AuthTitle,
  CheckRow,
  GradientAuthButton,
  authColors,
} from '@/features/auth/auth-ui';
import {
  normalizeBirthYearInput,
  socialCompleteFormSchema,
  type SocialCompleteFormValues,
  type SocialCompleteValues,
} from '@/features/auth/validation';

export default function SocialCompleteScreen() {
  const completeSocialRegistration = useAuthStore((store) => store.completeSocialRegistration);
  const [pendingRegistration] = useState(getPendingSocialRegistration);
  const lastNameInput = useRef<TextInput>(null);
  const birthYearInput = useRef<TextInput>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
    setError,
  } = useForm<SocialCompleteFormValues, unknown, SocialCompleteValues>({
    resolver: zodResolver(socialCompleteFormSchema),
    defaultValues: {
      firstName: pendingRegistration?.profile.firstName ?? '',
      lastName: pendingRegistration?.profile.lastName ?? '',
      birthYear: '',
      acceptedTerms: false,
      acceptedPrivacy: false,
      acceptedAiDisclosure: false,
      acceptedAge: false,
      acceptedImageRights: false,
    },
  });

  useEffect(() => {
    if (!errors.root?.message) return;
    const timeout = setTimeout(() => clearErrors('root'), 4_000);
    return () => clearTimeout(timeout);
  }, [clearErrors, errors.root?.message]);
  const goBack = () => {
    clearPendingSocialRegistration();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/login');
  };

  const submit = handleSubmit(async (values) => {
    if (!pendingRegistration) {
      setError('root', {
        message:
          'Bu sosyal kayıt oturumu bulunamadı veya süresi doldu. Lütfen Google ile yeniden devam et.',
      });
      return;
    }

    try {
      await completeSocialRegistration({
        pendingToken: pendingRegistration.pendingToken,
        firstName: values.firstName,
        lastName: values.lastName,
        birthYear: values.birthYear,
        acceptedTerms: values.acceptedTerms,
        acceptedPrivacy: values.acceptedPrivacy,
        acceptedAiDisclosure: values.acceptedAiDisclosure,
        acceptedAge: values.acceptedAge,
        acceptedImageRights: values.acceptedImageRights,
      });
      clearPendingSocialRegistration();
      setRegistrationSuccess(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 1_400));
      const onboardingDraft = consumePendingOnboardingCreateDraft();
      if (onboardingDraft?.sourceUri) {
        router.replace({ pathname: '/create/review', params: { autoStart: 'onboarding' } });
        return;
      }
      router.replace(onboardingDraft ? '/create/upload' : '/(tabs)/home');
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Sosyal kayıt tamamlanamadı. Lütfen tekrar deneyin.',
      });
    }
  });

  return (
    <AuthLayout>
      <AuthBrandBar onBack={goBack} />
      <AuthLogo compact />
      <AuthTitle
        eyebrow="PROFİLİ TAMAMLA"
        title="Bilgilerini tamamla."
        subtitle="Sosyal girişini tamamlamak için profil bilgilerini kontrol et."
      />
      <AuthFormCard>
        <AuthNote
          icon={pendingRegistration ? 'person-circle-outline' : 'alert-circle-outline'}
          tone={pendingRegistration ? 'neutral' : 'warning'}
        >
          {pendingRegistration
            ? `Google ile doğrulanan hesap: ${pendingRegistration.profile.email}`
            : 'Sosyal kayıt oturumun bulunamadı. Giriş ekranından Google ile yeniden devam et.'}
        </AuthNote>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onBlur, onChange, value, ref } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Ad</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="person-outline" size={18} />
                <TextInput
                  ref={ref}
                  accessibilityLabel="Ad"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  maxLength={80}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => lastNameInput.current?.focus()}
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
          render={({ field: { onBlur, onChange, value, ref } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Soyad</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="person-outline" size={18} />
                <TextInput
                  ref={(input) => {
                    lastNameInput.current = input;
                    ref(input);
                  }}
                  accessibilityLabel="Soyad"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  maxLength={80}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => birthYearInput.current?.focus()}
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
        <Controller
          control={control}
          name="birthYear"
          render={({ field: { onBlur, onChange, value, ref } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Doğum yılı</Text>
              <View style={styles.inputRow}>
                <Ionicons color={authColors.yellow} name="calendar-outline" size={18} />
                <TextInput
                  ref={(input) => {
                    birthYearInput.current = input;
                    ref(input);
                  }}
                  accessibilityLabel="Doğum yılı"
                  blurOnSubmit={false}
                  cursorColor={authColors.yellow}
                  inputAccessoryViewID={
                    Platform.OS === 'ios' ? 'social-birth-year-done' : undefined
                  }
                  keyboardType="number-pad"
                  maxLength={4}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(normalizeBirthYearInput(text))}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="1998"
                  placeholderTextColor={authColors.muted}
                  rejectResponderTermination={false}
                  returnKeyType="done"
                  selectionColor={authColors.yellow}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={value ?? ''}
                />
              </View>
              {errors.birthYear?.message ? (
                <Text style={styles.fieldError}>{errors.birthYear.message}</Text>
              ) : null}
            </View>
          )}
        />
        <View style={styles.consentDivider} />
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
              AI içerik açıklamasını kabul ediyorum.
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
              Fotoğraf kullanım hakkına sahibim.
            </CheckRow>
          )}
        />
        {registrationSuccess ? (
          <View accessibilityLiveRegion="polite" style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons color="#08180D" name="checkmark" size={19} />
            </View>
            <Text style={styles.successText}>Başarıyla kayıt oldunuz.</Text>
          </View>
        ) : null}
        <GradientAuthButton
          icon="arrow-forward"
          loading={isSubmitting}
          onPress={() => void submit()}
        >
          Devam et
        </GradientAuthButton>
        {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}
      </AuthFormCard>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID="social-birth-year-done">
          <View style={styles.keyboardToolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Klavyeyi kapat"
              onPress={Keyboard.dismiss}
              style={styles.keyboardDone}
            >
              <Text style={styles.keyboardDoneText}>Tamam</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  // Match the native input layout used by the working login screen. Do not
  // wrap these inputs in focus-state components or animated/touch overlays.
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
  keyboardToolbar: {
    backgroundColor: '#171717',
    alignItems: 'flex-end' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  keyboardDone: {
    minHeight: 44,
    minWidth: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  keyboardDoneText: { color: '#FFC400', fontSize: 16, fontWeight: '600' as const },
  consentDivider: { backgroundColor: 'rgba(255,255,255,.08)', height: 1, marginTop: 22 },
  error: { color: '#FF928A', fontSize: 13, lineHeight: 19, marginTop: 14 },
  successBanner: {
    alignItems: 'center' as const,
    backgroundColor: 'rgba(61, 215, 120, 0.12)',
    borderColor: 'rgba(91, 235, 145, 0.48)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row' as const,
    gap: 11,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successIcon: {
    alignItems: 'center' as const,
    backgroundColor: '#55E58C',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center' as const,
    shadowColor: '#55E58C',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 32,
  },
  successText: { color: '#7CF0A7', flex: 1, fontSize: 14, fontWeight: '800' as const },
});
