import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { billingSyncRateLimit } from '../../middleware/rate-limit.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

const entitlementId = 'create_an_app_called_birkare_pro';
const offeringId = 'birkare_pro';
const revenueCatProducts = [
  {
    id: 'pro.monthly',
    packageIdentifier: '$rc_monthly',
    kind: 'subscription',
    creditPolicy: { cadence: 'monthly', amount: 80 },
    testStoreProductId: 'monthly',
    platformProductIds: { ios: 'com.birkareai.pro.monthly' },
  },
  {
    id: 'pro.annual',
    packageIdentifier: '$rc_annual',
    kind: 'subscription',
    creditPolicy: { cadence: 'monthly', amount: 80 },
    testStoreProductId: 'yearly',
    platformProductIds: { ios: 'com.birkareai.pro.yearly' },
  },
  {
    id: 'pro.lifetime',
    packageIdentifier: '$rc_lifetime',
    kind: 'non_consumable',
    creditPolicy: { cadence: 'once', amount: 200 },
    testStoreProductId: 'lifetime',
    platformProductIds: { ios: 'com.birkareai.pro.lifetime' },
  },
] as const;

export function createBillingRouter(deps: ApiDependencies): Router {
  const router = Router();

  // RevenueCat calls this endpoint directly, so it must remain outside mobile
  // JWT authentication. The service performs timing-safe token verification
  // before touching a user or granting credits.
  router.post(
    '/revenuecat/webhook',
    asyncHandler(async (req, res) => {
      const result = await deps.revenueCatService.processWebhook(
        req.get('authorization'),
        req.body,
        {
          signature: req.get('x-revenuecat-webhook-signature'),
          rawBody: req.rawBody,
        },
      );
      sendSuccess(res, req.requestId, result);
    }),
  );

  router.use(requireAuth(deps.tokenService, deps.repository));

  router.get(
    '/revenuecat/status',
    asyncHandler(async (req, res) => {
      sendSuccess(res, req.requestId, await deps.revenueCatService.readStatus(req.auth!.userId));
    }),
  );

  router.post(
    '/revenuecat/sync',
    billingSyncRateLimit,
    asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        req.requestId,
        await deps.revenueCatService.readStatus(req.auth!.userId, true),
      );
    }),
  );

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
      // This endpoint documents server policy identifiers only. Localized price,
      // currency, eligibility and the purchasable StoreProduct are read by the
      // RevenueCat mobile SDK from the named offering; the API never invents a
      // storefront price or accepts a client claim as proof of purchase.
      sendSuccess(res, req.requestId, {
        entitlementId,
        offeringId,
        pricingSource: 'revenuecat_mobile_sdk',
        items: revenueCatProducts,
      });
    }),
  );

  return router;
}
