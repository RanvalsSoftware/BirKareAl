import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryRepository } from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { createRevenueCatService } from './revenuecat.service.js';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const TOKEN = 'webhook-token-at-least-24-characters';

function config(): BirKareConfig {
  return {
    REVENUECAT_ENABLED: true,
    REVENUECAT_SECRET_API_KEY: 'sk_server_test_only',
    REVENUECAT_WEBHOOK_AUTH_TOKEN: TOKEN,
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

async function account(repository: MemoryRepository, email: string): Promise<string> {
  const user = await repository.createUser({
    email,
    passwordHash: 'unused',
    firstName: null,
    lastName: null,
    locale: 'tr-TR',
    dateOfBirth: null,
    consents: [],
  });
  return user.id;
}

/** RevenueCat lists the same purchases under whichever account restored last. */
function harness(subscriberFor: (userId: string) => unknown) {
  const repository = new MemoryRepository();
  const service = createRevenueCatService({
    config: config(),
    repository,
    fetchImpl: async (url) => {
      const userId = decodeURIComponent(String(url).split('/subscribers/')[1]!);
      return new Response(JSON.stringify({ subscriber: subscriberFor(userId) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
    now: () => NOW,
  });
  return { repository, service };
}

const creditPack = {
  entitlements: {},
  subscriptions: {},
  non_subscriptions: {
    'com.birkareai.credits.150': [
      { id: 'rc-tx-150', purchase_date: '2026-10-13T08:00:00Z', store: 'app_store' },
    ],
  },
};

const monthly = (storeTransactionId?: string) => ({
  entitlements: {
    create_an_app_called_birkare_pro: {
      product_identifier: 'com.birkareai.pro.monthly',
      expires_date: '2026-11-13T08:00:00Z',
      purchase_date: '2026-10-13T08:00:00Z',
    },
  },
  subscriptions: {
    'com.birkareai.pro.monthly': {
      expires_date: '2026-11-13T08:00:00Z',
      purchase_date: '2026-10-13T08:00:00Z',
      store: 'app_store',
      ...(storeTransactionId ? { store_transaction_id: storeTransactionId } : {}),
    },
  },
  non_subscriptions: {},
});

describe('RevenueCat grants: one paid store transaction, one credit', () => {
  it('credits a pack once when webhook delivery, its retry and /sync all race', async () => {
    const { repository, service } = harness(() => creditPack);
    const userId = await account(repository, 'buyer@example.com');
    const event = { event: { id: 'evt-1', type: 'NON_RENEWING_PURCHASE', app_user_id: userId } };

    const results = await Promise.all([
      service.processWebhook(TOKEN, event),
      service.processWebhook(TOKEN, event),
      service.readStatus(userId, true),
      service.readStatus(userId, true),
      service.readStatus(userId, true),
    ]);
    const replay = await service.processWebhook(TOKEN, event);

    assert.equal(replay.duplicate, true);
    assert.equal(results.length, 5);
    assert.equal((await repository.getWallet(userId)).available, 150);
    const purchases = (await repository.listCreditTransactions(userId)).filter(
      (item) => item.type === 'PURCHASE',
    );
    assert.equal(purchases.length, 1);
  });

  it('does not credit a restored/transferred pack to a second account', async () => {
    const { repository, service } = harness(() => creditPack);
    const buyer = await account(repository, 'buyer@example.com');
    const second = await account(repository, 'second@example.com');

    const first = await service.readStatus(buyer, true);
    const restored = await service.readStatus(second, true);
    const again = await service.readStatus(buyer, true);

    assert.equal(first.creditPackCreditsGranted, 150);
    assert.equal(restored.creditPackCreditsGranted, 0);
    assert.equal(again.creditPackCreditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 150);
    assert.equal((await repository.getWallet(second)).available, 0);
    assert.equal((await repository.listCreditTransactions(second)).length, 0);
  });

  it('honours a pack credited before exclusive references existed', async () => {
    const { repository, service } = harness(() => creditPack);
    const buyer = await account(repository, 'buyer@example.com');
    const second = await account(repository, 'second@example.com');
    // The pre-fix grant shape: same key/reference, no exclusive flag.
    await repository.grantCredits({
      userId: buyer,
      amount: 150,
      type: 'PURCHASE',
      referenceType: 'REVENUECAT_CONSUMABLE',
      referenceId: 'rc-tx-150',
      idempotencyKey: `revenuecat:${buyer}:credit-pack:com.birkareai.credits.150:rc-tx-150`,
    });

    assert.equal((await service.readStatus(buyer, true)).creditPackCreditsGranted, 0);
    assert.equal((await service.readStatus(second, true)).creditPackCreditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 150);
    assert.equal((await repository.getWallet(second)).available, 0);
  });

  it('does not mint a subscription period again for an account it was transferred to', async () => {
    const { repository, service } = harness(() => monthly('2000000999'));
    const buyer = await account(repository, 'buyer@example.com');
    const second = await account(repository, 'second@example.com');

    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);
    const transferred = await service.readStatus(second, true);

    assert.equal(transferred.active, true);
    assert.equal(transferred.creditsGranted, 0);
    assert.equal((await repository.getWallet(second)).available, 0);
  });

  it('keeps a period already credited under the legacy reference idempotent', async () => {
    const { repository, service } = harness(() => monthly('2000000999'));
    const buyer = await account(repository, 'buyer@example.com');
    await repository.grantCredits({
      userId: buyer,
      amount: 80,
      type: 'SUBSCRIPTION_GRANT',
      referenceType: 'REVENUECAT',
      referenceId: 'com.birkareai.pro.monthly',
      idempotencyKey: `revenuecat:${buyer}:monthly:com.birkareai.pro.monthly:2026-10`,
    });

    const status = await service.readStatus(buyer, true);

    assert.equal(status.creditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 80);
  });

  it('credits the next paid renewal, and still grants when the store id is absent', async () => {
    let storeTransactionId: string | undefined = '2000000999';
    let purchaseDate = '2026-10-13T08:00:00Z';
    const { repository, service } = harness(() => {
      const value = monthly(storeTransactionId);
      value.subscriptions['com.birkareai.pro.monthly'].purchase_date = purchaseDate;
      return value;
    });
    const buyer = await account(repository, 'buyer@example.com');

    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);
    storeTransactionId = '2000001000';
    purchaseDate = '2026-11-13T08:00:00Z';
    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);
    storeTransactionId = undefined;
    purchaseDate = '2026-12-13T08:00:00Z';
    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);
    assert.equal((await repository.getWallet(buyer)).available, 240);
  });
});
