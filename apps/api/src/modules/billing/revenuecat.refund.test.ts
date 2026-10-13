import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryRepository } from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { ApiError } from '@birkare/shared';
import { createRevenueCatService, type RevenueCatWebhookEvent } from './revenuecat.service.js';

const NOW = new Date('2026-10-13T09:00:00.000Z');
const TOKEN = 'webhook-token-at-least-24-characters';
const PACK = 'com.birkareai.credits.150';
const MONTHLY = 'com.birkareai.pro.monthly';
const ENTITLEMENT = 'create_an_app_called_birkare_pro';

function config(): BirKareConfig {
  return {
    REVENUECAT_ENABLED: true,
    REVENUECAT_SECRET_API_KEY: 'sk_server_test_only',
    REVENUECAT_WEBHOOK_AUTH_TOKEN: TOKEN,
    REVENUECAT_ENTITLEMENT_ID: ENTITLEMENT,
    REVENUECAT_OFFERING_ID: 'birkare_pro',
    REVENUECAT_MONTHLY_PRODUCT_IDS: `monthly,${MONTHLY}`,
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

function harness(subscriberFor: (userId: string) => unknown) {
  const repository = new MemoryRepository();
  const warnings: Array<Record<string, unknown>> = [];
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
    logger: { warn: (details) => void warnings.push(details) },
  });
  return { repository, service, warnings };
}

/** RevenueCat's own purchase id (`id`) differs from the store's transaction id. */
const pack = (storeTransactionId: string | undefined = 'store-tx-150') => ({
  entitlements: {},
  subscriptions: {},
  non_subscriptions: {
    [PACK]: [
      {
        id: 'rc-tx-150',
        purchase_date: '2026-10-13T08:00:00Z',
        store: 'app_store',
        ...(storeTransactionId ? { store_transaction_id: storeTransactionId } : {}),
      },
    ],
  },
});

const monthly = (
  input: {
    storeTransactionId?: string;
    refundedAt?: string | null;
    purchaseDate?: string;
    entitled?: boolean;
  } = {},
) => {
  const purchaseDate = input.purchaseDate ?? '2026-10-13T08:00:00Z';
  return {
    entitlements:
      input.entitled === false
        ? {}
        : {
            [ENTITLEMENT]: {
              product_identifier: MONTHLY,
              expires_date: '2026-12-13T08:00:00Z',
              purchase_date: purchaseDate,
            },
          },
    subscriptions: {
      [MONTHLY]: {
        expires_date: '2026-12-13T08:00:00Z',
        purchase_date: purchaseDate,
        store: 'app_store',
        store_transaction_id: input.storeTransactionId ?? '2000000999',
        refunded_at: input.refundedAt ?? null,
      },
    },
    non_subscriptions: {},
  };
};

const refundEvent = (
  id: string,
  transactionId: string | null,
  appUserId?: string,
  extra: Record<string, unknown> = {},
): RevenueCatWebhookEvent => ({
  event: {
    id,
    type: 'CANCELLATION',
    cancel_reason: 'CUSTOMER_SUPPORT',
    transaction_id: transactionId,
    ...(appUserId ? { app_user_id: appUserId } : {}),
    ...extra,
  },
});

const refundRows = async (repository: MemoryRepository, userId: string) =>
  (await repository.listCreditTransactions(userId)).filter((item) => item.type === 'REFUND');

