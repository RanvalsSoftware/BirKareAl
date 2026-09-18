import * as Haptics from 'expo-haptics';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppleGlassButton, BackButton, Icon, PrimaryButton, ProgressSteps } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { colors, radii, spacing, typography } from '@/theme';

const stepLabels = ['Kaynak', 'Düzenle', 'Oluştur'];

export function CreateHeader({
  title,
  subtitle,
  step,
  total = 3,
  fallback,
}: {
  title: string;
  subtitle?: string;
  step?: number;
  total?: number;
  fallback?: string;
}) {
  return (
    <>
      <View style={styles.top}>
        <BackButton fallback={fallback} />
        <View style={styles.topTitle}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {step ? <ProgressSteps current={step} total={total} labels={stepLabels} /> : null}
    </>
  );
}

export function WizardFooter({
  label = 'Devam et',
  onPress,
  disabled,
  loading,
  gradient = true,
  hint,
}: {
  label?: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  gradient?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.footer}>
      {hint ? <Text style={styles.footerHint}>{hint}</Text> : null}
      {gradient ? (
        <AppleGlassButton label={label} onPress={onPress} disabled={disabled} loading={loading} />
      ) : (
        <PrimaryButton
          label={label}
          onPress={onPress}
          disabled={disabled}
          loading={loading}
          icon="arrow-forward"
        />
      )}
    </View>
  );
}

export function CreateSegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[];
}) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segmentedControl, stacked && styles.segmentedControlStacked]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              stacked && styles.segmentStacked,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
            ]}
          >
            <GlassSurface
              pointerEvents="none"
              radius={radii.pill}
              selected={selected}
              tone="gold"
              glow={false}
              style={StyleSheet.absoluteFill}
            />
            <Icon
              name={option.icon}
              size={18}
              color={selected ? colors.accentYellow : colors.textSecondary}
            />
            <Text
              numberOfLines={2}
              style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoiceCard({
  title,
  description,
  icon,
  selected,
  onPress,
  palette,
  badge,
  style,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  selected?: boolean;
  onPress: () => void;
  palette?: readonly [string, string];
  badge?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${description}`}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        selected && styles.choiceCardSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <GlassSurface
        pointerEvents="none"
        radius={radii.lg}
        selected={selected}
        tone="gold"
        glow={false}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.choiceReflection, selected && styles.choiceReflectionSelected]}
      />
      {palette ? (
        <LinearGradient colors={palette} style={styles.choiceIcon}>
          <Icon name={icon} size={23} />
        </LinearGradient>
      ) : (
        <View style={styles.choiceIcon}>
          <Icon name={icon} size={23} color={selected ? colors.accentYellow : colors.textPrimary} />
        </View>
      )}
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceDescription}>{description}</Text>
      </View>
      {badge ? (
        <View style={styles.choiceBadge}>
          <Text style={styles.choiceBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export function MiniChoice({
  label,
  selected,
  onPress,
  caption,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  caption?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniChoice,
        selected && styles.miniChoiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <GlassSurface
        pointerEvents="none"
        radius={radii.md}
        selected={selected}
        tone="gold"
        glow={false}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.miniChoiceLabel, selected && styles.miniChoiceLabelSelected]}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.miniChoiceCaption, selected && styles.miniChoiceCaptionSelected]}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 54, marginTop: spacing.xs },
  topTitle: { flex: 1, marginLeft: 8 },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  footer: { marginTop: spacing.xl, paddingTop: spacing.sm },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.988 }] },
  segmentedControl: {
    minHeight: 60,
    padding: 4,
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    overflow: 'hidden',
  },
  segmentedControlStacked: {
    borderRadius: radii.lg,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 7,
    borderRadius: radii.pill,
    borderWidth: 0,
    backgroundColor: 'rgba(8,8,10,0.76)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  segmentStacked: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  segmentSelected: {
    shadowColor: colors.accentYellow,
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  segmentPressed: { opacity: 0.78, transform: [{ scale: 0.975 }] },
  segmentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  segmentLabelSelected: { color: colors.accentYellow },
  choiceCard: {
    minHeight: 88,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 0,
    backgroundColor: 'rgba(24,24,28,0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    overflow: 'hidden',
  },
  choiceCardSelected: {
    backgroundColor: 'rgba(255,196,0,0.035)',
    shadowColor: colors.accentYellow,
    shadowOpacity: 0.22,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  choiceReflection: {
    position: 'absolute',
    top: 0,
    left: 11,
    right: 11,
    height: 1,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  choiceReflectionSelected: { backgroundColor: 'rgba(255,255,255,0.35)' },
  choiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  choiceCopy: { flex: 1 },
  choiceTitle: { ...typography.label, color: colors.textPrimary },
  choiceDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  choiceBadge: {
    position: 'absolute',
    top: 8,
    right: 35,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accentPurpleSoft,
  },
  choiceBadgeText: { ...typography.caption, color: '#D2BCFF', fontSize: 10, fontWeight: '800' },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accentYellow },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accentYellow },
  miniChoice: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 0,
    backgroundColor: 'rgba(24,24,28,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniChoiceSelected: {
    backgroundColor: 'rgba(255,196,0,0.035)',
  },
  miniChoiceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  miniChoiceLabelSelected: { color: colors.accentYellow },
  miniChoiceCaption: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  miniChoiceCaptionSelected: { color: colors.textSecondary },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: 9,
  },
});
