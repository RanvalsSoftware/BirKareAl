/** Typed preset settings only. Prompts and safe effect limits are authoritative on the server. */
export type BeautyAdjustment =
  | 'naturalBalance'
  | 'blemishRemoval'
  | 'skinSmoothing'
  | 'underEyeCorrection'
  | 'skinGlow'
  | 'faceContour'
  | 'youthfulLook';
export type MakeupPreset = 'none' | 'nude' | 'soft-glam' | 'evening-glam';
export type BeautySettings = {
  adjustments: Record<BeautyAdjustment, number>;
  makeup: { preset: MakeupPreset; intensity: number };
  preserveSkinTexture: boolean;
  preserveFrecklesAndMoles: boolean;
};
export type GenderTransformation = { kind: 'gender-swap'; presentation: 'feminine' | 'masculine' };
export type BeautyOptionId = BeautyAdjustment | Exclude<MakeupPreset, 'none'>;

export function emptyBeautySettings(): BeautySettings {
  return {
    adjustments: {
      naturalBalance: 0,
      blemishRemoval: 0,
      skinSmoothing: 0,
      underEyeCorrection: 0,
      skinGlow: 0,
      faceContour: 0,
      youthfulLook: 0,
    },
    makeup: { preset: 'none', intensity: 0 },
    preserveSkinTexture: true,
    preserveFrecklesAndMoles: true,
  };
}

export function beautyIntensity(settings: BeautySettings, id: BeautyOptionId): number {
  if (id === 'nude' || id === 'soft-glam' || id === 'evening-glam')
    return settings.makeup.preset === id ? settings.makeup.intensity : 0;
  return settings.adjustments[id];
}

export function withBeautyIntensity(
  settings: BeautySettings,
  id: BeautyOptionId,
  intensity: number,
): BeautySettings {
  const value = Number.isFinite(intensity) ? Math.max(0, Math.min(100, Math.round(intensity))) : 0;
  if (id === 'nude' || id === 'soft-glam' || id === 'evening-glam') {
    return { ...settings, makeup: { preset: value ? id : 'none', intensity: value } };
  }
  return { ...settings, adjustments: { ...settings.adjustments, [id]: value } };
}

export function hasBeautyAdjustments(settings: BeautySettings) {
  return (
    Object.values(settings.adjustments).some((value) => value > 0) ||
    (settings.makeup.preset !== 'none' && settings.makeup.intensity > 0)
  );
}

/** Tapping an enabled layer removes it, without changing any other layer. */
export function toggleBeautyOption(
  settings: BeautySettings,
  id: BeautyOptionId,
  defaultIntensity: number,
): BeautySettings {
  return withBeautyIntensity(
    settings,
    id,
    beautyIntensity(settings, id) > 0 ? 0 : defaultIntensity,
  );
}

export function intensityDescription(value: number) {
  return value === 0
    ? 'Kapalı'
    : value <= 20
      ? 'Çok hafif'
      : value <= 40
        ? 'Doğal'
        : value <= 60
          ? 'Dengeli'
          : value <= 80
            ? 'Belirgin'
            : 'Güçlü';
}
