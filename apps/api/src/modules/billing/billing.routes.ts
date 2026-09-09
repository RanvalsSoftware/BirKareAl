import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

export function createBillingRouter(deps: ApiDependencies): Router {
  const router = Router();
  router.use(requireAuth(deps.tokenService, deps.repository));
  router.get(
    '/wallet',
    asyncHandler(async (req, res) => {
      const wallet = await deps.repository.getWallet(req.auth!.userId);
      sendSuccess(res, req.requestId, wallet);
    }),
  );
  router.get(
    '/transactions',
    asyncHandler(async (req, res) => {
      sendSuccess(res, req.requestId, {
        items: await deps.repository.listCreditTransactions(req.auth!.userId),
      });
    }),
  );
  router.get(
    '/products',
    asyncHandler(async (req, res) => {
      // Prices must be verified by Apple/Google or RevenueCat server-side before a
      // production purchase is granted; no web-card checkout is exposed in-app.
      sendSuccess(res, req.requestId, {
        items: [
          {
            id: 'credits.small',
            credits: 24,
            platformProductIds: { ios: 'birkare.credits.24', android: 'birkare_credits_24' },
          },
          {
            id: 'credits.medium',
            credits: 80,
            platformProductIds: { ios: 'birkare.credits.80', android: 'birkare_credits_80' },
          },
        ],
      });
    }),
  );
  return router;
}
