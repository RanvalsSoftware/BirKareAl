import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
  BirKareRepository,
  CreditTransactionRecord,
  CreditWalletRecord,
  GrantCreditsInput,
} from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { createRevenueCatService } from './revenuecat.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-09-16T09:00:00.000Z');

function config(): BirKareConfig {
  return {
    REVENUECAT_ENABLED: true,
    REVENUECAT_SECRET_API_KEY: 'sk_server_test_only',
    REVENUECAT_WEBHOOK_AUTH_TOKEN: 'webhook-token-at-least-24-characters',
    REVENUECAT_ENTITLEMENT_ID: 'create_an_app_called_birkare_pro',
    REVENUECAT_OFFERING_ID: 'birkare_pro',
    REVENUECAT_MONTHLY_PRODUCT_IDS: 'monthly,com.birkareai.pro.monthly',
    REVENUECAT_ANNUAL_PRODUCT_IDS: 'yearly,com.birkareai.pro.yearly',
    REVENUECAT_LIFETIME_PRODUCT_IDS: 'lifetime,com.birkareai.pro.lifetime',
    REVENUECAT_MONTHLY_CREDITS: 80,
    REVENUECAT_ANNUAL_MONTHLY_CREDITS: 80,
    REVENUECAT_LIFETIME_CREDITS: 200,
    REVENUECAT_REQUEST_TIMEOUT_MS: 5000,
    REVENUECAT_CACHE_TTL_MS: 0,
  } as BirKareConfig;
}

test('RevenueCat consumables grant 20/60/150 credits exactly once per transaction', async () => {
  let available = 0;
  const transactions = new Map<string, CreditTransactionRecord>();
  const wallet = (): CreditWalletRecord => ({
    id: 'wallet-1',
    userId: USER_ID,
    available,
    reserved: 0,
    lifetimeEarned: available,
    lifetimeSpent: 0,
    version: transactions.size,
    createdAt: NOW,
    updatedAt: NOW,
  });
  const repository = {
    grantCredits: async (input: GrantCreditsInput) => {
      const previous = transactions.get(input.idempotencyKey);
      if (previous) return { wallet: wallet(), transaction: previous, created: false };
      available += input.amount;
      const transaction: CreditTransactionRecord = {
        id: `wallet-tx-${transactions.size + 1}`,
        userId: input.userId,
        type: input.type,
        status: 'COMPLETED',
        amount: input.amount,
        availableAfter: available,
        reservedAfter: 0,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        description: input.description ?? null,
        createdAt: NOW,
        completedAt: NOW,
      };
      transactions.set(input.idempotencyKey, transaction);
      return { wallet: wallet(), transaction, created: true };
    },
  } as unknown as BirKareRepository;
  const payload = {
    subscriber: {
      entitlements: {},
      subscriptions: {},
      non_subscriptions: {
        'com.birkareai.credits.20': [
          { id: 'store-tx-20', purchase_date: '2026-09-16T08:00:00.000Z', store: 'app_store', is_sandbox: true },
        ],
        'com.birkareai.credits.60': [
          { id: 'store-tx-60', purchase_date: '2026-09-16T08:01:00.000Z', store: 'app_store', is_sandbox: true },
        ],
        'com.birkareai.credits.150': [
          { id: 'store-tx-150', purchase_date: '2026-09-16T08:02:00.000Z', store: 'app_store', is_sandbox: true },
        ],
      },
    },
  };
  const service = createRevenueCatService({
    config: config(),
    repository,
    fetchImpl: async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    now: () => NOW,
  });

  const first = await service.readStatus(USER_ID, true);
  const second = await service.readStatus(USER_ID, true);

  assert.equal(first.creditPackCreditsGranted, 230);
  assert.equal(second.creditPackCreditsGranted, 0);
  assert.equal(wallet().available, 230);
  assert.equal(transactions.size, 3);
  assert.deepEqual(
    [...transactions.values()].map((item) => item.amount).sort((a, b) => a - b),
    [20, 60, 150],
  );
  assert.ok(
    [...transactions.values()].every(
      (item) => item.type === 'PURCHASE' && item.referenceType === 'REVENUECAT_CONSUMABLE',
    ),
  );
});
