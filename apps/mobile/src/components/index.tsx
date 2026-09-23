import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ColorValue,
  type ImageSourcePropType,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, gradients, layout, radii, shadows, spacing, typography } from '@/theme';
import { GlassSurface } from './GlassSurface';

export { AppleGlassButton } from './AppleGlassButton';
export { GlassSurface } from './GlassSurface';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const brandLogoMark = require('../../assets/onboarding/images/brand/logo-gold-icon.png');

export function Icon({
  name,
  size = 20,
  color = colors.textPrimary,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  testID?: string;
}>;

/** Safe, dark screen primitive with optional accessible scrolling. */
export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
  testID,
}: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={edges} style={[styles.safeArea, style]} testID={testID}>
        <View style={[styles.screenContent, contentContainerStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]} testID={testID}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LogoMark({
  size = 48,
  withWordmark = false,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.035, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  return (
    <View
      style={withWordmark ? styles.logoWithWordmark : undefined}
      accessible
      accessibilityLabel="BirKare AI"
    >
      <Animated.View
        style={[styles.logoOuter, { width: size, height: size, transform: [{ scale: pulse }] }]}
      >
        <Image source={brandLogoMark} style={styles.logoImage} />
      </Animated.View>
      {withWordmark ? (
        <View style={styles.wordmarkCopy}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.wordmarkText}>
            BirKare <Text style={styles.wordmarkAi}>AI</Text>
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.wordmarkCaption}>
            hayalindeki kareye adım at
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        unavailable && styles.buttonDisabled,
        pressed && !unavailable && styles.buttonPressed,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.background} />
      ) : icon ? (
        <Icon name={icon} size={19} color={colors.background} />
      ) : null}
      <Text style={styles.primaryButtonText}>{loading ? 'Hazırlanıyor…' : label}</Text>
    </Pressable>
  );
}

export function GradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.gradientButtonWrap,
        unavailable && styles.buttonDisabled,
        pressed && !unavailable && styles.buttonPressed,
        style,
      ]}
      testID={testID}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradientButton}
      >
        {loading ? (
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
        ) : icon ? (
          <Icon name={icon} size={19} />
        ) : null}
        <Text style={styles.gradientButtonText}>{loading ? 'Hazırlanıyor…' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
}: Omit<ButtonProps, 'loading' | 'accessibilityHint' | 'testID'>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={colors.textPrimary} /> : null}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  rightAdornment,
  containerStyle,
  style,
  accessibilityLabel,
  ...props
}: TextFieldProps) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        {leftIcon ? <Icon name={leftIcon} size={19} color={colors.textMuted} /> : null}
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            Boolean(rightAdornment) && styles.inputWithRightAdornment,
            style,
          ]}
        />
        {rightAdornment}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function PasswordField({
  label = 'Şifre',
  ...props
}: Omit<TextFieldProps, 'secureTextEntry' | 'rightAdornment'>) {
  const [secure, setSecure] = useState(true);
  return (
    <TextField
      {...props}
      label={label}
      autoCapitalize="none"
      autoComplete="password"
      secureTextEntry={secure}
      rightAdornment={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secure ? 'Şifreyi göster' : 'Şifreyi gizle'}
          hitSlop={10}
          onPress={() => setSecure((current) => !current)}
          style={styles.passwordToggle}
        >
          <Icon
            name={secure ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      }
    />
  );
}

export function BackButton({
  fallback = '/(tabs)/home',
  label = 'Geri',
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as never))}
      style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
    >
      <Icon name="chevron-back" size={24} />
    </Pressable>
  );
}

export function AppHeader({
  title,
  subtitle,
  back = true,
  right,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <GlassSurface
      radius={28}
      tone="gold"
      style={styles.headerSurface}
      contentStyle={[styles.header, compact && styles.headerCompact]}
    >
      <View style={styles.headerLeft}>
        {back ? <BackButton /> : null}
        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </GlassSurface>
  );
}

