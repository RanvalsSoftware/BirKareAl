import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppHeader, CreditBadge, GlassSurface, Icon, Screen } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { SettingsTabFooter } from './settings-tab-footer';

type IconName = ComponentProps<typeof Icon>['name'];
type Tone = 'gold' | 'iridescent' | 'neutral';

export function SettingsPage({
  title,
  subtitle,
  children,
  credits,
  back = true,
  navigation = back,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  credits?: number | string;
  back?: boolean;
  navigation?: boolean;
}>) {
  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={[styles.page, navigation && styles.pageWithNavigation]}>
        <AppHeader
          back={back}
          title={title}
          subtitle={subtitle}
          right={credits === undefined ? undefined : <CreditBadge credits={credits} />}
        />
        {children}
      </Screen>
      {navigation ? <SettingsTabFooter /> : null}
    </View>
  );
}

export function GlassSettingsPanel({
  children,
  tone = 'iridescent',
  style,
}: PropsWithChildren<{
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <GlassSurface
      radius={25}
      tone={tone}
      glow={false}
      style={[styles.panel, style]}
      contentStyle={styles.panelContent}
    >
      {children}
    </GlassSurface>
  );
}

export function GlassSettingsHero({
  icon,
  title,
  description,
  tone = 'gold',
}: {
  icon: IconName;
  title: string;
  description?: string;
  tone?: Tone;
}) {
  return (
    <GlassSurface radius={27} tone={tone} style={styles.hero} contentStyle={styles.heroContent}>
      <GlassSurface
        radius={999}
        tone={tone}
        selected={tone === 'gold'}
        style={styles.heroIcon}
        contentStyle={styles.center}
      >
        <Icon name={icon} size={27} color={tone === 'gold' ? colors.accentYellow : '#C8A4F1'} />
      </GlassSurface>
      <View style={styles.copy}>
        <Text style={styles.heroTitle}>{title}</Text>
        {description ? <Text style={styles.heroDescription}>{description}</Text> : null}
      </View>
    </GlassSurface>
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
  accent = 'gold',
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
  accent?: 'gold' | 'purple';
}) {
  const accentColor = danger ? '#FF786C' : accent === 'gold' ? colors.accentYellow : '#C0A1EA';
  const content = (
    <>
      <GlassSurface
        radius={14}
        tone={accent === 'purple' ? 'iridescent' : 'gold'}
        glow={false}
        style={styles.rowIcon}
        contentStyle={styles.center}
      >
        <Icon name={icon} size={20} color={accentColor} />
      </GlassSurface>
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, danger && styles.danger]}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {trailing ?? (
        <>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? (
            <Icon name="chevron-forward" size={17} color={disabled ? '#505054' : '#929095'} />
          ) : null}
        </>
      )}
    </>
  );
  if (!onPress) return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsSectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function SettingsNote({
  children,
  warning = false,
}: PropsWithChildren<{ warning?: boolean }>) {
  return (
    <GlassSurface
      tone={warning ? 'gold' : 'iridescent'}
      radius={20}
      glow={false}
      style={styles.note}
      contentStyle={styles.noteContent}
    >
      <Icon
        name={warning ? 'information-circle-outline' : 'shield-checkmark-outline'}
        color={warning ? colors.accentYellow : '#B69BD7'}
        size={20}
      />
      <Text style={styles.noteText}>{children}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  page: { paddingBottom: 42 },
  pageWithNavigation: { paddingBottom: 28 },
  panel: { marginBottom: 14 },
  panelContent: { paddingHorizontal: 13, paddingVertical: 3 },
  hero: { marginTop: 6, marginBottom: 20 },
  heroContent: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: { width: 53, height: 53, borderRadius: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  heroTitle: { ...typography.h3, color: colors.textPrimary },
  heroDescription: { ...typography.caption, color: '#ACAAAE', lineHeight: 19, marginTop: 5 },
  row: { minHeight: 71, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBorder: {
    borderBottomColor: 'rgba(255,255,255,0.075)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 39, height: 39 },
  rowTitle: { fontSize: 15, lineHeight: 21, color: '#F7F6F8', fontWeight: '600' },
  rowDetail: { fontSize: 11, lineHeight: 17, color: '#939198', marginTop: 2 },
  rowValue: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B8B5BE',
    flexShrink: 1,
    maxWidth: 90,
    textAlign: 'right',
  },
  sectionTitle: {
    ...typography.overline,
    color: '#ADAAA2',
    marginTop: 13,
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  danger: { color: '#FF8E83' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
  note: { marginTop: 7, marginBottom: spacing.md },
  noteContent: { padding: 15, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { ...typography.caption, flex: 1, color: '#AAA7B0', lineHeight: 19 },
});
