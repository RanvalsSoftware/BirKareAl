import { z } from 'zod';
import { ASPECT_RATIOS, GENERATION_QUALITIES, PROJECT_MODES } from '@birkare/shared';

export const UuidSchema = z.string().uuid();
export const CursorSchema = z.string().uuid().optional();
export const PaginationQuerySchema = z.object({
  cursor: CursorSchema,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const ProjectModeSchema = z.enum(PROJECT_MODES);
export const GenerationQualitySchema = z.enum(GENERATION_QUALITIES);
export const AspectRatioSchema = z.enum(ASPECT_RATIOS);

export const EmptyObjectSchema = z.object({}).strict();
