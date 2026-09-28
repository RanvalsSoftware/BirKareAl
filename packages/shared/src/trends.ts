/** Stable server-owned fashion presets; UI labels are never used as prompts. */
export const TREND_PRESET_IDS = [
  'kpop_star',
  'pop_icon_80s',
  'romantic_dinner_80s',
  'romantic_closeup_80s',
  'analog_90s',
  'y2k_celebrity',
  'red_carpet_glam',
  'editorial_cover',
  'old_money_portrait',
  'streetwear_editorial',
  'neon_club_night',
] as const;

export type TrendPreset = (typeof TREND_PRESET_IDS)[number];


/** Trends that may combine two separately uploaded, consented people into one scene. */
export const DUAL_PERSON_TREND_IDS = [
  'romantic_dinner_80s',
  'romantic_closeup_80s',
] as const satisfies readonly TrendPreset[];

export function isDualPersonTrend(
  value: string | null | undefined,
): value is (typeof DUAL_PERSON_TREND_IDS)[number] {
  return DUAL_PERSON_TREND_IDS.some((id) => id === value);
}
