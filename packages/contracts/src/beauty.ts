import { z } from 'zod';

const intensity = z.number().int().min(0).max(100);
export const BeautySettingsSchema = z
  .object({
    adjustments: z
      .object({
        naturalBalance: intensity.default(0),
        blemishRemoval: intensity.default(0),
        skinSmoothing: intensity.default(0),
        underEyeCorrection: intensity.default(0),
        skinGlow: intensity.default(0),
        faceContour: intensity.default(0),
        youthfulLook: intensity.default(0),
      })
      .strict(),
    makeup: z
      .object({
        preset: z.enum(['none', 'nude', 'soft-glam', 'evening-glam']),
        intensity,
      })
      .strict(),
    preserveSkinTexture: z.boolean().default(true),
    preserveFrecklesAndMoles: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.makeup.preset === 'none' && value.makeup.intensity !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['makeup', 'intensity'],
        message: 'Makyaj seçilmediyse yoğunluğu sıfır olmalıdır.',
      });
    }
    if (!Object.values(value.adjustments).some((n) => n > 0) && value.makeup.intensity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adjustments'],
        message: 'En az bir güzellik ayarının yoğunluğunu artırın.',
      });
    }
  });

export const GenderTransformationSchema = z
  .object({
    kind: z.literal('gender-swap'),
    presentation: z.enum(['feminine', 'masculine']),
  })
  .strict();
