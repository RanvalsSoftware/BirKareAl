import { z } from 'zod';
import { UuidSchema } from './common.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UploadInitiateSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024),
  purpose: z.enum(['USER_SOURCE', 'AVATAR']),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const AssetParamsSchema = z.object({ assetId: UuidSchema });
export type UploadInitiateInput = z.infer<typeof UploadInitiateSchema>;
