import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
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
    creditPolicy: { cadence: 'monthly', amount: 100 },
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
