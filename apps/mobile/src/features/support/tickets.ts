import { apiRequest } from '@/api/client';

export const supportTopics = [
  { category: 'GENERATION', label: 'Üretim sorunu' },
  { category: 'PURCHASE', label: 'Satın alma' },
  { category: 'CONTENT_REPORT', label: 'İçerik raporu' },
  { category: 'PRIVACY', label: 'Gizlilik' },
  { category: 'OTHER', label: 'Diğer' },
] as const;
export type SupportTicketInput = {
  category: typeof supportTopics[number]['category'];
  subject: string;
  message: string;
  generationId?: string;
};
export type SupportTicketReceipt = {
  id: string;
  status: 'PENDING' | 'SENT' | 'UNCONFIRMED';
  createdAt: string;
  sentAt: string | null;
};
export function validSupportInput(input: SupportTicketInput) {
  return input.subject.trim().length >= 3 && input.subject.trim().length <= 120
    && !/[\r\n\u0000]/.test(input.subject)
    && input.message.trim().length >= 12 && input.message.trim().length <= 4000
    && !/\u0000/.test(input.message)
    && (!input.generationId || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.generationId));
}
/** A deduplication key, not an authentication secret. Keep it for unchanged retries. */
export function newSupportSubmissionKey() {
  return `support-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export async function submitSupportTicket(input: SupportTicketInput, key: string): Promise<SupportTicketReceipt> {
  if (!validSupportInput(input)) throw new Error('Başlık ve açıklamayı kontrol et.');
  const response = await apiRequest<{ ticket: SupportTicketReceipt }>('/v1/support/tickets', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify({ ...input, subject: input.subject.trim(), message: input.message.trim() }),
  });
  if (!response.ticket || !['PENDING', 'SENT', 'UNCONFIRMED'].includes(response.ticket.status)) {
    throw new Error('Destek talebi durumu doğrulanamadı. Aynı talebi tekrar kontrol edebilirsin.');
  }
  return response.ticket;
}
