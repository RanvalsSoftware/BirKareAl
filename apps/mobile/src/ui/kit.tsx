import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { brand } from '@/theme/brand';

/**
 * BirKare Studio interface kit. Every screen is assembled from these pieces
 * so spacing, type and surfaces match the design file: a quiet dark canvas,
 * hairline-bordered groups, one gold action per screen.
 */

export type IconName = ComponentProps<typeof Ionicons>['name'];

const logoMark = require('../../assets/brand/logo-mark-640.png');

export const ui = {
  gutter: 22,
  gap: 20,
  groupRadius: 20,
  controlRadius: 14,
  controlHeight: 52,
  line: brand.line,
} as const;

/** Width at which a screen is treated as a tablet-class (regular) layout. */
export const WIDE_BREAKPOINT = 744;
const READING_WIDTH = 680;
const WORKSPACE_WIDTH = 1120;

/**
 * Layout facts for the current window. `wide` is true on iPad in full screen
 * and in the larger multitasking sizes; a narrow Split View window falls back
 * to the phone layout.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  return { width, height, wide, landscape: width > height, gutter: wide ? 32 : ui.gutter };
}

export function Page({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  contentStyle,
  footer,
  width = 'reading',
}: PropsWithChildren<{
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned below the scroll area, above the home indicator. */
  footer?: ReactNode;
  /**
   * `reading` keeps text and lists at a comfortable measure. `workspace`
   * lets tool screens use the full tablet canvas for multi-column layouts.
   */
  width?: 'reading' | 'workspace';
}>) {
  const { gutter, wide } = useLayout();
  const maxWidth = width === 'workspace' ? WORKSPACE_WIDTH : READING_WIDTH;
  const padding = { paddingHorizontal: gutter };
  return (
    <SafeAreaView edges={footer ? [...edges, 'bottom'] : edges} style={styles.safe}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            padding,
            wide && styles.contentWide,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.column, { maxWidth }]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, padding, contentStyle]}>
          <View style={[styles.column, styles.fill, { maxWidth }]}>{children}</View>
        </View>
      )}
      {footer ? (
        <View style={[styles.footer, padding, { maxWidth: maxWidth + gutter * 2 }]}>
          <View style={wide ? styles.footerWide : styles.footerNarrow}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Two columns on a wide window, a single stacked column otherwise. Use it for
 * a persistent preview or summary next to the controls that change it.
 */
export function Split({
  leading,
  trailing,
  leadingFlex = 1,
  trailingFlex = 1,
}: {
  leading: ReactNode;
  trailing: ReactNode;
  leadingFlex?: number;
  trailingFlex?: number;
}) {
  const { wide } = useLayout();
  if (!wide)
    return (
      <>
        {leading}
        {trailing}
      </>
    );
  return (
    <View style={styles.split}>
      <View style={[styles.splitColumn, { flex: leadingFlex }]}>{leading}</View>
      <View style={[styles.splitColumn, { flex: trailingFlex }]}>{trailing}</View>
    </View>
  );
}

/** Top row of the tab screens: brand on the left, one optional control on the right. */
export function BrandNav({ credits, trailing }: { credits?: string | null; trailing?: ReactNode }) {
  return (
    <View style={styles.nav}>
      <View style={styles.brand}>
        <Image accessibilityIgnoresInvertColors source={logoMark} style={styles.brandMark} />
        <Text style={styles.brandName}>BirKare Studio</Text>
      </View>
      {trailing ?? (credits ? <StatusPill>{credits}</StatusPill> : null)}
    </View>
  );
}

/**
 * Top of a tab screen: one large title, an optional line under it and at most
 * one trailing control. The tab bar already says which app this is, so the
 * header spends its space on where the person is.
 */
export function TabHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.tabHeader}>
      <View style={styles.tabHeaderCopy}>
        <Text accessibilityRole="header" style={styles.tabHeaderTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.tabHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

/** The balance as a control: shows the credit count and opens the credits tab. */
export function CreditBadge({
  amount,
  accessibilityLabel,
  onPress,
}: {
  amount: number;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.creditBadge, pressed && styles.pressed]}
    >
      <Ionicons color={brand.gold} name="flash" size={15} />
      <Text style={styles.creditBadgeText}>{amount}</Text>
    </Pressable>
  );
}

/** Top row of pushed screens: a gold back link and an optional step counter. */
export function BackNav({
  label,
  trailing,
  fallback = '/(tabs)/home',
  accessibilityLabel,
  onPress,
}: {
  label: string;
  trailing?: ReactNode;
  fallback?: string;
  accessibilityLabel?: string;
  /** Overrides the default "go back" behaviour, for in-screen steps. */
  onPress?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        hitSlop={10}
        onPress={
          onPress ??
          (() => (router.canGoBack() ? router.back() : router.replace(fallback as never)))
        }
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons color={brand.gold} name="chevron-back" size={20} />
        <Text numberOfLines={1} style={styles.backLabel}>
          {label}
        </Text>
      </Pressable>
      {typeof trailing === 'string' ? <Text style={styles.navMeta}>{trailing}</Text> : trailing}
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children, trailing }: PropsWithChildren<{ trailing?: string }>) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {trailing ? <Text style={styles.sectionMeta}>{trailing}</Text> : null}
    </View>
  );
}

