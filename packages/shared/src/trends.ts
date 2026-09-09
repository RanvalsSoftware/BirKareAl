/** Stable server-owned fashion presets; UI labels are never used as prompts. */
export const TREND_PRESET_IDS = [
  'kpop_star',
  'pop_icon_80s',
  'analog_90s',
  'y2k_celebrity',
  'red_carpet_glam',
  'editorial_cover',
  'old_money_portrait',
  'streetwear_editorial',
  'neon_club_night',
] as const;

export type TrendPreset = (typeof TREND_PRESET_IDS)[number];
