import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { CreateSupportTicketSchema, SupportTicketParamsSchema, type CreateSupportTicketRequest } from '@birkare/contracts';
import type { SupportTicketRecord } from '@birkare/database';
import { ApiError, badRequest, conflict, errorEnvelope, hashStable, notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

const publicTicket = (ticket: SupportTicketRecord) => ({
  id: ticket.id,
  status: ticket.status,
  createdAt: ticket.createdAt,
  sentAt: ticket.sentAt,
});

function deliveryUnconfirmed(ticketId: string) {
  return new ApiError({ statusCode: 503, code: 'SUPPORT_DELIVERY_UNCONFIRMED',
    message: 'Talebin kaydedildi ancak destek e-postasına aktarımı doğrulanamadı. Aynı talep otomatik olarak yeniden gönderilmez; talep numaranla destek adresine ulaşabilirsin.',
    expose: true, details: { ticketId } });
}

export function createSupportRouter(deps: ApiDependencies): Router {
  const router = Router();
  router.use(requireAuth(deps.tokenService, deps.repository));
  // Per authenticated account, not a user-supplied email or recipient. This
  // in-process limiter is a burst guard; scale-out deployments need a shared store.
  const submissionLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.auth!.userId,
    handler: (req, res) => {
      res.status(429).json(errorEnvelope({ code: 'SUPPORT_RATE_LIMITED', message: 'Çok kısa sürede çok fazla destek talebi denendi. Lütfen 15 dakika sonra tekrar dene.' }, req.requestId));
    },
  });

  router.post('/tickets', submissionLimit, validate(CreateSupportTicketSchema), asyncHandler(async (req, res) => {
    const clientKey = req.header('idempotency-key');
    if (!clientKey || !/^[A-Za-z0-9_-]{16,128}$/.test(clientKey)) {
      throw badRequest('SUPPORT_IDEMPOTENCY_KEY_REQUIRED', 'Geçerli bir destek talebi anahtarı gereklidir.');
    }
    if (!deps.mailService.enabled) {
      throw new ApiError({ statusCode: 503, code: 'SUPPORT_MAIL_UNAVAILABLE', message: 'Destek e-postası hizmeti şu anda kullanılamıyor. Açıklamanı koruduk; daha sonra tekrar deneyebilirsin.', expose: true });
    }
    const input = req.body as CreateSupportTicketRequest;
    const email = z.string().email().safeParse(req.auth!.email);
    if (!email.success) throw badRequest('SUPPORT_EMAIL_INVALID', 'Hesabının e-posta adresi doğrulanamadı.');
    let diagnosticLines: string[] = [];
    if (input.generationId) {
      const generation = await deps.repository.getGenerationById(input.generationId);
      if (!generation || generation.userId !== req.auth!.userId || ['DELETED', 'DELETION_PENDING'].includes(generation.status)) {
        throw notFound('SUPPORT_GENERATION_NOT_FOUND', 'Bu hesaba ait üretim bulunamadı.');
      }
      const safe = (value: string | null, pattern: RegExp) => value && pattern.test(value) ? value : '—';
      diagnosticLines = [
        '', 'Sunucu teşhis bilgisi (fotoğraf ve prompt içermez):',
        `Üretim: ${generation.id}`,
        `Hata kodu: ${safe(generation.failureCode, /^[A-Z0-9_]{1,100}$/)}`,
        `Aşama: ${safe(generation.stage, /^[A-Z0-9_]{1,100}$/)}`,
        `Model: ${safe(generation.model, /^[A-Za-z0-9._/-]{1,128}$/)}`,
        `Sağlayıcı istek numarası: ${safe(generation.providerRequestId, /^[A-Za-z0-9_-]{1,160}$/)}`,
      ];
    }
    const { ticket, created } = await deps.repository.claimSupportTicket({
      userId: req.auth!.userId,
      idempotencyKey: clientKey,
      requestHash: hashStable(JSON.stringify(input)),
      requestId: req.requestId,
      category: input.category,
      subject: input.subject,
      message: input.message,
    });
    if (ticket.requestHash !== hashStable(JSON.stringify(input))) {
      throw conflict('SUPPORT_IDEMPOTENCY_CONFLICT', 'Bu talep anahtarı farklı bir açıklamayla kullanılmış. Yeni bir talep başlat.');
    }
    if (!created) {
      if (ticket.status === 'UNCONFIRMED') throw deliveryUnconfirmed(ticket.id);
      sendSuccess(res, req.requestId, { ticket: publicTicket(ticket) }, ticket.status === 'SENT' ? 200 : 202);
      return;
    }
    try {
      await deps.mailService.send({
        to: deps.config.SUPPORT_EMAIL,
        replyTo: email.data,
        subject: `[BirKare AI Destek ${ticket.id}] ${ticket.subject}`,
        text: [
          `Talep numarası: ${ticket.id}`,
          `Kategori: ${ticket.category}`,
          `Hesap: ${ticket.userId}`,
          `Yanıt adresi: ${email.data}`,
          `İstek numarası: ${ticket.requestId}`,
          '',
          ticket.message,
          ...diagnosticLines,
        ].join('\n'),
      });
    } catch {
      // SMTP can disconnect after acceptance. Persist the uncertainty and never
      // automatically send a second message for this ticket/key, including retries.
      try { await deps.repository.completeSupportTicketDelivery(ticket.userId, ticket.id, 'UNCONFIRMED'); } catch { /* PENDING also cannot be resent. */ }
      deps.logger.warn({ ticketId: ticket.id, requestId: req.requestId }, 'Destek e-postası teslimi doğrulanamadı.');
      throw deliveryUnconfirmed(ticket.id);
    }
    try {
      const sent = await deps.repository.completeSupportTicketDelivery(ticket.userId, ticket.id, 'SENT');
      sendSuccess(res, req.requestId, { ticket: publicTicket(sent) }, 201);
    } catch {
      // Delivery may have succeeded; a DB failure must not trigger duplicate mail.
      throw deliveryUnconfirmed(ticket.id);
    }
  }));

  router.get('/tickets/:ticketId', validate(SupportTicketParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const ticket = await deps.repository.getSupportTicket(req.auth!.userId, req.params.ticketId as string);
    if (!ticket) throw notFound('SUPPORT_TICKET_NOT_FOUND', 'Destek talebi bulunamadı.');
    sendSuccess(res, req.requestId, { ticket: publicTicket(ticket) });
  }));
  return router;
}