export function CreditBadge({
  credits,
  pro = false,
}: {
  credits?: number | string;
  pro?: boolean;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  function pressAnimation(pressed: boolean) {
    if (reducedMotion) return;
    Animated.spring(scale, {
      toValue: pressed ? 0.95 : 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 5,
    }).start();
  }
  return (
    <Animated.View style={{ alignSelf: 'flex-start', transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${credits ?? 'Yükleniyor'} kredi${pro ? ', Pro üye' : ''}`}
        accessibilityHint="Kredi bakiyeni ve paketleri görüntüle"
        onPressIn={() => pressAnimation(true)}
        onPressOut={() => pressAnimation(false)}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          router.push('/(tabs)/credits' as never);
        }}
      >
        <GlassSurface tone="gold" selected radius={25} contentStyle={styles.creditBadge}>
          <Icon name="flash" size={18} color={colors.accentYellow} />
          <Text style={styles.creditText}>{credits ?? '—'}</Text>
          {pro ? <Text style={styles.proInline}>PRO</Text> : null}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

export function ProBadge({ label = 'Pro' }: { label?: string }) {
  return (
    <View accessible accessibilityLabel={`${label} üyelik`} style={styles.proBadge}>
      <Icon name="sparkles" size={12} color={colors.background} />
      <Text style={styles.proBadgeText}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onActionPress,
  accessory,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
  accessory?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {accessory ??
        (action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            onPress={onActionPress}
            hitSlop={8}
          >
            <Text style={styles.sectionAction}>
              {action} <Text style={styles.sectionArrow}>›</Text>
            </Text>
          </Pressable>
        ) : null)}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Ara',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.searchBar}>
      <Icon name="search" size={19} color={colors.textMuted} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aramayı temizle"
          onPress={() => onChangeText('')}
          hitSlop={8}
        >
          <Icon name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function CategoryChip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [styles.chipPressable, pressed && styles.buttonPressed]}
    >
      <GlassSurface
        radius={22}
        tone="gold"
        selected={selected}
        glow={selected}
        contentStyle={styles.chip}
      >
        {icon ? (
          <Icon
            name={icon}
            size={15}
            color={selected ? colors.accentYellow : colors.textSecondary}
          />
        ) : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </GlassSurface>
    </Pressable>
  );
}

export function VisualTile({
  title,
  subtitle,
  palette,
  icon,
  imageSource,
  badge,
  onPress,
  size = 'regular',
  selected = false,
}: {
  title: string;
  subtitle?: string;
  palette: readonly [string, string];
  icon: string;
  imageSource?: ImageSourcePropType;
  badge?: string;
  onPress?: () => void;
  size?: 'small' | 'regular' | 'wide';
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(', ')}
      onPress={onPress}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.tileWrap,
        size === 'small' && styles.tileSmall,
        size === 'wide' && styles.tileWide,
        selected && styles.tileSelected,
        pressed && onPress && styles.tilePressed,
      ]}
    >
      <View style={[styles.tileArt, imageSource ? styles.tileArtPortrait : styles.tileArtDefault]}>
        {imageSource ? (
          <>
            <View pointerEvents="none" style={styles.tileImageCanvas}>
              <Image fadeDuration={0} source={imageSource} style={styles.tileImage} />
            </View>
            <LinearGradient
              colors={['rgba(5,5,5,0.02)', 'rgba(5,5,5,0.06)', 'rgba(5,5,5,0.16)']}
              locations={[0, 0.48, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={palette}
            style={[StyleSheet.absoluteFill, styles.tileGradientArt]}
          >
            <View style={styles.tileGrain} />
            <View style={styles.tileGlowOne} />
            <View style={styles.tileGlowTwo} />
            <View style={styles.tileIconCircle}>
              <Text style={styles.tileIcon}>{icon}</Text>
            </View>
          </LinearGradient>
        )}
        {selected ? (
          <View style={styles.tileSelectedMark}>
            <Icon name="checkmark" size={15} color={colors.background} />
          </View>
        ) : null}
        {badge ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.tileMeta}>
        <Text numberOfLines={1} style={styles.tileTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.tileSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CharacterTile({
  name,
  subtitle,
  initials,
  palette,
  imageSource,
  onPress,
  selected,
}: {
  name: string;
  subtitle: string;
  initials: string;
  palette: readonly [string, string];
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${subtitle}, kurgusal karakter`}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.characterTile,
        selected && styles.characterTileSelected,
        pressed && styles.tilePressed,
      ]}
    >
      <LinearGradient colors={palette} style={styles.characterAvatar}>
        {imageSource ? (
          <>
            <Image fadeDuration={0} source={imageSource} style={styles.characterImage} />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <>
            <View style={styles.avatarHalo} />
            <Text style={styles.characterInitials}>{initials}</Text>
          </>
        )}
      </LinearGradient>
      <Text numberOfLines={1} style={styles.characterName}>
        {name}
      </Text>
      <Text numberOfLines={1} style={styles.characterSubtitle}>
        {subtitle}
      </Text>
      <View style={styles.aiLabel}>
        <Icon name="sparkles" size={10} color={colors.accentYellow} />
        <Text style={styles.aiLabelText}>Kurgusal</Text>
      </View>
    </Pressable>
  );
}

