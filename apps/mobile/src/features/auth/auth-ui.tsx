import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { useCopy } from '@/features/settings/language-store';
import { brand, brandGradients } from '@/theme/brand';

/**
 * Colour aliases kept for the authentication screens. `yellow` is the gold
 * accent; the historical key name stays so existing call sites keep working.
 */
export const authColors = {
  background: brand.background,
  surface: brand.surface,
  surfaceRaised: brand.surfaceRaised,
  surfaceSoft: brand.surfaceSoft,
  text: brand.text,
  secondary: brand.textSecondary,
  muted: brand.textMuted,
  yellow: brand.gold,
  yellowLight: brand.goldLight,
  purple: brand.goldDeep,
  pink: brand.goldLight,
  border: brand.border,
  borderSoft: brand.borderSoft,
  danger: '#FF7065',
  success: '#8FE8A7',
};

type BrandBarProps = {
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
};

function AmbientBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#1A1508', brand.background, brand.background, '#120F06']}
        locations={[0, 0.38, 0.78, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backdropGlow} />
    </View>
  );
}

export function AuthLayout({ children }: PropsWithChildren) {
  const languageRevision = useLanguageRevision();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AmbientBackdrop />
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
          <View style={styles.content}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Top row of the auth screens: an optional back circle and an optional pill action. */
export function AuthBrandBar({ actionLabel, onAction, onBack }: BrandBarProps) {
  const languageRevision = useLanguageRevision();

  const copy = useCopy();
  return (
    <View style={styles.brandBar}>
      {onBack ? (
        <Pressable
          accessibilityLabel={copy('Geri', 'Back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
        >
          <Ionicons color={brand.text} name="chevron-back" size={21} />
        </Pressable>
      ) : (
        <View style={styles.circleButtonSpacer} />
      )}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.topAction, pressed && styles.pressed]}
        >
          <Text style={styles.topActionText}>{actionLabel}</Text>
          <Ionicons color={brand.gold} name="arrow-forward" size={13} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Centered brand mark used above every auth title. */
export function AuthLogo({ compact = false }: { compact?: boolean }) {
  const languageRevision = useLanguageRevision();

  return (
    <View
      accessibilityLabel={translateCopy('BirKare Studio logosu')}
      style={[styles.logoWrap, compact && styles.logoWrapCompact]}
    >
      <BrandLogo size={compact ? 96 : 132} />
    </View>
  );
}

export function AuthTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  const languageRevision = useLanguageRevision();

  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

/** Form region; kept as a named wrapper so the screens read the same. */
export function AuthFormCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const languageRevision = useLanguageRevision();

  return <View style={[styles.form, style]}>{children}</View>;
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
  const languageRevision = useLanguageRevision();

  const color =
    tone === 'success'
      ? authColors.success
      : tone === 'warning'
        ? brand.gold
        : brand.textSecondary;
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
  const languageRevision = useLanguageRevision();

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
          cursorColor={brand.gold}
          editable={inputProps.editable ?? true}
          onChangeText={onChangeText}
          pointerEvents="auto"
          placeholderTextColor={brand.textMuted}
          rejectResponderTermination={false}
          selectionColor={brand.gold}
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
  const languageRevision = useLanguageRevision();

  const copy = useCopy();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
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
          cursorColor={brand.gold}
          editable={inputProps.editable ?? true}
          onChangeText={onChangeText}
          pointerEvents="auto"
          placeholderTextColor={brand.textMuted}
          rejectResponderTermination={false}
          selectionColor={brand.gold}
          secureTextEntry={!visible}
          style={[styles.input, icon ? styles.inputWithIcon : undefined, inputStyle]}
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
            color={brand.textSecondary}
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

/** Primary gold pill. The icon leads the label, as in the reference design. */
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
  const languageRevision = useLanguageRevision();

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
        colors={brandGradients.button}
        end={{ x: 1, y: 0.85 }}
        start={{ x: 0.02, y: 0.1 }}
        style={styles.gradientButton}
      >
        {icon && !loading ? <Ionicons color={brand.onGold} name={icon} size={18} /> : null}
        <Text style={styles.gradientButtonText}>
          {loading ? copy('İşleniyor…', 'Processing…') : children}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Lays social sign-in buttons side by side with equal width. */
export function AuthSocialRow({ children }: PropsWithChildren) {
  const languageRevision = useLanguageRevision();

  return <View style={styles.socialRow}>{children}</View>;
}

export function SocialButton({
  icon,
  children,
  onPress,
  tone = 'dark',
  disabled = false,
  loading = false,
  loadingLabel,
}: {
  icon: ReactNode;
  children: string;
  onPress: () => void;
  tone?: 'dark' | 'light';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const languageRevision = useLanguageRevision();

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
      <Text
        numberOfLines={1}
        style={[styles.socialText, tone === 'light' && styles.socialTextLight]}
      >
        {loading ? (loadingLabel ?? copy('Açılıyor…', 'Opening…')) : children}
      </Text>
    </Pressable>
  );
}

export function AuthLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const languageRevision = useLanguageRevision();

  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

export function Divider({ children }: { children?: string }) {
  const languageRevision = useLanguageRevision();

  const copy = useCopy();
  const label = children ?? copy('veya şununla devam et', 'or continue with');
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
  checkboxAccessibilityLabel,
}: {
  checked: boolean;
  onPress: () => void;
  children: ReactNode;
  error?: string;
  checkboxAccessibilityLabel?: string;
  documentLink?: {
    label: string;
    onPress: () => void;
  };
}) {
  const languageRevision = useLanguageRevision();

  const checkbox = (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Ionicons name="checkmark" size={15} color={brand.onGold} /> : null}
    </View>
  );

  return (
    <View>
      {documentLink ? (
        <View style={styles.checkRow}>
          <Pressable
            accessibilityLabel={
              checkboxAccessibilityLabel ?? translateCopy('{{p0}} kabulü', { p0: documentLink.label })
            }
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
              accessibilityHint={translateCopy('Belgeyi açar')}
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
  safe: { flex: 1, backgroundColor: brand.background },
  keyboardAvoider: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 560,
    paddingHorizontal: 24,
    width: '100%',
  },
  backdropGlow: {
    backgroundColor: brand.gold,
    borderRadius: 999,
    height: 520,
    opacity: 0.045,
    position: 'absolute',
    right: -260,
    top: -330,
    width: 520,
  },
  brandBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingTop: 4,
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: brand.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  circleButtonSpacer: { height: 44, width: 44 },
  topAction: {
    alignItems: 'center',
    backgroundColor: brand.goldTint,
    borderColor: brand.goldBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  topActionText: { color: brand.goldLight, fontSize: 14, fontWeight: '800' },
  logoWrap: { alignItems: 'center', marginBottom: 22, marginTop: 10 },
  logoWrapCompact: { marginBottom: 14, marginTop: 4 },
  titleBlock: { alignItems: 'center', marginBottom: 22 },
  eyebrow: {
    color: brand.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: brand.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    color: brand.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 360,
    textAlign: 'center',
  },
  form: { width: '100%' },
  note: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: brand.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  noteSuccess: { backgroundColor: 'rgba(48,209,88,0.075)', borderColor: 'rgba(48,209,88,0.2)' },
  noteWarning: { backgroundColor: brand.goldTint, borderColor: brand.goldBorder },
  noteText: { color: brand.textSecondary, flex: 1, fontSize: 12, lineHeight: 18 },
  noteTextSuccess: { color: '#B7F4C7' },
  fieldWrap: { marginTop: 16 },
  label: {
    color: brand.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
  },
  input: {
    color: brand.text,
    flex: 1,
    fontSize: 16,
    minHeight: 53,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  inputWithIcon: { paddingLeft: 0 },
  // The native input owns the entire visible capsule, including the icon area.
  // A sibling icon column leaves an inert touch strip and cannot receive focus.
  inputFullHitboxWithIcon: { paddingLeft: 46 },
  fieldIconOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: 46,
  },
  leadingIcon: { alignItems: 'center', justifyContent: 'center', width: 46 },
  inputFocused: {
    borderColor: brand.gold,
    shadowColor: brand.gold,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0,
    shadowRadius: 8,
  },
  eyeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  inputError: { borderColor: authColors.danger },
  error: { color: '#FF928A', fontSize: 12, lineHeight: 17, marginTop: 6 },
  buttonHitbox: { marginTop: 24, minHeight: 56 },
  gradientButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: brand.gold,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0,
    shadowRadius: 16,
  },
  gradientButtonText: { color: brand.onGold, fontSize: 16, fontWeight: '800' },
  socialRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  socialButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  socialButtonLight: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  socialIcon: { alignItems: 'center', justifyContent: 'center' },
  socialText: {
    color: brand.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  socialTextLight: { color: '#111111' },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 22, marginBottom: 16 },
  line: { backgroundColor: brand.border, flex: 1, height: 1 },
  dividerText: { color: brand.textMuted, fontSize: 12, fontWeight: '600' },
  link: { color: brand.gold, fontSize: 14, fontWeight: '700' },
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 13 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: brand.border,
    borderRadius: 7,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: { backgroundColor: brand.gold, borderColor: brand.gold },
  checkText: { color: brand.textSecondary, flex: 1, fontSize: 12, lineHeight: 18 },
  checkLink: { color: brand.goldLight, fontWeight: '800', textDecorationLine: 'underline' },
  checkError: { marginLeft: 32 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});

export const authStyles = styles;
