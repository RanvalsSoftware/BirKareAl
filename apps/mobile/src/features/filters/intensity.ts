/** Shared by the filter detail, editor and local preview. Never starts a paid generation. */
export const FILTER_INTENSITIES = [
  { label: 'Düşük', value: 25 },
  { label: 'Orta', value: 60 },
  { label: 'Yüksek', value: 100 },
] as const;

export function clampFilterIntensity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 60;
}

export function nearestIntensityValue(value: number): number {
  const bounded = clampFilterIntensity(value);
  return FILTER_INTENSITIES.reduce(
    (closest, item) =>
      Math.abs(item.value - bounded) < Math.abs(closest - bounded) ? item.value : closest,
    Number(FILTER_INTENSITIES[0].value),
  );
}

/** A perceptual ramp: low is genuinely subtle; high is the complete local tone treatment. */
export function filterPreviewStrength(value: number): number {
  return Math.pow(clampFilterIntensity(value) / 100, 1.35);
}

type ToneProfile = {
  tint: [string, string, string];
  tintOpacity: number;
  light: string;
  lightOpacity: number;
  shadowOpacity: number;
  monochrome?: boolean;
};

const PROFILES: Record<string, ToneProfile> = {
  natural: {
    tint: ['#FFF3D8', '#FAEBCD', '#E3EEE7'],
    tintOpacity: 0.12,
    light: '#FFF5DE',
    lightOpacity: 0.14,
    shadowOpacity: 0.06,
  },
  studio: {
    tint: ['#F4C48B', '#BC7845', '#3F2420'],
    tintOpacity: 0.3,
    light: '#FFE0A7',
    lightOpacity: 0.32,
    shadowOpacity: 0.25,
  },
  cinematic: {
    tint: ['#B69A72', '#364954', '#0D2238'],
    tintOpacity: 0.28,
    light: '#F6D6A4',
    lightOpacity: 0.1,
    shadowOpacity: 0.3,
  },
  vintage: {
    tint: ['#E7C79A', '#B98860', '#735045'],
    tintOpacity: 0.3,
    light: '#FFF1D9',
    lightOpacity: 0.19,
    shadowOpacity: 0.12,
  },
  mono: {
    tint: ['#777777', '#777777', '#777777'],
    tintOpacity: 1,
    light: '#FFFFFF',
    lightOpacity: 0.12,
    shadowOpacity: 0.24,
    monochrome: true,
  },
  hdr: {
    tint: ['#F2E6D8', '#8D8D87', '#263444'],
    tintOpacity: 0.14,
    light: '#FFFFFF',
    lightOpacity: 0.1,
    shadowOpacity: 0.26,
  },
  bokeh: {
    tint: ['#F4DBBC', '#B9A19A', '#433344'],
    tintOpacity: 0.16,
    light: '#FFEACB',
    lightOpacity: 0.25,
    shadowOpacity: 0.18,
  },
  cyberpunk: {
    tint: ['#DF1EAD', '#514075', '#00BCE6'],
    tintOpacity: 0.33,
    light: '#45E8FF',
    lightOpacity: 0.2,
    shadowOpacity: 0.28,
  },
  drift: {
    tint: ['#F44896', '#9553D7', '#305EA3'],
    tintOpacity: 0.34,
    light: '#FFE3F0',
    lightOpacity: 0.17,
    shadowOpacity: 0.18,
  },
  pop: {
    tint: ['#FF5478', '#FFB834', '#3977C5'],
    tintOpacity: 0.35,
    light: '#FFDB75',
    lightOpacity: 0.16,
    shadowOpacity: 0.22,
  },
  watercolor: {
    tint: ['#D0E6F3', '#EFCDB1', '#809EB6'],
    tintOpacity: 0.26,
    light: '#FFF9F0',
    lightOpacity: 0.31,
    shadowOpacity: 0.05,
  },
  sketch: {
    tint: ['#DDCFC0', '#C6B7A4', '#8A7C6E'],
    tintOpacity: 0.3,
    light: '#FFF7E7',
    lightOpacity: 0.25,
    shadowOpacity: 0.2,
  },
  cartoon: {
    tint: ['#F9C56F', '#E78C61', '#67433A'],
    tintOpacity: 0.3,
    light: '#FFF1B8',
    lightOpacity: 0.16,
    shadowOpacity: 0.24,
  },
};

const ALIASES: Record<string, string> = {
  'natural-light': 'natural',
  'warm-studio': 'studio',
  'cinematic-noir': 'cinematic',
  'warm-vintage': 'vintage',
  'black-white': 'mono',
  monochrome: 'mono',
  'hdr-glow': 'hdr',
  'soft-bokeh': 'bokeh',
  'drip-art': 'drift',
  'drift-art': 'drift',
  'pop-art': 'pop',
  'pop-poster': 'pop',
};

export function getFilterPreviewProfile(filterId: string | null): ToneProfile {
  const id = (filterId ?? 'natural').replace(/^filter-/, '');
  const key = Object.hasOwn(ALIASES, id) ? ALIASES[id]! : id;
  return Object.hasOwn(PROFILES, key) ? PROFILES[key]! : PROFILES.natural!;
}