export function Group({
  children,
  padding = 16,
  selected = false,
  style,
}: PropsWithChildren<{ padding?: number; selected?: boolean; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.group, { padding }, selected && styles.groupSelected, style]}>
      {children}
    </View>
  );
}

export function Separator() {
  return <View style={styles.separator} />;
}

export function IconWell({
  name,
  danger = false,
  size = 32,
  tint,
}: {
  name: IconName;
  danger?: boolean;
  size?: number;
  /** A solid system colour behind a white glyph, as in the Settings app. */
  tint?: string;
}) {
  return (
    <View
      style={[styles.well, { height: size, width: size }, tint ? { backgroundColor: tint } : null]}
    >
      <Ionicons
        color={tint ? '#FFFFFF' : danger ? brand.danger : brand.gold}
        name={name}
        size={Math.round(size * 0.56)}
      />
    </View>
  );
}

/** A list row: icon well, title, optional detail, then a value, switch or chevron. */
export function Row({
  icon,
  title,
  detail,
  value,
  trailing,
  onPress,
  danger = false,
  disabled = false,
  external = false,
  leading,
  iconTint,
}: {
  icon?: IconName;
  iconTint?: string;
  title: string;
  detail?: string;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  external?: boolean;
  leading?: ReactNode;
}) {
  const body = (
    <>
      {leading ?? (icon ? <IconWell danger={danger} name={icon} tint={iconTint} /> : null)}
      <View style={styles.rowCopy}>
        <Text numberOfLines={2} style={[styles.rowTitle, danger && styles.danger]}>
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={3} style={styles.rowDetail}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <>
          {value ? (
            <Text numberOfLines={1} style={styles.rowValue}>
              {value}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons
              color={brand.textMuted}
              name={external ? 'open-outline' : 'chevron-forward'}
              size={external ? 16 : 18}
            />
          ) : null}
        </>
      )}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityLabel={title}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {body}
    </Pressable>
  );
}

export function StatusPill({
  children,
  tone = 'gold',
  icon,
}: PropsWithChildren<{ tone?: 'gold' | 'success' | 'neutral'; icon?: IconName }>) {
  const color =
    tone === 'success' ? brand.success : tone === 'neutral' ? brand.textSecondary : brand.goldLight;
  return (
    <View style={styles.pill}>
      {icon ? <Ionicons color={color} name={icon} size={13} /> : null}
      <Text numberOfLines={1} style={[styles.pillText, { color }]}>
        {children}
      </Text>
    </View>
  );
}

type ActionProps = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

function ActionBase({
  label,
  onPress,
  icon,
  trailingIcon,
  disabled = false,
  loading = false,
  loadingLabel,
  accessibilityHint,
  style,
  surface,
  textStyle,
  iconColor,
}: ActionProps & {
  surface: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  iconColor: string;
}) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        surface,
        pressed && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
    >
      {icon && !loading ? <Ionicons color={iconColor} name={icon} size={20} /> : null}
      <Text numberOfLines={1} style={[styles.actionText, textStyle]}>
        {loading ? (loadingLabel ?? label) : label}
      </Text>
      {trailingIcon && !loading ? (
        <Ionicons color={iconColor} name={trailingIcon} size={18} />
      ) : null}
    </Pressable>
  );
}

/** The single gold action of a screen. */
export function PrimaryAction(props: ActionProps) {
  return (
    <ActionBase
      {...props}
      iconColor={brand.onGold}
      surface={styles.actionPrimary}
      textStyle={styles.actionPrimaryText}
    />
  );
}

export function SecondaryAction(props: ActionProps & { danger?: boolean }) {
  return (
    <ActionBase
      {...props}
      iconColor={props.danger ? brand.danger : brand.gold}
      surface={styles.actionSecondary}
      textStyle={props.danger ? styles.danger : styles.actionSecondaryText}
    />
  );
}

/** A quiet informational block: icon, bold title, body. */
export function InfoNote({
  title,
  children,
  icon = 'information-circle-outline',
  tone = 'gold',
}: PropsWithChildren<{ title?: string; icon?: IconName; tone?: 'gold' | 'warning' | 'danger' }>) {
  const color = tone === 'danger' ? brand.danger : tone === 'warning' ? brand.warning : brand.gold;
  return (
    <View style={styles.note}>
      <Ionicons color={color} name={icon} size={18} style={styles.noteIcon} />
      <View style={styles.rowCopy}>
        {title ? <Text style={styles.noteTitle}>{title}</Text> : null}
        <Text style={styles.noteBody}>{children}</Text>
      </View>
    </View>
  );
}

