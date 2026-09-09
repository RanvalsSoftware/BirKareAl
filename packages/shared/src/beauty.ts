/** Stable IDs, not client-authored model instructions. Intensity is local until submitted. */
export const BEAUTY_ADJUSTMENT_IDS = [
  'naturalBalance',
  'blemishRemoval',
  'skinSmoothing',
  'underEyeCorrection',
  'skinGlow',
  'faceContour',
  'youthfulLook',
] as const;
export type BeautyAdjustmentId = (typeof BEAUTY_ADJUSTMENT_IDS)[number];
export type BeautySettings = {
  adjustments: Record<BeautyAdjustmentId, number>;
  makeup: { preset: 'none' | 'nude' | 'soft-glam' | 'evening-glam'; intensity: number };
  preserveSkinTexture: boolean;
  preserveFrecklesAndMoles: boolean;
};
export type GenderTransformation = {
  kind: 'gender-swap';
  /** Explicit creative choice; never inferred from the uploaded person's identity. */
  presentation: 'feminine' | 'masculine';
};

/** UI strength 100 means this effect's maximum safe treatment, not a new face. */
export const BEAUTY_MAX_STRENGTH: Record<BeautyAdjustmentId, number> = {
  naturalBalance: 100,
  blemishRemoval: 100,
  skinSmoothing: 70,
  underEyeCorrection: 80,
  skinGlow: 80,
  faceContour: 50,
  youthfulLook: 60,
};

export function premiumBeautySelections(beauty: BeautySettings): string[] {
  return [
    ...(beauty.adjustments.faceContour > 0 ? ['faceContour'] : []),
    ...(beauty.adjustments.youthfulLook > 0 ? ['youthfulLook'] : []),
    ...(beauty.makeup.intensity > 0 && ['soft-glam', 'evening-glam'].includes(beauty.makeup.preset)
      ? [beauty.makeup.preset]
      : []),
  ];
}
