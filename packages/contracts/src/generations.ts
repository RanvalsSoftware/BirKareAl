import { z } from 'zod';
import {
  AI_TOOL_PRESET_IDS,
  FASHION_SCENE_IDS,
  NAIL_PRESET_IDS,
  PRODUCT_CATEGORY_IDS,
  PRODUCT_SCENE_IDS,
  STUDIO_MODES,
  TREND_PRESET_IDS,
} from '@birkare/shared';
import { BeautySettingsSchema, GenderTransformationSchema } from './beauty.js';
import {
  AspectRatioSchema,
  GenerationQualitySchema,
  ProjectModeSchema,
  UuidSchema,
} from './common.js';

export const StudioSelectionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('PRODUCT_STUDIO'),
      categoryId: z.enum(PRODUCT_CATEGORY_IDS),
      sceneId: z.enum(PRODUCT_SCENE_IDS),
    })
    .strict(),
  z
    .object({
      kind: z.literal('VIRTUAL_TRY_ON'),
      sceneId: z.enum(FASHION_SCENE_IDS),
    })
    .strict(),
  z
    .object({
      kind: z.literal('NAIL_PREVIEW'),
      presetId: z.enum(NAIL_PRESET_IDS),
    })
    .strict(),
]);

const QuoteGenerationObjectSchema = z.object({
  mode: ProjectModeSchema,
  quality: GenerationQualitySchema,
  numberOfImages: z.number().int().min(1).max(4),
  sceneTemplateId: UuidSchema.nullable().optional(),
  featuredPersonId: UuidSchema.nullable().optional(),
  stylePresetId: UuidSchema.nullable().optional(),
  beauty: BeautySettingsSchema.optional(),
  transformation: GenderTransformationSchema.optional(),
  trendPreset: z.enum(TREND_PRESET_IDS).optional(),
  toolPreset: z.enum(AI_TOOL_PRESET_IDS).optional(),
  studio: StudioSelectionSchema.optional(),
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
  /** Required only by VIRTUAL_TRY_ON and persisted as the GARMENT input role. */
  secondarySourceAssetId: UuidSchema.optional(),
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
  toolPreset: z.enum(AI_TOOL_PRESET_IDS).optional(),
  studio: StudioSelectionSchema.optional(),
  /** This only selects a catalog record; clients never send a reference image or a public-figure name. */
  characterMode: z.enum(['FICTIONAL', 'LICENSED_REFERENCE']).optional(),
  aspectRatio: AspectRatioSchema.default('4:5'),
  quality: GenerationQualitySchema,
  numberOfImages: z.number().int().min(1).max(4),
  preserveFace: z.boolean().default(true),
  preserveClothes: z.boolean().default(true),
  customInstruction: z.string().trim().max(1000).optional(),
  /** Studio-specific name used by the product UI; compiled only as an untrusted preference. */
  userNotes: z.string().trim().max(1000).optional(),
  disclosureAccepted: z.literal(true),
});

type ModeSelectionInput = {
  mode: z.infer<typeof ProjectModeSchema>;
  studio?: z.infer<typeof StudioSelectionSchema>;
  secondarySourceAssetId?: string;
  sceneTemplateId?: string | null;
  featuredPersonId?: string | null;
  stylePresetId?: string | null;
  beauty?: unknown;
  transformation?: unknown;
  trendPreset?: unknown;
  toolPreset?: (typeof AI_TOOL_PRESET_IDS)[number];
  characterMode?: unknown;
  preserveFace?: boolean;
  preserveClothes?: boolean;
};

function validateStudioSelection(
  input: ModeSelectionInput,
  ctx: z.RefinementCtx,
  requireInputAssets: boolean,
): boolean {
  const isStudioMode = STUDIO_MODES.includes(input.mode as (typeof STUDIO_MODES)[number]);
  if (!isStudioMode) {
    if (input.studio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studio'],
        message: 'Stüdyo seçimi yalnızca ürün, kıyafet veya tırnak akışında kullanılabilir.',
      });
    }
    if (input.secondarySourceAssetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secondarySourceAssetId'],
        message: 'İkinci kaynak görsel yalnızca kıyafet denemesinde kullanılabilir.',
      });
    }
    return false;
  }

  const expectedKind = {
    PRODUCT_STUDIO: 'PRODUCT_STUDIO',
    VIRTUAL_TRY_ON: 'VIRTUAL_TRY_ON',
    NAIL_PREVIEW: 'NAIL_PREVIEW',
  }[input.mode as (typeof STUDIO_MODES)[number]];
  if (!input.studio || input.studio.kind !== expectedKind) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studio'],
      message: 'Stüdyo seçimi üretim modu ile eşleşmelidir.',
    });
  }
  if (
    input.sceneTemplateId ||
    input.featuredPersonId ||
    input.stylePresetId ||
    input.beauty ||
    input.transformation ||
    input.trendPreset ||
    input.toolPreset ||
    input.characterMode
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studio'],
      message:
        'Stüdyo akışları portre sahnesi, filtre, karakter veya güzellik aracıyla birleştirilemez.',
    });
  }
  if (requireInputAssets && input.mode === 'VIRTUAL_TRY_ON' && !input.secondarySourceAssetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondarySourceAssetId'],
      message: 'Kıyafet denemesi için kıyafet fotoğrafı gereklidir.',
    });
  }
  if (input.mode !== 'VIRTUAL_TRY_ON' && input.secondarySourceAssetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondarySourceAssetId'],
      message: 'İkinci kaynak görsel yalnızca kıyafet denemesinde kullanılabilir.',
    });
  }
  return true;
}

function validateToolPresetSelection(input: ModeSelectionInput, ctx: z.RefinementCtx) {
  if (!input.toolPreset) return;
  const expectedMode = {
    background: 'BACKGROUND_REPLACE',
    light: 'AI_FILTER',
    portrait: 'PRO_PORTRAIT',
    extend: 'AI_FILTER',
  }[input.toolPreset];

  if (input.mode !== expectedMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['toolPreset'],
      message: 'AI araç seçimi üretim modu ile eşleşmelidir.',
    });
  }
  if (
    input.studio ||
    input.featuredPersonId ||
    input.characterMode ||
    input.beauty ||
    input.transformation ||
    input.trendPreset
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['toolPreset'],
      message: 'AI araç presetleri diğer özel üretim modlarıyla birleştirilemez.',
    });
  }
  if (
    (input.preserveFace === false || input.preserveClothes === false) &&
    ['background', 'light', 'portrait', 'extend'].includes(input.toolPreset)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['preserveFace'],
      message: 'AI araç presetlerinde kaynak kişi ve kıyafet koruması açık kalmalıdır.',
    });
  }
}

export const QuoteGenerationSchema = QuoteGenerationObjectSchema.superRefine((input, ctx) => {
  validateStudioSelection(input, ctx, false);
  validateToolPresetSelection(input, ctx);
});

function validateGenerationSelection(
  input: z.infer<typeof GenerationRequestSchema>,
  ctx: z.RefinementCtx,
) {
  if (validateStudioSelection(input, ctx, true)) {
    if (input.customInstruction && input.userNotes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userNotes'],
        message: 'Stüdyo notunu yalnızca bir alanda gönderin.',
      });
    }
    return;
  }
  validateToolPresetSelection(input, ctx);
  if (input.userNotes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['userNotes'],
      message: 'userNotes yalnızca ürün, kıyafet veya tırnak akışında kullanılabilir.',
    });
  }
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
export type StudioSelectionInput = z.infer<typeof StudioSelectionSchema>;
