import { Router } from 'express';
import {
  BIRKARE_CREDIT_PRODUCTS,
  BIRKARE_PRO_PRODUCTS,
  BIRKARE_REVENUECAT_ENTITLEMENT_ID,
  BIRKARE_REVENUECAT_OFFERING_ID,
} from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { billingSyncRateLimit } from '../../middleware/rate-limit.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

const revenueCatProducts = [
  {
    ...BIRKARE_PRO_PRODUCTS.monthly,
    kind: 'subscription',
    creditPolicy: { cadence: 'monthly', amount: 80 },
    testStoreProductId: 'monthly',
    platformProductIds: { ios: BIRKARE_PRO_PRODUCTS.monthly.productId },
  },
  {
    ...BIRKARE_PRO_PRODUCTS.annual,
    kind: 'subscription',
    creditPolicy: { cadence: 'monthly', amount: 80 },
    testStoreProductId: 'yearly',
    platformProductIds: { ios: BIRKARE_PRO_PRODUCTS.annual.productId },
  },
  {
    ...BIRKARE_PRO_PRODUCTS.lifetime,
    kind: 'non_consumable',
    creditPolicy: { cadence: 'once', amount: 200 },
    testStoreProductId: 'lifetime',
    platformProductIds: { ios: BIRKARE_PRO_PRODUCTS.lifetime.productId },
  },
  ...BIRKARE_CREDIT_PRODUCTS.map((product) => ({
    id: product.id,
    kind: 'consumable' as const,
    creditPolicy: { cadence: 'once' as const, amount: product.credits },
    platformProductIds: { ios: product.productId },
  })),
] as const;

export function createBillingRouter(deps: ApiDependencies): Router {
  const router = Router();

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
      sendSuccess(res, req.requestId, {
        entitlementId: BIRKARE_REVENUECAT_ENTITLEMENT_ID,
        offeringId: BIRKARE_REVENUECAT_OFFERING_ID,
        pricingSource: 'revenuecat_mobile_sdk',
        items: revenueCatProducts,
      });
    }),
  );

  return router;
}
