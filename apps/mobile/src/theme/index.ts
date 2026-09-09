import { Platform } from 'react-native';

/** Shared visual tokens for BirKare AI's dark, photo-first interface. */
export const colors = {
  background: '#050505',
  surface: '#111111',
  surfaceElevated: '#191919',
  surfaceSoft: '#222222',
  surfaceSubtle: '#151515',
  textPrimary: '#FFFFFF',
  textSecondary: '#A7A7A7',
  textMuted: '#737373',
  accentYellow: '#FFC400',
  accentYellowSoft: 'rgba(255, 196, 0, 0.16)',
  accentPurple: '#7C3AED',
  accentPurpleSoft: 'rgba(124, 58, 237, 0.20)',
  accentPink: '#C83CF0',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF5A52',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.17)',
  overlay: 'rgba(0,0,0,0.58)',
  transparent: 'transparent'
} as const;

export const gradients = {
  primary: [colors.accentPurple, colors.accentPink, colors.accentYellow] as const,
  warm: ['#8B35E7', '#D545E6', '#FFC400'] as const,
  hero: ['#21122F', '#151515', '#563900'] as const,
  midnight: ['#13102A', '#111111', '#251B05'] as const,
  card: ['#181818', '#0D0D0D'] as const
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999
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
    textTransform: 'uppercase' as const
  }
} as const;

export const layout = {
  screenHorizontal: spacing.lg,
  bottomNavHeight: 72,
  minTouchTarget: 44,
  maxContentWidth: 680
} as const;

export const shadows = {
  yellow: Platform.select({
    ios: {
      shadowColor: colors.accentYellow,
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 }
    },
    android: { elevation: 8 },
    default: {}
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 7 }
    },
    android: { elevation: 6 },
    default: {}
  })
};

export const theme = { colors, gradients, spacing, radii, typography, layout, shadows };

export type AppTheme = typeof theme;
