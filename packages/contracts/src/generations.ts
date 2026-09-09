import { z } from 'zod';
import { TREND_PRESET_IDS } from '@birkare/shared';
import { BeautySettingsSchema, GenderTransformationSchema } from './beauty.js';
import {
  AspectRatioSchema,
  GenerationQualitySchema,
  ProjectModeSchema,
  UuidSchema,
} from './common.js';

export const QuoteGenerationSchema = z.object({
  mode: ProjectModeSchema,
  quality: GenerationQualitySchema,
  numberOfImages: z.number().int().min(1).max(4),
  sceneTemplateId: UuidSchema.nullable().optional(),
  featuredPersonId: UuidSchema.nullable().optional(),
  stylePresetId: UuidSchema.nullable().optional(),
  beauty: BeautySettingsSchema.optional(),
  transformation: GenderTransformationSchema.optional(),
  trendPreset: z.enum(TREND_PRESET_IDS).optional(),
});

export const GenerationCompositionDetailsSchema = z
  .object({
    shotType: z.enum(['CLOSE_SELFIE', 'PORTRAIT', 'HALF_BODY', 'FULL_BODY']),
    cameraAngle: z.enum(['EYE_LEVEL', 'SLIGHTLY_LOW', 'SLIGHTLY_HIGH']),
    subjectPosition: z.enum(['CENTER', 'LEFT', 'RIGHT']),
    backgroundDepth: z.enum(['SHALLOW', 'BALANCED', 'DEEP']),
    secondarySubjectPosition: z.enum(['LEFT', 'RIGHT', 'SLIGHTLY_BEHIND', 'BACKGROUND']).optional(),
  })
  .strict();

const GenerationRequestSchema = z.object({
  projectId: UuidSchema,
  sourceAssetId: UuidSchema,
  mode: ProjectModeSchema,
  sceneTemplateId: UuidSchema.nullable().optional(),
  featuredPersonId: UuidSchema.nullable().optional(),
  stylePresetId: UuidSchema.nullable().optional(),
  composition: z.enum(['SELFIE', 'CLOSE', 'MEDIUM', 'WIDE']).default('SELFIE'),
  compositionDetails: GenerationCompositionDetailsSchema.optional(),
  /** 0–100 is compiled server-side into a safe, descriptive style instruction. */
  filterIntensity: z.number().int().min(0).max(100).default(60),
  beauty: BeautySettingsSchema.optional(),
  transformation: GenderTransformationSchema.optional(),
  trendPreset: z.enum(TREND_PRESET_IDS).optional(),
  /** This only selects a catalog record; clients never send a reference image or a public-figure name. */
  characterMode: z.enum(['FICTIONAL', 'LICENSED_REFERENCE']).optional(),
  aspectRatio: AspectRatioSchema.default('4:5'),
  quality: GenerationQualitySchema,
  numberOfImages: z.number().int().min(1).max(4),
  preserveFace: z.boolean().default(true),
  preserveClothes: z.boolean().default(true),
  customInstruction: z.string().trim().max(1000).optional(),
  disclosureAccepted: z.literal(true),
});

function validateGenerationSelection(
  input: z.infer<typeof GenerationRequestSchema>,
  ctx: z.RefinementCtx,
) {
  if (
    input.trendPreset &&
    (input.mode !== 'AI_FILTER' ||
      input.sceneTemplateId ||
      input.featuredPersonId ||
      input.characterMode ||
      input.beauty ||
      input.transformation ||
      !input.preserveFace ||
      input.preserveClothes)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['trendPreset'],
      message:
        'Akım, kendi fotoğrafına kimliği koruyarak uygulanır; kıyafet ve ortam değişebilir. Diğer araçlarla birleştirilemez.',
    });
  }
  if (input.beauty || input.transformation) {
    if (
      input.mode !== 'AI_FILTER' ||
      input.sceneTemplateId ||
      input.featuredPersonId ||
      input.characterMode
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mode'],
        message: 'Güzellik ve dönüşüm araçları yalnızca özgün fotoğraf üzerinde kullanılır.',
      });
    }
    if (input.beauty && input.transformation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transformation'],
        message: 'Güzellik ve cinsiyet görünümü dönüşümünü ayrı uygulayın.',
      });
    }
    if (input.beauty && (!input.preserveFace || !input.preserveClothes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preserveFace'],
        message: 'Güzellik düzenlemesinde kimlik ve kıyafet korunmalıdır.',
      });
    }
  }
  if (input.mode === 'FAN_MOMENT' && !input.featuredPersonId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['featuredPersonId'],
      message: 'Fan sahnesi için kurgusal karakter seçmelisiniz.',
    });
  }
  if (input.mode === 'AI_FILTER' && !input.stylePresetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stylePresetId'],
      message: 'AI filtre için bir stil seçmelisiniz.',
    });
  }
  if (
    ['FULL_SCENE', 'BACKGROUND_REPLACE', 'FAN_MOMENT'].includes(input.mode) &&
    !input.sceneTemplateId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sceneTemplateId'],
      message: 'Bu üretim türü için bir sahne seçmelisiniz.',
    });
  }
  if (input.mode === 'PRO_PORTRAIT' && !input.stylePresetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stylePresetId'],
      message: 'Profesyonel portre için bir stil seçmelisiniz.',
    });
  }
  if (input.characterMode && !input.featuredPersonId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['featuredPersonId'],
      message: 'Karakter modu için onaylı bir katalog karakteri seçmelisiniz.',
    });
  }
}

export const CreateGenerationSchema = GenerationRequestSchema.superRefine(
  validateGenerationSelection,
);

/**
 * The only endpoint intended to create a low-cost preview job. Choice controls
 * are local-only; the app submits this payload only after the user presses
 * “Önizlemeyi oluştur”.
 */
export const CreatePreviewGenerationSchema = GenerationRequestSchema.extend({
  quality: z.literal('PREVIEW').default('PREVIEW'),
  numberOfImages: z.number().int().min(1).max(2).default(1),
}).superRefine(validateGenerationSelection);

export const GenerationParamsSchema = z.object({ generationId: UuidSchema });
export const CancelGenerationSchema = z.object({ reason: z.string().trim().max(280).optional() });
export const GenerationRevisionSchema = z.object({
  instruction: z.string().trim().min(3).max(1000),
  sourceOutputId: UuidSchema,
  quality: GenerationQualitySchema.default('STANDARD'),
});
export const SelectOutputSchema = z.object({ outputId: UuidSchema });
export const GenerationMessageSchema = z.object({ content: z.string().trim().min(1).max(1000) });

export type CreateGenerationInput = z.infer<typeof CreateGenerationSchema>;
export type CreatePreviewGenerationInput = z.infer<typeof CreatePreviewGenerationSchema>;
export type GenerationCompositionDetails = z.infer<typeof GenerationCompositionDetailsSchema>;
