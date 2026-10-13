import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { tr as translateCopy } from '@/i18n/engine';
import { useLanguageRevision } from '@/i18n/use-language';
import { brand } from '@/theme/brand';
import {
  BackNav,
  BrandNav,
  CreditBadge,
  Group,
  InfoNote,
  Page,
  PageTitle,
  Row,
  SectionLabel,
  Separator,
  StatusPill,
  type IconName,
} from '@/ui/kit';

type Tone = 'gold' | 'iridescent' | 'neutral';
type Accent = 'gold' | 'purple';

/**
 * Icon colour names accepted by rows. The design uses one gold icon style in
 * a dark well, so every name resolves to the same treatment; the names stay
 * so call sites remain descriptive.
 */
export const settingsIconColors = {
  gold: brand.gold,
  blue: brand.gold,
  indigo: brand.gold,
  green: brand.success,
  orange: brand.warning,
  red: brand.danger,
  pink: brand.gold,
  teal: brand.gold,
  gray: brand.textSecondary,
  purple: brand.gold,
} as const;

export type SettingsIconColor = keyof typeof settingsIconColors;

/**
 * Page shell for account, settings, legal and support screens. Tab roots pass
 * `back={false}` and get the brand row with the credit balance; pushed
 * screens get a gold back link naming where it leads.
 */
export function SettingsPage({
  title,
  subtitle,
  children,
  credits,
  back = true,
  backLabel,
  backFallback = '/(tabs)/profile',
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  credits?: number | string;
  back?: boolean;
  /** Name of the screen the back link returns to. */
  backLabel?: string;
  backFallback?: string;
  /** @deprecated Kept so existing call sites compile; it has no effect. */
  navigation?: boolean;
}>) {
  const languageRevision = useLanguageRevision();
  const router = useRouter();

  return (
    <Page>
      {back ? (
        <BackNav
          accessibilityLabel={translateCopy('Geri')}
          fallback={backFallback}
          label={backLabel ?? translateCopy('Geri')}
        />
      ) : (
        <BrandNav
          trailing={
            typeof credits === 'number' ? (
              <CreditBadge
                accessibilityLabel={translateCopy('{{p0}} kredi', { p0: credits })}
                amount={credits}
                onPress={() => router.push('/(tabs)/credits' as never)}
              />
            ) : undefined
          }
        />
      )}
      <PageTitle subtitle={subtitle} title={title} />
      {children}
    </Page>
  );
}

/** iOS system colours (dark appearance) used behind the row glyphs. */
const systemTints = {
  blue: '#0A84FF',
  green: '#30D158',
  indigo: '#5E5CE6',
  orange: '#FF9F0A',
  pink: '#FF375F',
  purple: '#BF5AF2',
  red: '#FF453A',
  teal: '#40C8E0',
  gray: '#8E8E93',
} as const;

const tintByIcon: Record<string, string> = {
  flash: systemTints.orange,
  time: systemTints.indigo,
  storefront: systemTints.pink,
  options: systemTints.gray,
  layers: systemTints.indigo,
  language: systemTints.blue,
  notifications: systemTints.red,
  person: systemTints.blue,
  key: systemTints.gray,
  'shield-checkmark': systemTints.green,
  receipt: systemTints.teal,
  'help-circle': systemTints.blue,
  'document-text': systemTints.gray,
  'lock-closed': systemTints.blue,
  ribbon: systemTints.purple,
  mail: systemTints.blue,
  'chatbubble-ellipses': systemTints.green,
  trash: systemTints.red,
  download: systemTints.teal,
  diamond: systemTints.purple,
  folder: systemTints.blue,
  refresh: systemTints.green,
};

function iconKey(icon: IconName): string {
  return String(icon).replace(/-outline$/, '');
}

function rowTint(icon: IconName): string {
  return tintByIcon[iconKey(icon)] ?? systemTints.gray;
}

