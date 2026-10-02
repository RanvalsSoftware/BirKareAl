import { Router } from 'express';
import { DeleteAccountSchema, UpdateMeSchema, UpdatePreferencesSchema } from '@birkare/contracts';
import { conflict, notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';
import { toPublicUser } from '../auth/auth.service.js';
import { GoogleIdTokenService } from '../auth/google-id-token.service.js';
import { AppleIdTokenService } from '../auth/apple-id-token.service.js';
import { AppleTokenRevocationService } from '../auth/apple-token-revocation.service.js';
import { AccountDeletionService } from './account-deletion.service.js';
import { authRateLimit } from '../../middleware/rate-limit.middleware.js';
import { z } from 'zod';
import { IMAGE_PROCESSING_CONSENT_VERSION, latestImageProcessingConsent } from './consent.js';

export function createUsersRouter(deps: ApiDependencies): Router {
  const router = Router();
  const deletion = new AccountDeletionService(
    deps.repository,
    deps.storage,
    deps.passwordService,
    new GoogleIdTokenService(deps.config),
    new AppleIdTokenService(deps.config),
    new AppleTokenRevocationService(deps.config),
  );
  router.use(requireAuth(deps.tokenService, deps.repository));

  router.get(
    '/consents/image-processing',
    asyncHandler(async (req, res) => {
      const latest = await latestImageProcessingConsent(deps, req.auth!.userId);
      sendSuccess(res, req.requestId, {
        granted: Boolean(
          latest?.action === 'GRANTED' && latest.version === IMAGE_PROCESSING_CONSENT_VERSION,
        ),
        version: latest?.version ?? null,
        updatedAt: latest?.createdAt.toISOString() ?? null,
      });
    }),
  );

  router.post(
    '/consents/image-processing',
    validate(z.object({ accepted: z.literal(true) }).strict()),
    asyncHandler(async (req, res) => {
      const event = await deps.repository.createUserConsentEvent(req.auth!.userId, {
        type: 'IMAGE_PROCESSING_EXPLICIT',
        version: IMAGE_PROCESSING_CONSENT_VERSION,
        action: 'GRANTED',
        source: 'FIRST_IMAGE_UPLOAD',
      });
      sendSuccess(
        res,
        req.requestId,
        { granted: true, version: event.version, updatedAt: event.createdAt.toISOString() },
        201,
      );
    }),
  );

  router.delete(
    '/consents/image-processing',
    asyncHandler(async (req, res) => {
      const latest = await latestImageProcessingConsent(deps, req.auth!.userId);
      if (latest?.action === 'GRANTED') {
        await deps.repository.createUserConsentEvent(req.auth!.userId, {
          type: 'IMAGE_PROCESSING_EXPLICIT',
          version: latest.version,
          action: 'REVOKED',
          source: 'SETTINGS',
        });
      }
      sendSuccess(res, req.requestId, { granted: false });
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const user = await deps.repository.getUserById(req.auth!.userId);
      if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
      const [wallet, authProviders] = await Promise.all([
        deps.repository.getWallet(user.id),
        deps.repository.listAuthProviders(user.id),
      ]);
      sendSuccess(res, req.requestId, {
        user: toPublicUser(user),
        authProviders,
        preferences: user.preferences,
        wallet: {
          available: wallet.available,
          reserved: wallet.reserved,
          unlimited: Boolean(wallet.unlimited),
        },
      });
    }),
  );

  router.patch(
    '/',
    validate(UpdateMeSchema),
    asyncHandler(async (req, res) => {
      const user = await deps.repository.updateUser(req.auth!.userId, req.body);
      sendSuccess(res, req.requestId, { user: toPublicUser(user) });
    }),
  );

  router.patch(
    '/preferences',
    validate(UpdatePreferencesSchema),
    asyncHandler(async (req, res) => {
      const existing = await deps.repository.getUserById(req.auth!.userId);
      if (!existing) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
      const user = await deps.repository.updateUser(existing.id, {
        preferences: { ...existing.preferences, ...req.body },
      });
      sendSuccess(res, req.requestId, { preferences: user.preferences });
    }),
  );

  router.get(
    '/data-export',
    asyncHandler(async (req, res) => {
      const user = await deps.repository.getUserById(req.auth!.userId);
      if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
      const projects = await deps.repository.listProjects(user.id, { limit: 50 });
      const transactions = await deps.repository.listCreditTransactions(user.id);
      // Asset URLs are never included in a generic export response.
      sendSuccess(res, req.requestId, {
        export: {
          user: toPublicUser(user),
          preferences: user.preferences,
          projects: projects.items,
          transactions,
        },
      });
    }),
  );

  router.post(
    '/data-export',
    asyncHandler(async (_req, _res) => {
      throw conflict(
        'EXPORT_USE_DOWNLOAD',
        'Verilerini Ayarlar > Gizlilik ekranındaki dışa aktarma seçeneğinden doğrudan indirebilirsin. E-posta gönderimi kullanılmıyor.',
      );
    }),
  );

  router.get(
    '/deletion',
    asyncHandler(async (req, res) => {
      sendSuccess(res, req.requestId, await deletion.preview(req.auth!.userId));
    }),
  );

  router.delete(
    '/',
    authRateLimit,
    validate(DeleteAccountSchema),
    asyncHandler(async (req, res) => {
      sendSuccess(res, req.requestId, await deletion.request(req.auth!.userId, req.body), 202);
    }),
  );

  router.post(
    '/cancel-deletion',
    asyncHandler(async (_req, _res) => {
      throw conflict('DELETION_IRREVERSIBLE', 'Onaylanan kalıcı silme işlemi geri alınamaz.');
    }),
  );

  return router;
}
