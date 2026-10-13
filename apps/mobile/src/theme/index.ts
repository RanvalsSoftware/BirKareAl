import { Platform } from 'react-native';

/** Shared visual tokens for BirKare Studio's dark, gold-accented interface. */
export const colors = {
  background: '#0A0906',
  surface: '#141108',
  surfaceElevated: '#1B170B',
  surfaceSoft: '#241E0E',
  surfaceSubtle: '#141108',
  textPrimary: '#F7F3E8',
  textSecondary: '#B3AC9A',
  textMuted: '#7A7260',
  accentYellow: '#F5C132',
  accentYellowSoft: 'rgba(245, 193, 50, 0.16)',
  accentPurple: '#C48A0A',
  accentPurpleSoft: 'rgba(196, 138, 10, 0.20)',
  accentPink: '#FFE27A',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF5A52',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.17)',
  overlay: 'rgba(0,0,0,0.58)',
  transparent: 'transparent',
} as const;

export const gradients = {
  primary: [colors.accentPurple, colors.accentPink, colors.accentYellow] as const,
  warm: ['#C48A0A', '#F5C132', '#FFE27A'] as const,
  hero: ['#1A1508', '#0A0906', '#2A2210'] as const,
  midnight: ['#120F06', '#0A0906', '#241E0E'] as const,
  card: ['#181818', '#0D0D0D'] as const,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 38, lineHeight: 44, fontWeight: '800' as const },
  h1: { fontSize: 31, lineHeight: 37, fontWeight: '800' as const },
  h2: { fontSize: 25, lineHeight: 31, fontWeight: '700' as const },
  h3: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
  overline: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

export const layout = {
  screenHorizontal: spacing.lg,
  bottomNavHeight: 72,
  minTouchTarget: 44,
  maxContentWidth: 680,
} as const;

export const shadows = {
  yellow: Platform.select({
    ios: {
      shadowColor: colors.accentYellow,
      shadowOpacity: 0,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 0 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 0 },
    default: {},
  }),
};

export const theme = { colors, gradients, spacing, radii, typography, layout, shadows };

export type AppTheme = typeof theme;
