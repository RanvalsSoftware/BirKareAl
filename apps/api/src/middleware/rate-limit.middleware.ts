import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { errorEnvelope, hashStable } from '@birkare/shared';

export const authRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Express routes ignore case and a trailing slash; the bucket must too, or
  // /login, /LOGIN and /login/ would each get a fresh allowance.
  keyGenerator: (req) => `${req.ip}:${req.path.toLowerCase().replace(/\/+$/, '')}`,
  handler: (req, res) => {
    res.status(429).json(
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

/**
 * Six-digit verification codes are convenient but intentionally small.
 * In addition to the broad per-IP auth limiter, cap failed guesses per target
 * address. The address is hashed before it becomes a limiter-store key.
 */
export const emailVerificationRateLimit: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `verify-email:${hashStable(email || 'invalid')}`;
  },
  handler: (req, res) => {
    res.status(429).json(
      errorEnvelope(
        {
          code: 'AUTH_VERIFICATION_RATE_LIMITED',
          message: 'Çok fazla doğrulama denemesi yapıldı. Yeni bir kod isteyip tekrar deneyin.',
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
    res.status(429).json(
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

// A sync performs a forced RevenueCat network lookup. Keep this tighter than
// ordinary authenticated reads so one account cannot amplify traffic toward
// RevenueCat while still leaving enough room for purchase/restore flows.
export const billingSyncRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
  handler: (req, res) => {
    res.status(429).json(
      errorEnvelope(
        {
          code: 'BILLING_SYNC_RATE_LIMITED',
          message: 'Abonelik durumu çok sık yenilendi. Lütfen kısa süre sonra tekrar deneyin.',
        },
        req.requestId ?? 'unknown',
      ),
    );
  },
});

// Listing copy costs no credits, so the per-account window is the only bound
// on text-model spend. Every attempt counts, including rejected ones.
export const listingRateLimit: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
  handler: (req, res) => {
    res.status(429).json(
      errorEnvelope(
        {
          code: 'LISTING_RATE_LIMITED',
          message:
            'Çok kısa sürede çok fazla ürün metni istendi. Lütfen biraz sonra tekrar deneyin.',
        },
        req.requestId ?? 'unknown',
      ),
    );
  },
});

// Every initiate creates an asset row and a signed storage URL. Real flows
// upload one or two images per generation; this only stops scripted loops.
export const uploadRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
  handler: (req, res) => {
    res.status(429).json(
      errorEnvelope(
        {
          code: 'UPLOAD_RATE_LIMITED',
          message: 'Çok kısa sürede çok fazla yükleme başlatıldı. Lütfen biraz sonra tekrar deneyin.',
        },
        req.requestId ?? 'unknown',
      ),
    );
  },
});

// Notes are stored rows of up to 1000 characters; bound how fast one account
// can add them.
export const messageRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
  handler: (req, res) => {
    res.status(429).json(
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
