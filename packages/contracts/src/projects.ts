import { z } from 'zod';
import {
  LISTING_LANGUAGES,
  LISTING_LIMITS,
  LISTING_TONES,
  PROJECT_PRICE_MAX_AMOUNT,
} from '@birkare/shared';
import {
  AspectRatioSchema,
  PaginationQuerySchema,
  ProjectModeSchema,
  UuidSchema,
} from './common.js';

/** Plain JSON number with at most two decimals; storage precision is a server detail. */
export const ProjectPriceAmountSchema = z
  .number()
  .finite()
  .min(0)
  .max(PROJECT_PRICE_MAX_AMOUNT)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    'Fiyat en fazla iki ondalık basamak içerebilir.',
  );
/** ISO-4217 alphabetic code. */
export const ProjectPriceCurrencySchema = z.string().regex(/^[A-Z]{3}$/);

export const CreateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: ProjectModeSchema,
  sourceAssetId: UuidSchema.optional(),
  // The create flow sends all three selection slots explicitly. `null` means
  // “this mode has no selection of this kind”; `undefined` remains valid for
  // older clients that omit unused fields.
  sceneTemplateId: UuidSchema.nullable().optional(),
  stylePresetId: UuidSchema.nullable().optional(),
  featuredPersonId: UuidSchema.nullable().optional(),
  composition: z.enum(['SELFIE', 'CLOSE', 'MEDIUM', 'WIDE']).optional(),
  aspectRatio: AspectRatioSchema.default('4:5'),
});

export const UpdateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(120).nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    sceneTemplateId: UuidSchema.nullable().optional(),
    stylePresetId: UuidSchema.nullable().optional(),
    featuredPersonId: UuidSchema.nullable().optional(),
    composition: z.enum(['SELFIE', 'CLOSE', 'MEDIUM', 'WIDE']).nullable().optional(),
    aspectRatio: AspectRatioSchema.optional(),
    // `null` clears the value. Amount and currency are independent fields.
    priceAmount: ProjectPriceAmountSchema.nullable().optional(),
    priceCurrency: ProjectPriceCurrencySchema.nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'En az bir alan güncellenmelidir.');

export const ProjectParamsSchema = z.object({ projectId: UuidSchema });
export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  favorite: z.coerce.boolean().optional(),
});

export const ListingLanguageSchema = z.enum(LISTING_LANGUAGES);
export const ListingToneSchema = z.enum(LISTING_TONES);

/** Both fields are optional; the server falls back to the request language and `neutral`. */
export const GenerateProjectListingSchema = z
  .object({
    language: ListingLanguageSchema.optional(),
    tone: ListingToneSchema.optional(),
  })
  .strict();

export const ProjectListingSchema = z.object({
  title: z.string().min(1).max(LISTING_LIMITS.titleMaxLength),
  description: z.string().min(1).max(LISTING_LIMITS.descriptionMaxLength),
  highlights: z
    .array(z.string().min(1).max(LISTING_LIMITS.highlightMaxLength))
    .min(LISTING_LIMITS.highlightsMin)
    .max(LISTING_LIMITS.highlightsMax),
  hashtags: z
    .array(
      z
        .string()
        .regex(/^#\S+$/)
        .max(LISTING_LIMITS.hashtagMaxLength),
    )
    .min(LISTING_LIMITS.hashtagsMin)
    .max(LISTING_LIMITS.hashtagsMax),
  language: ListingLanguageSchema,
  tone: ListingToneSchema,
  generatedAt: z.string().datetime(),
});
export const ProjectListingResponseSchema = z.object({ listing: ProjectListingSchema });

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type GenerateProjectListingInput = z.infer<typeof GenerateProjectListingSchema>;
export type ProjectListingResponse = z.infer<typeof ProjectListingResponseSchema>;