/** A labelled text input on the standard surface. */
export function TextField({
  label,
  hint,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={brand.textMuted}
        selectionColor={brand.gold}
        {...input}
        style={[styles.fieldInput, input.multiline && styles.fieldInputMultiline, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Small helper text placed under a control or group. */
export function Hint({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.hint, style]}>{children}</Text>;
}

/** Selection mark used on option cards and language rows. */
export function SelectionMark({ selected }: { selected: boolean }) {
  return selected ? (
    <Ionicons color={brand.gold} name="checkmark-circle-outline" size={22} />
  ) : (
    <View style={styles.radio} />
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: brand.background, flex: 1 },
  fill: { flex: 1 },
  content: { paddingBottom: 24 },
  contentWide: { paddingBottom: 40, paddingTop: 8 },
  column: { alignSelf: 'center', gap: ui.gap, width: '100%' },
  footer: { alignSelf: 'center', paddingBottom: 8, paddingTop: 10, width: '100%' },
  footerNarrow: { gap: 10 },
  // On a tablet a full-width button reads as a banner; keep actions button-sized.
  footerWide: { alignSelf: 'flex-end', gap: 10, minWidth: 360 },
  split: { alignItems: 'flex-start', flexDirection: 'row', gap: 32 },
  splitColumn: { gap: ui.gap, minWidth: 0 },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -10,
    minHeight: 60,
  },
  tabHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  tabHeaderCopy: { flex: 1, gap: 4, minWidth: 0 },
  tabHeaderTitle: { color: brand.text, fontSize: 34, fontWeight: '700', lineHeight: 41 },
  tabHeaderSubtitle: { color: brand.textSecondary, fontSize: 15, lineHeight: 20 },
  creditBadge: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 100,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 13,
  },
  creditBadgeText: {
    color: brand.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  brand: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 9 },
  brandMark: { height: 32, width: 32 },
  brandName: { color: brand.text, fontSize: 16, fontWeight: '600' },
  back: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 4,
    marginLeft: -4,
    minHeight: 44,
  },
  backLabel: { color: brand.gold, flexShrink: 1, fontSize: 16 },
  navMeta: { color: brand.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  titleBlock: { gap: 8 },
  title: { color: brand.text, fontSize: 32, fontWeight: '700', lineHeight: 36 },
  subtitle: { color: brand.textSecondary, fontSize: 16, lineHeight: 22 },
  sectionRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -8,
  },
  sectionLabel: { color: brand.textSecondary, fontSize: 13, fontWeight: '600' },
  sectionMeta: { color: brand.textSecondary, fontSize: 13 },
  group: {
    backgroundColor: brand.surface,
    borderColor: 'transparent',
    borderRadius: ui.groupRadius,
    borderWidth: 1.5,
    gap: 10,
    overflow: 'hidden',
  },
  groupSelected: { borderColor: brand.gold },
  separator: { backgroundColor: brand.line, height: StyleSheet.hairlineWidth * 2 },
  well: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 9,
    justifyContent: 'center',
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52 },
  rowCopy: { flex: 1, gap: 3, minWidth: 0 },
  rowTitle: { color: brand.text, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  rowDetail: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  rowValue: {
    color: brand.textSecondary,
    flexShrink: 1,
    fontSize: 13,
    maxWidth: 150,
    textAlign: 'right',
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 100,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontSize: 12, fontWeight: '500' },
  action: {
    alignItems: 'center',
    borderRadius: ui.controlRadius,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: ui.controlHeight,
    paddingHorizontal: 16,
  },
  actionPrimary: { backgroundColor: brand.gold },
  actionSecondary: { backgroundColor: brand.surfaceSoft },
  actionText: { flexShrink: 1, fontSize: 16, fontWeight: '600' },
  actionPrimaryText: { color: brand.onGold },
  actionSecondaryText: { color: brand.text },
  note: {
    alignItems: 'flex-start',
    backgroundColor: brand.surfaceRaised,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  noteIcon: { marginTop: 1 },
  noteTitle: { color: brand.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  noteBody: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  hint: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  field: { gap: 8 },
  fieldInput: {
    backgroundColor: brand.surface,
    borderRadius: ui.controlRadius,
    color: brand.text,
    fontSize: 17,
    minHeight: ui.controlHeight,
    paddingHorizontal: 16,
  },
  fieldInputMultiline: { minHeight: 96, paddingVertical: 14, textAlignVertical: 'top' },
  radio: {
    borderColor: brand.textMuted,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    width: 20,
  },
  danger: { color: brand.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
