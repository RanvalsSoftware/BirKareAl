import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCopy } from '@/features/settings/language-store';

const brandLogoMark = require('../../../assets/onboarding/images/brand/logo-gold-icon.png');

export const authColors = {
  background: '#050505',
  surface: '#101010',
  surfaceRaised: '#171717',
  surfaceSoft: '#1A1A1A',
  text: '#FFFFFF',
  secondary: '#B2B2B2',
  muted: '#747474',
  yellow: '#FFC400',
  yellowLight: '#FFE17C',
  purple: '#8755FF',
  pink: '#D550FF',
  border: 'rgba(255,255,255,0.11)',
  borderSoft: 'rgba(255,255,255,0.07)',
  danger: '#FF7065',
  success: '#8FE8A7',
};

type BrandBarProps = {
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
};

function AmbientGlow() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.44);

  useEffect(() => {
    cancelAnimation(pulse);
    if (reduceMotion) {
      pulse.value = 0.44;
      return undefined;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 3_800 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const purpleGlow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.11, 0.22]),
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ambientLayer]}>
      <LinearGradient
        colors={['#050506', '#07060A', '#050505', '#070608']}
        locations={[0, 0.34, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.backgroundVioletHaze, purpleGlow]} />
    </View>
  );
}

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthBrandBar({ actionLabel, onAction, onBack }: BrandBarProps) {
  const copy = useCopy();
  return (
    <View style={styles.brandBar}>
      <View style={styles.brandLeading}>
        {onBack ? (
          <Pressable
            accessibilityLabel={copy('Geri', 'Back')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.brandBack, pressed && styles.pressed]}
          >
            <Ionicons color={authColors.yellowLight} name="chevron-back" size={21} />
          </Pressable>
        ) : null}
        <View style={styles.brandIdentity}>
          <Image source={brandLogoMark} style={styles.brandMark} />
          <View style={styles.brandWordBlock}>
            <View style={styles.brandWordmark}>
              <Text style={styles.brandWordmarkText}>BirKare</Text>
              <Text style={styles.brandWordmarkAi}> ΛI</Text>
            </View>
            <Text style={styles.brandTagline}>
              {copy('Hayalindeki kareye gir.', 'Step into your vision.')}
            </Text>
          </View>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.topAction, pressed && styles.pressed]}
        >
          <Text style={styles.topActionText}>{actionLabel}</Text>
          <Ionicons color={authColors.yellow} name="arrow-forward" size={13} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AuthLogo({ compact = false }: { compact?: boolean }) {
  const copy = useCopy();
  return (
    <View style={[styles.logoWrap, compact && styles.logoWrapCompact]}>
      <View style={styles.logoAura}>
        <Image
          accessibilityLabel="BirKare AI logosu"
          source={brandLogoMark}
          style={styles.logoImage}
        />
      </View>
      {!compact ? (
        <View style={styles.logoCaption}>
          <View style={styles.logoWordmark}>
            <Text style={styles.logoWordmarkText}>BirKare</Text>
            <Text style={styles.logoWordmarkAi}> AI</Text>
          </View>
          <View style={styles.logoCaptionLine} />
          <Text style={styles.logoCaptionText}>
            {copy('Yaratıcı stüdyon', 'Your creative studio')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Shared visual stage for the login, registration, and password recovery
 * routes. The logo deliberately has no disc or orbit behind it; the only
 * decorative shape lives in the far top-left background.
 */
export function AuthHero({
  variant = 'default',
}: {
  variant?: 'default' | 'login' | 'register' | 'forgot';
}) {
  const reduceMotion = useReducedMotion();
  const isForgot = variant === 'forgot';
  const float = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(float);
    if (reduceMotion) {
      float.value = 0;
      return undefined;
    }
    float.value = withRepeat(withTiming(1, { duration: 2_900 }), -1, true);
    return () => cancelAnimation(float);
  }, [float, reduceMotion]);

  const floatingLogo = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-2, 4]) },
      { scale: interpolate(float.value, [0, 1], [1, 1.025]) },
    ],
  }));

  return (
    <View pointerEvents="none" style={[styles.hero, isForgot && styles.heroForgot]}>
      <Animated.Image
        accessibilityLabel="BirKare AI logosu"
        source={brandLogoMark}
        style={[styles.heroLogo, isForgot && styles.heroLogoForgot, floatingLogo]}
      />
    </View>
  );
}

