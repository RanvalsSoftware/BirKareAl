import { z } from 'zod';
import { UuidSchema } from './common.js';

export const SupportCategorySchema = z.enum(['GENERATION', 'PURCHASE', 'CONTENT_REPORT', 'PRIVACY', 'OTHER']);
export const CreateSupportTicketSchema = z.object({
  category: SupportCategorySchema,
  subject: z.string().trim().min(3).max(120).refine((value) => !/[\r\n\u0000]/.test(value), 'Konu tek satır olmalıdır.'),
  message: z.string().trim().min(12).max(4000).refine((value) => !/\u0000/.test(value), 'Geçersiz açıklama.'),
  generationId: UuidSchema.optional(),
}).strict();
export const SupportTicketParamsSchema = z.object({ ticketId: UuidSchema });
export type CreateSupportTicketRequest = z.infer<typeof CreateSupportTicketSchema>;
