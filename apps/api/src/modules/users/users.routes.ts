import { Router } from 'express';
import { DeleteAccountSchema, UpdateMeSchema, UpdatePreferencesSchema } from '@birkare/contracts';
import { conflict, notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';
import { toPublicUser } from '../auth/auth.service.js';
import { GoogleIdTokenService } from '../auth/google-id-token.service.js';
import { AccountDeletionService } from './account-deletion.service.js';
import { authRateLimit } from '../../middleware/rate-limit.middleware.js';

export function createUsersRouter(deps: ApiDependencies): Router {
  const router = Router();
  const deletion = new AccountDeletionService(
    deps.repository,
    deps.storage,
    deps.passwordService,
    new GoogleIdTokenService(deps.config),
  );
  router.use(requireAuth(deps.tokenService, deps.repository));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const user = await deps.repository.getUserById(req.auth!.userId);
      if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
      const wallet = await deps.repository.getWallet(user.id);
      sendSuccess(res, req.requestId, {
        user: toPublicUser(user),
        preferences: user.preferences,
        wallet: { available: wallet.available, reserved: wallet.reserved },
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