export function AuthTitle({
  title,
  subtitle,
  eyebrow = 'BİRKARE AI',
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLine} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function AuthFormCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.cardOuter, style]}>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

export function AuthNote({
  children,
  tone = 'neutral',
  icon = 'shield-checkmark-outline',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const color =
    tone === 'success'
      ? authColors.success
      : tone === 'warning'
        ? authColors.yellow
        : authColors.secondary;
  return (
    <View
      style={[
        styles.note,
        tone === 'success' && styles.noteSuccess,
        tone === 'warning' && styles.noteWarning,
      ]}
    >
      <Ionicons color={color} name={icon} size={17} />
      <Text style={[styles.noteText, tone === 'success' && styles.noteTextSuccess]}>
        {children}
      </Text>
    </View>
  );
}

export function FormField({
  label,
  error,
  containerStyle,
  icon,
  inputRef,
  onBlur: onInputBlur,
  onChangeText,
  onFocus: onInputFocus,
  style: inputStyle,
  value,
  ...inputProps
}: TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: ReactNode;
  inputRef?: Ref<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
        ]}
      >
        <TextInput
          ref={inputRef}
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          cursorColor={authColors.yellow}
          editable={inputProps.editable ?? true}
          onChangeText={onChangeText}
          pointerEvents="auto"
          placeholderTextColor={authColors.muted}
          rejectResponderTermination={false}
          selectionColor={authColors.yellow}
          style={[styles.input, icon ? styles.inputFullHitboxWithIcon : undefined, inputStyle]}
          underlineColorAndroid="transparent"
          value={value ?? ''}
          onBlur={(event) => {
            setFocused(false);
            onInputBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onInputFocus?.(event);
          }}
        />
        {icon ? (
          <View pointerEvents="none" accessible={false} style={styles.fieldIconOverlay}>
            {icon}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function PasswordFormField({
  label,
  error,
  icon,
  onBlur: onInputBlur,
  onChangeText,
  onFocus: onInputFocus,
  style: inputStyle,
  value,
  ...inputProps
}: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: string; icon?: ReactNode }) {
  const copy = useCopy();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.passwordWrap,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
        ]}
      >
        {icon ? (
          <View pointerEvents="none" style={styles.leadingIcon}>
            {icon}
          </View>
        ) : null}
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          cursorColor={authColors.yellow}
          editable={inputProps.editable ?? true}
          onChangeText={onChangeText}
          pointerEvents="auto"
          placeholderTextColor={authColors.muted}
          rejectResponderTermination={false}
          selectionColor={authColors.yellow}
          secureTextEntry={!visible}
          style={[styles.passwordInput, icon ? styles.inputWithIcon : undefined, inputStyle]}
          underlineColorAndroid="transparent"
          value={value ?? ''}
          onBlur={(event) => {
            setFocused(false);
            onInputBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onInputFocus?.(event);
          }}
        />
        <Pressable
          accessibilityLabel={
            visible
              ? copy('Şifreyi gizle', 'Hide password')
              : copy('Şifreyi göster', 'Show password')
          }
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setVisible((value) => !value)}
          style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
        >
          <Ionicons
            color={authColors.secondary}
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={19}
          />
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function GradientAuthButton({
  children,
  onPress,
  loading,
  disabled = false,
  accessibilityLabel,
  icon,
}: {
  children: ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const copy = useCopy();
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonHitbox,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={['#FFE67A', '#FFC400', '#E5A900']}
        end={{ x: 1, y: 0.85 }}
        start={{ x: 0.02, y: 0.1 }}
        style={styles.gradientButton}
      >
        <Text style={styles.gradientButtonText}>
          {loading ? copy('İşleniyor…', 'Processing…') : children}
        </Text>
        {icon && !loading ? <Ionicons color="#090909" name={icon} size={19} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function SocialButton({
  icon,
  children,
  onPress,
  tone = 'dark',
  disabled = false,
  loading = false,
}: {
  icon: ReactNode;
  children: string;
  onPress: () => void;
  tone?: 'dark' | 'light';
  disabled?: boolean;
  loading?: boolean;
}) {
  const copy = useCopy();
  return (
    <Pressable
      accessibilityLabel={children}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        tone === 'light' && styles.socialButtonLight,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.socialIcon}>{icon}</View>
      <Text style={[styles.socialText, tone === 'light' && styles.socialTextLight]}>
        {loading ? copy('Google açılıyor…', 'Opening Google…') : children}
      </Text>
      {!loading ? (
        <Ionicons
          color={tone === 'light' ? '#595959' : authColors.muted}
          name="chevron-forward"
          size={16}
          style={styles.socialChevron}
        />
      ) : null}
    </Pressable>
  );
}

export function AuthLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

export function Divider({ children }: { children?: string }) {
  const copy = useCopy();
  const label = children ?? copy('veya e-posta ile', 'or continue with email');
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

export function CheckRow({
  checked,
  onPress,
  children,
  error,
  documentLink,
}: {
  checked: boolean;
  onPress: () => void;
  children: ReactNode;
  error?: string;
  documentLink?: {
    label: string;
    onPress: () => void;
  };
}) {
  const checkbox = (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Ionicons name="checkmark" size={15} color="#050505" /> : null}
    </View>
  );

  return (
    <View>
      {documentLink ? (
        <View style={styles.checkRow}>
          <Pressable
            accessibilityLabel={`${documentLink.label} kabulü`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            hitSlop={10}
            onPress={onPress}
            style={({ pressed }) => pressed && styles.pressed}
          >
            {checkbox}
          </Pressable>
          <Text style={styles.checkText}>
            <Text
              accessibilityHint="Belgeyi açar"
              accessibilityRole="link"
              onPress={documentLink.onPress}
              style={styles.checkLink}
            >
              {documentLink.label}
            </Text>
            {children}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={onPress}
          style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
        >
          {checkbox}
          <Text style={styles.checkText}>{children}</Text>
        </Pressable>
      )}
      {error ? <Text style={[styles.error, styles.checkError]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.background },
  keyboardAvoider: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 680,
    paddingHorizontal: 22,
    width: '100%',
  },
  ambientLayer: {},
  backgroundVioletHaze: {
    backgroundColor: '#2A0B55',
    borderRadius: 999,
    height: 820,
    left: -535,
    position: 'absolute',
    top: -555,
    width: 820,
  },
  brandBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingTop: 7,
  },
  brandLeading: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10, minWidth: 0 },
  brandBack: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,224,120,0.35)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandIdentity: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 11 },
  brandMark: { height: 34, resizeMode: 'contain', width: 34 },
  brandWordBlock: { gap: 1 },
  brandWordmark: { alignItems: 'baseline', flexDirection: 'row' },
  brandWordmarkText: {
    color: '#F8C945',
    fontSize: 23,
    fontWeight: '500',
    letterSpacing: -1,
  },
  brandWordmarkAi: {
    color: '#FFE46E',
    fontSize: 23,
    fontWeight: '300',
    letterSpacing: -1,
  },
  brandTagline: {
    color: '#D7CCB1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.065)',
    borderColor: 'rgba(255,210,63,0.72)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 15,
    shadowColor: '#FFC400',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 9,
  },
  topActionText: { color: authColors.yellowLight, fontSize: 14, fontWeight: '900' },
  hero: {
    alignItems: 'center',
    height: 154,
    justifyContent: 'center',
    marginBottom: 5,
    position: 'relative',
  },
  heroForgot: { height: 162, marginBottom: 7 },
  heroLogo: { height: 122, resizeMode: 'contain', width: 122 },
  heroLogoForgot: { height: 128, width: 128 },
  logoWrap: { alignItems: 'center', marginBottom: 25, marginTop: 23 },
  logoWrapCompact: { marginBottom: 18, marginTop: 16 },
  logoAura: {
    alignItems: 'center',
    height: 108,
    justifyContent: 'center',
    width: 108,
  },
  logoImage: { height: '100%', resizeMode: 'contain', width: '100%' },
  logoCaption: { alignItems: 'center', gap: 6, marginTop: 4 },
  logoWordmark: { alignItems: 'baseline', flexDirection: 'row' },
  logoWordmarkText: { color: '#F6C643', fontSize: 31, fontWeight: '500', letterSpacing: -1.3 },
  logoWordmarkAi: { color: '#FFE576', fontSize: 31, fontWeight: '300', letterSpacing: -1.3 },
  logoCaptionLine: { backgroundColor: authColors.yellow, borderRadius: 99, height: 2, width: 22 },
  logoCaptionText: {
    color: authColors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  titleBlock: { marginBottom: 25 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 9 },
  eyebrowLine: { backgroundColor: authColors.yellow, borderRadius: 2, height: 4, width: 24 },
  eyebrow: { color: authColors.yellowLight, fontSize: 11, fontWeight: '900', letterSpacing: 2.1 },
  title: {
    color: authColors.text,
    fontSize: 39,
    fontWeight: '800',
    letterSpacing: -1.9,
    lineHeight: 45,
  },
  subtitle: {
    color: authColors.secondary,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: 390,
  },
  cardOuter: {
    backgroundColor: '#171218',
    borderRadius: 27,
    padding: 1,
    shadowColor: '#FFC400',
    shadowOffset: { height: 13, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
  },
  cardInner: {
    borderRadius: 26,
  },
  cardContent: { padding: 19 },
  note: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: authColors.borderSoft,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  noteSuccess: { backgroundColor: 'rgba(48,209,88,0.075)', borderColor: 'rgba(48,209,88,0.2)' },
  noteWarning: { backgroundColor: 'rgba(255,196,0,0.075)', borderColor: 'rgba(255,196,0,0.2)' },
  noteText: { color: authColors.secondary, flex: 1, fontSize: 12, lineHeight: 18 },
  noteTextSuccess: { color: '#B7F4C7' },
  fieldWrap: { marginTop: 16 },
  label: {
    color: '#EFEFEF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  input: {
    color: authColors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 55,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  inputWithIcon: { paddingLeft: 0 },
  // The native input owns the entire visible capsule, including the icon area.
  // A sibling icon column leaves an inert touch strip and cannot receive focus.
  inputFullHitboxWithIcon: { paddingLeft: 46 },
  fieldIconOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingIcon: { alignItems: 'center', justifyContent: 'center', width: 46 },
  passwordWrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  inputFocused: {
    borderColor: 'rgba(255,196,0,0.78)',
    shadowColor: '#FFC400',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  passwordInput: {
    color: authColors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 55,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  eyeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  inputError: { borderColor: authColors.danger },
  error: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  buttonHitbox: { marginTop: 24, minHeight: 58 },
  gradientButton: {
    alignItems: 'center',
    borderRadius: 17,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 18,
    shadowColor: '#FFC400',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 15,
  },
  gradientButtonText: { color: '#080705', fontSize: 17, fontWeight: '900' },
  socialButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: authColors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  socialButtonLight: { backgroundColor: '#F7F7F7', borderColor: '#F7F7F7' },
  socialIcon: { left: 16, position: 'absolute' },
  socialText: { color: authColors.text, fontSize: 14, fontWeight: '800' },
  socialTextLight: { color: '#101010' },
  socialChevron: { position: 'absolute', right: 14 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 19 },
  line: { backgroundColor: authColors.border, flex: 1, height: 1 },
  dividerText: { color: authColors.muted, fontSize: 11, fontWeight: '600' },
  link: { color: '#E0B5FF', fontSize: 13, fontWeight: '800' },
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 13 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: authColors.border,
    borderRadius: 7,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 0,
    width: 22,
  },
  checkboxChecked: { backgroundColor: authColors.yellow, borderColor: authColors.yellow },
  checkText: { color: authColors.secondary, flex: 1, fontSize: 12, lineHeight: 18 },
  checkLink: { color: authColors.yellowLight, fontWeight: '900', textDecorationLine: 'underline' },
  checkError: { marginLeft: 32 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.52 },
});

export const authStyles = styles;