/** White glyphs on a colour read better filled than outlined. */
function filledIcon(icon: IconName): IconName {
  return iconKey(icon) as IconName;
}

/** Bordered list group. `tone` is accepted for compatibility only. */
export function GlassSettingsPanel({
  children,
  style,
}: PropsWithChildren<{
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}>) {
  return <Group style={style}>{children}</Group>;
}

/** Explanatory block at the top of a settings page. */
export function GlassSettingsHero({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description?: string;
  tone?: Tone;
  color?: SettingsIconColor;
}) {
  return (
    <InfoNote icon={icon} title={title}>
      {description ?? ''}
    </InfoNote>
  );
}

/** Account summary: initials, name, email and an optional status pill. */
export function SettingsAccountCard({
  initials,
  name,
  email,
  caption,
  verified,
  onPress,
}: {
  initials: string;
  name: string;
  email?: string;
  caption?: string;
  /** When set, shows the caption as a status pill in success or neutral tone. */
  verified?: boolean;
  onPress?: () => void;
}) {
  const languageRevision = useLanguageRevision();

  const content = (
    <>
      <View style={styles.accountTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.accountCopy}>
          <Text numberOfLines={1} style={styles.accountName}>
            {name}
          </Text>
          {email ? (
            <Text numberOfLines={1} style={styles.accountEmail}>
              {email}
            </Text>
          ) : null}
        </View>
        {onPress ? <Ionicons color={brand.textMuted} name="chevron-forward" size={18} /> : null}
      </View>
      {caption ? (
        verified === undefined ? (
          <Text style={styles.accountCaption}>{caption}</Text>
        ) : (
          <StatusPill
            icon={verified ? 'checkmark-circle-outline' : 'time-outline'}
            tone={verified ? 'success' : 'neutral'}
          >
            {caption}
          </StatusPill>
        )
      ) : null}
    </>
  );
  if (!onPress) return <Group>{content}</Group>;
  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Group>{content}</Group>
    </Pressable>
  );
}

export function GlassSettingsRow({
  icon,
  title,
  detail,
  value,
  onPress,
  danger = false,
  disabled = false,
  trailing,
  last = false,
  external = false,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  last?: boolean;
  accent?: Accent;
  color?: SettingsIconColor;
  /** Shows an outward arrow for links that leave the app. */
  external?: boolean;
}) {
  return (
    <>
      <Row
        danger={danger}
        detail={detail}
        disabled={disabled}
        external={external}
        icon={danger ? icon : filledIcon(icon)}
        iconTint={danger ? systemTints.red : rowTint(icon)}
        onPress={onPress}
        title={title}
        trailing={trailing}
        value={value}
      />
      {last ? null : <Separator />}
    </>
  );
}

export function SettingsSectionTitle({ children }: PropsWithChildren) {
  return <SectionLabel>{sentenceCase(children)}</SectionLabel>;
}

/** Explanatory footer text placed under a group. */
export function SettingsNote({
  children,
  warning = false,
}: PropsWithChildren<{ warning?: boolean }>) {
  return (
    <View style={styles.note}>
      {warning ? (
        <Ionicons color={brand.warning} name="information-circle-outline" size={16} />
      ) : null}
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

/**
 * Section titles were written in capitals for the previous style. The design
 * uses sentence case, so capitals are folded here instead of in every string.
 */
function sentenceCase(node: ReactNode): ReactNode {
  if (typeof node !== 'string' || node !== node.toLocaleUpperCase('tr-TR')) return node;
  const lower = node.toLocaleLowerCase('tr-TR');
  return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
}

const styles = StyleSheet.create({
  accountTop: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: { color: brand.gold, fontSize: 18, fontWeight: '700' },
  accountCopy: { flex: 1, gap: 3, minWidth: 0 },
  accountName: { color: brand.text, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  accountEmail: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  accountCaption: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  note: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: -8 },
  noteText: { color: brand.textSecondary, flex: 1, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.65 },
});