export function UploadTile({
  sourceUri,
  onPress,
  label = 'Fotoğraf seç',
}: {
  sourceUri?: string | null;
  onPress: () => void;
  label?: string;
}) {
  const [measuredSource, setMeasuredSource] = useState<{
    uri: string;
    aspectRatio: number;
  } | null>(null);
  const sourceAspectRatio =
    measuredSource && measuredSource.uri === sourceUri ? measuredSource.aspectRatio : null;
  const selectedAspectRatio = sourceAspectRatio
    ? Math.min(1.8, Math.max(0.72, sourceAspectRatio))
    : 4 / 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sourceUri ? 'Seçili kaynak fotoğrafı değiştir' : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.uploadTile,
        sourceUri ? [styles.uploadTileSelected, { aspectRatio: selectedAspectRatio }] : null,
        pressed && styles.tilePressed,
      ]}
    >
      {sourceUri ? (
        <Image
          source={{ uri: sourceUri }}
          style={styles.uploadImage}
          resizeMode="contain"
          onLoad={({ nativeEvent }) => {
            const { width, height } = nativeEvent.source;
            if (width > 0 && height > 0 && sourceUri) {
              setMeasuredSource({ uri: sourceUri, aspectRatio: width / height });
            }
          }}
        />
      ) : (
        <>
          <View style={styles.uploadIcon}>
            <Icon name="add" size={28} color={colors.textPrimary} />
          </View>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadHint}>JPEG, PNG veya WebP · en çok 15 MB</Text>
        </>
      )}
      {sourceUri ? (
        <View style={styles.uploadChange}>
          <Icon name="swap-horizontal" size={15} color={colors.textPrimary} />
          <Text style={styles.uploadChangeText}>Değiştir</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  detail,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={27} color={colors.accentYellow} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action ? (
        <PrimaryButton label={action} onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

export function Notice({
  tone = 'neutral',
  title,
  children,
}: PropsWithChildren<{ tone?: 'neutral' | 'warning' | 'success'; title?: string }>) {
  const toneColor =
    tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.accentPurple;
  return (
    <View style={[styles.notice, { borderColor: `${toneColor}66` }]}>
      <Icon
        name={
          tone === 'warning'
            ? 'information-circle'
            : tone === 'success'
              ? 'checkmark-circle'
              : 'sparkles'
        }
        size={18}
        color={toneColor}
      />
      <View style={styles.noticeBody}>
        {title ? <Text style={styles.noticeTitle}>{title}</Text> : null}
        <Text style={styles.noticeText}>{children}</Text>
      </View>
    </View>
  );
}

export function SettingRow({
  icon,
  title,
  detail,
  value,
  onPress,
  danger = false,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.textPrimary} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, danger && { color: colors.danger }]}>{title}</Text>
        {detail ? <Text style={styles.settingDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {onPress ? <Icon name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.settingRow}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function ToggleRow({
  icon,
  title,
  detail,
  value,
  onValueChange,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Icon name={icon} size={19} color={colors.textPrimary} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        {detail ? <Text style={styles.settingDetail}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceSoft, true: colors.accentPurple }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function ProgressSteps({
  current,
  total = 6,
  labels,
}: {
  current: number;
  total?: number;
  labels?: string[];
}) {
  const reducedMotion = useReducedMotion();
  const safeTotal = Math.max(1, Math.min(12, Math.floor(total)));
  const safeCurrent = Math.max(1, Math.min(safeTotal, Math.floor(current)));
  return (
    <View
      accessible
      accessibilityLabel={`Oluşturma adımı ${safeCurrent} / ${safeTotal}`}
      style={styles.progressArea}
    >
      <View style={styles.progressBars}>
        {Array.from({ length: safeTotal }).map((_, index) => (
          <AnimatedProgressSegment
            key={index}
            active={index < safeCurrent}
            current={index === safeCurrent - 1}
            reducedMotion={reducedMotion}
            delay={index * 65}
          />
        ))}
      </View>
      <View style={styles.progressCaption}>
        <Text style={styles.progressLabel}>
          Adım {safeCurrent} / {safeTotal}
        </Text>
        {labels?.[safeCurrent - 1] ? (
          <Text style={styles.progressStepName}>{labels[safeCurrent - 1]}</Text>
        ) : null}
      </View>
    </View>
  );
}

function AnimatedProgressSegment({
  active,
  current,
  reducedMotion,
  delay,
}: {
  active: boolean;
  current: boolean;
  reducedMotion: boolean;
  delay: number;
}) {
  const [fill] = useState(() => new Animated.Value(0));
  useEffect(() => {
    fill.stopAnimation();
    if (reducedMotion) {
      fill.setValue(active ? 1 : 0);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: active ? 1 : 0,
      duration: 520,
      delay: active ? delay : 0,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, delay, fill, reducedMotion]);
  return (
    <View style={[styles.progressSegment, current && styles.progressSegmentCurrent]}>
      <Animated.View
        style={[
          styles.progressSegmentFill,
          { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      >
        <LinearGradient
          colors={current ? ['#FFF5CD', '#FFC400'] : ['#C9BC96', '#9F8952']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.progressSegmentHighlight} />
      </Animated.View>
    </View>
  );
}

export function SourcePreview({
  sourceUri,
  label = 'Kaynak fotoğraf',
}: {
  sourceUri?: string | null;
  label?: string;
}) {
  if (sourceUri) {
    return (
      <Image
        source={{ uri: sourceUri } as ImageSourcePropType}
        accessibilityLabel={label}
        style={styles.sourcePreview}
        resizeMode="cover"
      />
    );
  }
  return (
    <LinearGradient colors={['#242424', '#111111']} style={styles.sourcePreview}>
      <View style={styles.sourcePlaceholderCircle}>
        <Icon name="person" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.sourcePlaceholderText}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenContent: { flex: 1, paddingHorizontal: layout.screenHorizontal, paddingTop: spacing.sm },
  scrollContent: {
    paddingHorizontal: layout.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: 36,
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  logoWithWordmark: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logoOuter: { alignItems: 'center', justifyContent: 'center' },
  logoImage: { height: '100%', resizeMode: 'contain', width: '100%' },
  wordmarkCopy: { flexShrink: 1 },
  wordmarkText: {
    color: '#F5D76D',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  wordmarkAi: { fontWeight: '300', letterSpacing: 0.3 },
  wordmarkCaption: { fontSize: 9, lineHeight: 13, color: '#92908A', marginTop: 1 },
  primaryButton: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.yellow,
  },
  primaryButtonText: { ...typography.label, color: colors.background, fontWeight: '800' },
  gradientButtonWrap: {
    overflow: 'hidden',
    borderRadius: radii.md,
    minHeight: layout.minTouchTarget,
  },
  gradientButton: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradientButtonText: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  secondaryButton: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { ...typography.label, color: colors.textPrimary },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  inputLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 50, color: colors.textPrimary, ...typography.body },
  inputWithLeftIcon: { marginLeft: 9 },
  inputWithRightAdornment: { paddingRight: 6 },
  passwordToggle: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  hintText: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  errorText: { ...typography.caption, color: colors.danger, marginTop: 6 },
  backButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  headerSurface: { marginBottom: spacing.md },
  header: {
    minHeight: 70,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCompact: { minHeight: 48, marginBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitleWrap: { flex: 1, marginLeft: 5 },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  headerRight: { marginLeft: spacing.sm },
  creditBadge: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  creditText: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  proInline: { ...typography.overline, fontSize: 9, color: colors.accentYellow, marginLeft: 2 },
  proBadge: {
    alignSelf: 'flex-start',
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proBadgeText: { ...typography.caption, color: colors.background, fontWeight: '900' },
  sectionHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionAction: { ...typography.label, color: colors.accentYellow },
  sectionArrow: { fontSize: 20, lineHeight: 20 },
  searchBar: {
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 46, ...typography.body, color: colors.textPrimary },
  chip: {
    minHeight: 42,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  chipPressable: { borderRadius: 22 },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  chipTextSelected: { color: colors.accentYellow },
  tileWrap: {
    width: 154,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileSelected: { borderColor: colors.accentYellow, borderWidth: 1.5 },
  tileSmall: { width: 124 },
  tileWide: { width: '100%' },
  tilePressed: { opacity: 0.83, transform: [{ scale: 0.985 }] },
  tileArt: { overflow: 'hidden', position: 'relative' },
  tileArtDefault: { height: 128 },
  // Filter assets are supplied in 4:5. Match that canvas so every portrait is
  // visible in the selectable card instead of only the top crop.
  tileArtPortrait: { aspectRatio: 4 / 5 },
  tileImageCanvas: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tileImage: { height: '100%', resizeMode: 'cover', width: '100%' },
  tileGradientArt: { justifyContent: 'flex-end', padding: 10 },
  tileGrain: { ...StyleSheet.absoluteFill, opacity: 0.18, backgroundColor: '#000' },
  tileGlowOne: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 92,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -32,
    right: -20,
  },
  tileGlowTwo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.20)',
    bottom: -42,
    left: -12,
  },
  tileIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tileIcon: { color: colors.textPrimary, fontSize: 25, fontWeight: '800' },
  tileSelectedMark: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    left: 9,
    position: 'absolute',
    top: 9,
    width: 28,
  },
  tileBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tileBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tileMeta: { padding: 10, minHeight: 54 },
  tileTitle: { ...typography.label, color: colors.textPrimary },
  tileSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  characterTile: {
    width: 132,
    padding: 9,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  characterTileSelected: {
    borderColor: colors.accentYellow,
    backgroundColor: colors.surfaceElevated,
  },
  characterAvatar: {
    height: 112,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: { height: '100%', resizeMode: 'cover', width: '100%' },
  avatarHalo: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 20,
    borderColor: 'rgba(255,255,255,0.14)',
    top: 20,
  },
  characterInitials: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  characterName: { ...typography.label, color: colors.textPrimary, marginTop: 9 },
  characterSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7 },
  aiLabelText: { ...typography.caption, fontSize: 10, color: colors.accentYellow },
  uploadTile: {
    minHeight: 250,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.lg,
  },
  uploadTileSelected: {
    minHeight: 0,
    padding: 0,
    backgroundColor: '#050505',
    borderStyle: 'solid',
  },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  uploadLabel: { ...typography.h3, color: colors.textPrimary },
  uploadHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 7 },
  uploadImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  uploadChange: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uploadChangeText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 25,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentYellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  emptyDetail: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
  },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.lg },
  notice: {
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeBody: { flex: 1 },
  noticeTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 2 },
  noticeText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  settingRow: {
    minHeight: 66,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSoft,
    marginHorizontal: -9,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  settingIconDanger: { backgroundColor: 'rgba(255,90,82,0.12)' },
  settingCopy: { flex: 1 },
  settingTitle: { ...typography.label, color: colors.textPrimary },
  settingDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  settingValue: { ...typography.caption, color: colors.textSecondary, marginRight: 7 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  progressArea: { marginVertical: spacing.sm },
  progressBars: { flexDirection: 'row', gap: 5 },
  progressSegment: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  progressSegmentFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressSegmentHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  progressSegmentCurrent: { borderColor: 'rgba(255,229,143,0.42)' },
  progressCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  progressLabel: { ...typography.caption, color: colors.accentYellow },
  progressStepName: { ...typography.caption, color: colors.textMuted },
  sourcePreview: {
    width: '100%',
    height: 210,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  sourcePlaceholderCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcePlaceholderText: { ...typography.caption, color: colors.textMuted, marginTop: 10 },
});
