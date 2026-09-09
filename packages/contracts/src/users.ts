import { z } from 'zod';

export const UpdateMeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).nullable().optional(),
    lastName: z.string().trim().min(1).max(80).nullable().optional(),
    locale: z.string().trim().min(2).max(16).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'En az bir alan güncellenmelidir.');

export const DeleteAccountSchema = z
  .object({
    confirmation: z.literal('HESABIMI SIL'),
    password: z.string().min(1).max(256).optional(),
    googleIdToken: z.string().min(20).max(12000).optional(),
  })
  .strict()
  .refine(
    (input) => Boolean(input.password) !== Boolean(input.googleIdToken),
    'Tek bir yeniden doğrulama yöntemi gereklidir.',
  );

export const UpdatePreferencesSchema = z
  .object({
    keepSourcePhotos: z.boolean().optional(),
    marketingEmail: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    glassEffects: z.boolean().optional(),
    theme: z.literal('dark').optional(),
    defaultAspectRatio: z.enum(['1:1', '4:5', '9:16', '16:9']).optional(),
    defaultQuality: z.enum(['PREVIEW', 'STANDARD', 'HD']).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'En az bir tercih güncellenmelidir.');
