import { z } from 'zod';
import {
  AspectRatioSchema,
  PaginationQuerySchema,
  ProjectModeSchema,
  UuidSchema,
} from './common.js';

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
  })
  .refine((input) => Object.keys(input).length > 0, 'En az bir alan güncellenmelidir.');

export const ProjectParamsSchema = z.object({ projectId: UuidSchema });
export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  favorite: z.coerce.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
