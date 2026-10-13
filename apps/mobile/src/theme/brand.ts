/**
 * BirKare Studio brand palette: the gold of the logo on a near-black,
 * warm-tinted canvas. Every screen that needs the accent colour reads it from
 * here so the splash, authentication, settings and studio screens stay in one
 * visual language.
 */
export const brand = {
  /** Primary accent: buttons, selected states, glows. Sampled from the logo. */
  gold: '#F5C132',
  /** Lighter accent for text on dark surfaces. */
  goldLight: '#FFE27A',
  /** Darker accent for pressed states and gradient ends. */
  goldDeep: '#C48A0A',
  /** Text and icons placed on top of the gold accent. */
  onGold: '#1C1300',
  /** Translucent gold tints. */
  goldTint: 'rgba(245,193,50,0.14)',
  goldBorder: '#2C2B28',
  goldGlow: 'transparent',
  /** Canvas tones. */
  background: '#0A0906',
  surface: '#141108',
  surfaceRaised: '#1B170B',
  surfaceSoft: '#241E0E',
  /** Hairline around groups and between rows. */
  line: '#2C2B28',
  /** Separators on dark surfaces. */
  border: 'rgba(255,255,255,0.11)',
  borderSoft: 'rgba(255,255,255,0.07)',
  /** Text tones. */
  text: '#F7F3E8',
  textSecondary: '#B3AC9A',
  textMuted: '#7A7260',
  /** Status tones. */
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
} as const;

/** Gradient stops shared by the primary buttons and the logo glow. */
export const brandGradients = {
  button: [brand.goldLight, brand.gold, brand.goldDeep] as const,
  glow: ['#FFF0B0', brand.gold, '#8A6008', 'transparent'] as const,
} as const;