describe('RevenueCat refunds claw back exactly what the store transaction granted', () => {
  it('reverses a refunded credit pack once and matches the wallet', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    assert.equal((await service.readStatus(buyer, true)).creditPackCreditsGranted, 150);

    const result = await service.processWebhook(
      TOKEN,
      refundEvent('evt-r1', 'store-tx-150', buyer),
    );

    assert.deepEqual(result.refund, {
      action: 'REFUND',
      matched: 1,
      applied: 1,
      credits: 150,
      shortfall: 0,
    });
    const wallet = await repository.getWallet(buyer);
    assert.equal(wallet.available, 0);
    assert.equal(wallet.reserved, 0);
    const refunds = await refundRows(repository, buyer);
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0]!.amount, -150);
    assert.equal(refunds[0]!.status, 'COMPLETED');
    assert.equal(refunds[0]!.referenceType, 'REVENUECAT_CONSUMABLE');
    assert.equal(refunds[0]!.referenceId, 'rc-tx-150');
    assert.equal(refunds[0]!.availableAfter, 0);
    // RevenueCat may keep listing the refunded purchase: it is never re-credited.
    assert.equal((await service.readStatus(buyer, true)).creditPackCreditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 0);
  });

  it('a replayed delivery and a second event for the same refund deduct once', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);
    // Other credits the customer legitimately owns must survive the refund.
    await repository.grantCredits({
      userId: buyer,
      amount: 40,
      type: 'BONUS',
      referenceType: 'TEST',
      referenceId: 'bonus',
      idempotencyKey: 'test-bonus',
    });
    const event = refundEvent('evt-r1', 'store-tx-150', buyer);

    await service.processWebhook(TOKEN, event);
    const replay = await service.processWebhook(TOKEN, event);
    const second = await service.processWebhook(
      TOKEN,
      refundEvent('evt-r2', 'store-tx-150', buyer),
    );

    assert.equal(replay.duplicate, true);
    assert.deepEqual(second.refund, {
      action: 'REFUND',
      matched: 1,
      applied: 0,
      credits: 0,
      shortfall: 0,
    });
    assert.equal((await repository.getWallet(buyer)).available, 40);
    assert.equal((await refundRows(repository, buyer)).length, 1);
  });

  it('concurrent refund deliveries and syncs deduct exactly once', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);
    const same = refundEvent('evt-same', 'store-tx-150', buyer);

    await Promise.all([
      service.processWebhook(TOKEN, same),
      service.processWebhook(TOKEN, same),
      service.processWebhook(TOKEN, refundEvent('evt-a', 'store-tx-150', buyer)),
      service.processWebhook(TOKEN, refundEvent('evt-b', 'store-tx-150', buyer)),
      service.processWebhook(TOKEN, refundEvent('evt-c', 'store-tx-150')),
      service.readStatus(buyer, true),
      service.readStatus(buyer, true),
    ]);

    assert.equal((await repository.getWallet(buyer)).available, 0);
    assert.equal((await refundRows(repository, buyer)).length, 1);
    assert.equal(
      (await repository.listCreditTransactions(buyer)).filter((item) => item.type === 'PURCHASE')
        .length,
      1,
    );
  });

  it('never drives the wallet negative and leaves reserved credits alone', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);
    // 100 already spent, 30 held by a generation that is still running.
    await repository.reserveCredits({ userId: buyer, generationId: 'gen-spent', amount: 100 });
    await repository.captureCredits({ userId: buyer, generationId: 'gen-spent', amount: 100 });
    await repository.reserveCredits({ userId: buyer, generationId: 'gen-running', amount: 30 });
    assert.deepEqual(
      (({ available, reserved }) => ({ available, reserved }))(await repository.getWallet(buyer)),
      { available: 20, reserved: 30 },
    );

    const result = await service.processWebhook(
      TOKEN,
      refundEvent('evt-r1', 'store-tx-150', buyer),
    );

    assert.deepEqual(result.refund, {
      action: 'REFUND',
      matched: 1,
      applied: 1,
      credits: 20,
      shortfall: 130,
    });
    const wallet = await repository.getWallet(buyer);
    assert.equal(wallet.available, 0);
    assert.equal(wallet.reserved, 30);
    const [refund] = await refundRows(repository, buyer);
    assert.equal(refund!.amount, -20);
    assert.equal(refund!.reservedAfter, 30);
    assert.match(refund!.description ?? '', /130 kredi/);
    // The running generation still settles normally afterwards.
    const released = await repository.releaseCredits({
      userId: buyer,
      generationId: 'gen-running',
      amount: 30,
    });
    assert.equal(released.wallet.available, 30);
    assert.equal(released.wallet.reserved, 0);
    // The shortfall is not collected later from credits the customer gets back.
    await service.processWebhook(TOKEN, refundEvent('evt-r2', 'store-tx-150', buyer));
    assert.equal((await repository.getWallet(buyer)).available, 30);
  });

  it('acknowledges a refund for a transaction that was never granted and does nothing', async () => {
    const { repository, service, warnings } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);

    const unknown = await service.processWebhook(
      TOKEN,
      refundEvent('evt-u1', 'some-other-store-tx', buyer),
    );
    const nobody = await service.processWebhook(TOKEN, refundEvent('evt-u2', 'store-tx-999'));
    const anonymous = await service.processWebhook(
      TOKEN,
      refundEvent('evt-u3', 'store-tx-998', '$RCAnonymousID:0123456789abcdef'),
    );
    const noTransaction = await service.processWebhook(TOKEN, refundEvent('evt-u4', null, buyer));

    for (const result of [unknown, nobody, anonymous, noTransaction]) {
      assert.equal(result.duplicate, false);
      assert.equal(result.refund?.matched, 0);
      assert.equal(result.refund?.applied, 0);
    }
    assert.equal(nobody.processed, false);
    assert.equal(warnings.length, 4);
    assert.equal((await repository.getWallet(buyer)).available, 150);
    assert.equal((await refundRows(repository, buyer)).length, 0);
  });

  it('only a refund cancellation deducts: unsubscribe and billing errors do not', async () => {
    const { repository, service } = harness(() => monthly());
    const buyer = await account(repository, 'buyer@example.com');
    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);

    for (const reason of ['UNSUBSCRIBE', 'BILLING_ERROR', 'DEVELOPER_INITIATED', 'UNKNOWN']) {
      const result = await service.processWebhook(TOKEN, {
        event: {
          id: `evt-${reason}`,
          type: 'CANCELLATION',
          cancel_reason: reason,
          transaction_id: '2000000999',
          app_user_id: buyer,
        },
      });
      assert.equal(result.refund, undefined);
    }
    await service.processWebhook(TOKEN, {
      event: {
        id: 'evt-exp',
        type: 'EXPIRATION',
        transaction_id: '2000000999',
        app_user_id: buyer,
      },
    });

    assert.equal((await repository.getWallet(buyer)).available, 80);
    // A non-refund event without a BirKare account is still rejected as before.
    await assert.rejects(
      () =>
        service.processWebhook(TOKEN, {
          event: { id: 'evt-x', type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' },
        }),
      (error: unknown) => error instanceof ApiError && error.code === 'REVENUECAT_WEBHOOK_INVALID',
    );
  });

  it('reverses a refunded subscription period by its store transaction id', async () => {
    let refunded = false;
    const { repository, service } = harness(() =>
      refunded ? monthly({ entitled: false, refundedAt: '2026-10-13T08:30:00Z' }) : monthly(),
    );
    const buyer = await account(repository, 'buyer@example.com');
    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);
    refunded = true;

    const result = await service.processWebhook(TOKEN, refundEvent('evt-s1', '2000000999', buyer));

    assert.equal(result.refund?.credits, 80);
    assert.equal(result.status?.active, false);
    assert.equal((await repository.getWallet(buyer)).available, 0);
    const [refund] = await refundRows(repository, buyer);
    assert.equal(refund!.referenceType, 'REVENUECAT');
    assert.equal(refund!.referenceId, '2000000999:2026-10');
    // A different period's transaction is untouched by this refund.
    assert.equal(
      (await service.processWebhook(TOKEN, refundEvent('evt-s2', '2000000998', buyer))).refund
        ?.matched,
      0,
    );
  });

  it('/sync reconciles a subscription RevenueCat marks refunded, once, without re-granting', async () => {
    let refundedAt: string | null = null;
    const { repository, service } = harness(() => monthly({ refundedAt }));
    const buyer = await account(repository, 'buyer@example.com');
    assert.equal((await service.readStatus(buyer, true)).creditsGranted, 80);

    // Refunded while the store left the entitlement active.
    refundedAt = '2026-10-13T08:45:00Z';
    const first = await service.readStatus(buyer, true);
    const second = await service.readStatus(buyer, true);

    assert.equal(first.creditsRevoked, 80);
    assert.equal(first.creditsGranted, 0);
    assert.equal(second.creditsRevoked, 0);
    assert.equal(second.creditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 0);
    assert.equal((await refundRows(repository, buyer)).length, 1);
    // The webhook for the same refund arriving later finds it already applied.
    const late = await service.processWebhook(TOKEN, refundEvent('evt-late', '2000000999', buyer));
    assert.equal(late.refund?.applied, 0);
    assert.equal((await repository.getWallet(buyer)).available, 0);
  });

  it('ignores a refund marker that predates the currently paid period', async () => {
    const { repository, service } = harness(() =>
      monthly({
        storeTransactionId: '2000001000',
        purchaseDate: '2026-10-13T08:00:00Z',
        refundedAt: '2026-09-20T10:00:00Z',
      }),
    );
    const buyer = await account(repository, 'buyer@example.com');

    const status = await service.readStatus(buyer, true);

    assert.equal(status.creditsGranted, 80);
    assert.equal(status.creditsRevoked, 0);
    assert.equal((await repository.getWallet(buyer)).available, 80);
  });

  it('finds a pack credited before store ids were recorded through RevenueCat’s purchase list', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    // Pre-existing grant shape: RevenueCat id as reference, no store id kept.
    await repository.grantCredits({
      userId: buyer,
      amount: 150,
      type: 'PURCHASE',
      referenceType: 'REVENUECAT_CONSUMABLE',
      referenceId: 'rc-tx-150',
      idempotencyKey: `revenuecat:${buyer}:credit-pack:${PACK}:rc-tx-150`,
      exclusiveReference: true,
    });

    const result = await service.processWebhook(
      TOKEN,
      refundEvent('evt-l1', 'store-tx-150', buyer),
    );

    assert.equal(result.refund?.credits, 150);
    assert.equal((await repository.getWallet(buyer)).available, 0);
  });

  it('still finds a recorded pack after RevenueCat stops listing the refunded purchase', async () => {
    let listed = true;
    const { repository, service } = harness(() =>
      listed ? pack() : { entitlements: {}, subscriptions: {}, non_subscriptions: {} },
    );
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);
    listed = false;

    const result = await service.processWebhook(
      TOKEN,
      refundEvent('evt-d1', 'store-tx-150', buyer),
    );

    assert.equal(result.refund?.credits, 150);
    assert.equal((await repository.getWallet(buyer)).available, 0);
  });

  it('deducts from the account that was credited, even if the event names another account', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    const other = await account(repository, 'other@example.com');
    await service.readStatus(buyer, true);
    await repository.grantCredits({
      userId: other,
      amount: 60,
      type: 'BONUS',
      referenceType: 'TEST',
      referenceId: 'bonus',
      idempotencyKey: 'other-bonus',
    });

    await service.processWebhook(TOKEN, refundEvent('evt-t1', 'store-tx-150', other));

    assert.equal((await repository.getWallet(buyer)).available, 0);
    assert.equal((await repository.getWallet(other)).available, 60);
    assert.equal((await refundRows(repository, other)).length, 0);
  });

  it('a reversed refund restores the grant exactly once and is never clawed back again', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);
    await repository.reserveCredits({ userId: buyer, generationId: 'gen-spent', amount: 100 });
    await repository.captureCredits({ userId: buyer, generationId: 'gen-spent', amount: 100 });
    await service.processWebhook(TOKEN, refundEvent('evt-r1', 'store-tx-150', buyer));
    assert.equal((await repository.getWallet(buyer)).available, 0);
    const reversed = (id: string): RevenueCatWebhookEvent => ({
      event: { id, type: 'REFUND_REVERSED', transaction_id: 'store-tx-150', app_user_id: buyer },
    });

    const results = await Promise.all([
      service.processWebhook(TOKEN, reversed('evt-v1')),
      service.processWebhook(TOKEN, reversed('evt-v2')),
    ]);
    const replay = await service.processWebhook(TOKEN, reversed('evt-v1'));

    // Only the 50 credits the refund actually removed come back.
    assert.equal(
      results.reduce((sum, item) => sum + (item.refund?.credits ?? 0), 0),
      50,
    );
    assert.equal(results.filter((item) => item.refund?.applied === 1).length, 1);
    assert.equal(replay.duplicate, true);
    assert.equal((await repository.getWallet(buyer)).available, 50);
    assert.equal((await refundRows(repository, buyer))[0]!.status, 'REVERSED');
    assert.equal(
      (await repository.listCreditTransactions(buyer)).filter(
        (item) => item.referenceType === 'CREDIT_REFUND_REVERSAL',
      ).length,
      1,
    );
    // Not a double grant either: the purchase itself is still credited once.
    assert.equal((await service.readStatus(buyer, true)).creditPackCreditsGranted, 0);
    assert.equal((await repository.getWallet(buyer)).available, 50);
    // A later stale refund signal cannot take the restored credits away again.
    const again = await service.processWebhook(TOKEN, refundEvent('evt-r9', 'store-tx-150', buyer));
    assert.equal(again.refund?.applied, 0);
    assert.equal((await repository.getWallet(buyer)).available, 50);
  });

  it('a refund reversal without a prior refund grants nothing', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await service.readStatus(buyer, true);

    const result = await service.processWebhook(TOKEN, {
      event: {
        id: 'evt-v1',
        type: 'REFUND_REVERSED',
        transaction_id: 'store-tx-150',
        app_user_id: buyer,
      },
    });

    assert.deepEqual(result.refund, {
      action: 'REFUND_REVERSED',
      matched: 1,
      applied: 0,
      credits: 0,
      shortfall: 0,
    });
    assert.equal((await repository.getWallet(buyer)).available, 150);
  });

  it('applies a refund to an account that is pending deletion', async () => {
    const { repository, service } = harness(() => pack());
    const buyer = await account(repository, 'buyer@example.com');
    await repository.updateUser(buyer, { status: 'ACTIVE', emailVerifiedAt: NOW });
    await service.readStatus(buyer, true);
    await repository.requestAccountDeletion(buyer);

    const result = await service.processWebhook(
      TOKEN,
      refundEvent('evt-r1', 'store-tx-150', buyer),
    );

    assert.equal(result.refund?.credits, 150);
    assert.equal((await repository.getWallet(buyer)).available, 0);
  });
});
