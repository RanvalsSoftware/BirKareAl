import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { errorEnvelope } from '@birkare/shared';

export const authRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.path}`,
  handler: (req, res) => {
    res
      .status(429)
      .json(
        errorEnvelope(
          {
            code: 'RATE_LIMITED',
            message: 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.',
          },
          req.requestId ?? 'unknown',
        ),
      );
  },
});

export const generationRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
  handler: (req, res) => {
    res
      .status(429)
      .json(
        errorEnvelope(
          {
            code: 'GENERATION_RATE_LIMITED',
            message: 'Çok kısa sürede çok fazla üretim talebi oluşturuldu.',
          },
          req.requestId ?? 'unknown',
        ),
      );
  },
});
