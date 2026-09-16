import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import type {
  BirKareRepository,
  CreditTransactionRecord,
  CreditWalletRecord,
  GrantCreditsInput,
} from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { createRevenueCatService } from './revenuecat.service.js';

const fixedNow = new Date('2026-09-11T12:00:00.000Z');
const USER_ID = '00000000-0000-4000-8000-000000000001';

function config(overrides: Partial<BirKareConfig> = {}) {
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
    ...overrides,
  } as BirKareConfig;
}

function subscriber(productId: string, input?: { expires?: string | null; sandbox?: boolean }) {
  const subscription = {
    expires_date: input?.expires === undefined ? '2026-10-11T12:00:00.000Z' : input.expires,
    purchase_date: '2026-09-11T10:00:00.000Z',
    original_purchase_date: '2026-01-11T10:00:00.000Z',
    store: 'app_store',
    is_sandbox: input?.sandbox ?? true,
    unsubscribe_detected_at: null,
  };
  return {
    subscriber: {
      entitlements: {
        create_an_app_called_birkare_pro: {
          product_identifier: productId,
          expires_date: subscription.expires_date,
          purchase_date: subscription.purchase_date,
        },
      },
      subscriptions:
        productId === 'lifetime' || productId.endsWith('.lifetime')
          ? {}
          : { [productId]: subscription },
      non_subscriptions:
        productId === 'lifetime' || productId.endsWith('.lifetime')
          ? {
              [productId]: [
                {
                  id: 'transaction-lifetime-1',
                  purchase_date: '2026-09-10T10:00:00.000Z',
                  original_purchase_date: '2026-09-10T10:00:00.000Z',
                  store: 'app_store',
                  is_sandbox: input?.sandbox ?? true,
                },
              ],
            }
          : {},
    },
  };
}

function fixture(payload: unknown, configOverrides: Partial<BirKareConfig> = {}) {
  const idempotency = new Map<string, unknown>();
  const grants = new Map<string, CreditTransactionRecord>();
  let grantCalls = 0;
  let available = 0;
  const wallet = (): CreditWalletRecord => ({
    id: 'wallet-1',
    userId: USER_ID,
    available,
    reserved: 0,
    lifetimeEarned: Math.max(available, 0),
    lifetimeSpent: 0,
    version: grants.size,
    createdAt: fixedNow,
    updatedAt: fixedNow,
  });
  const repository = {
    getUserById: async (id: string) =>
      id === USER_ID
        ? ({ id, deletedAt: null } as Awaited<ReturnType<BirKareRepository['getUserById']>>)
        : null,
    getWallet: async () => wallet(),
    grantCredits: async (input: GrantCreditsInput) => {
      grantCalls += 1;
      const previous = grants.get(input.idempotencyKey);
      if (previous) return { wallet: wallet(), transaction: previous, created: false };
      available += input.amount;
      const transaction = {
        id: `tx-${grants.size + 1}`,
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
        createdAt: fixedNow,
        completedAt: fixedNow,
      } satisfies CreditTransactionRecord;
      grants.set(input.idempotencyKey, transaction);
      return { wallet: wallet(), transaction, created: true };
    },
    getIdempotency: async (route: string, key: string) =>
      idempotency.get(`${route}:${key}`) ?? null,
    putIdempotency: async (record: { route: string; key: string }) => {
      const value = { ...record, id: 'idem-1', createdAt: fixedNow };
      idempotency.set(`${record.route}:${record.key}`, value);
      return value;
    },
  } as unknown as BirKareRepository;
  const fetchImpl = async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const service = createRevenueCatService({
    config: config(configOverrides),
    repository,
    fetchImpl,
    now: () => fixedNow,
  });
  return { service, repository, fetchImpl, grants, wallet, grantCalls: () => grantCalls };
}

describe('RevenueCat server verification and credit grants', () => {
  it('grants one monthly period exactly once', async () => {
    const f = fixture(subscriber('com.birkareai.pro.monthly'));
    const first = await f.service.readStatus(USER_ID, true);
    const second = await f.service.readStatus(USER_ID, true);
    assert.deepEqual(
      {
        active: first.active,
        plan: first.plan,
        creditsGranted: first.creditsGranted,
        environment: first.environment,
      },
      { active: true, plan: 'monthly', creditsGranted: 80, environment: 'sandbox' },
    );
    assert.equal(second.creditsGranted, 0);
    assert.equal(f.wallet().available, 80);
    assert.equal(f.grantCalls(), 2);
    assert.match([...f.grants.keys()][0]!, new RegExp(`revenuecat:${USER_ID}:monthly`));
  });

  it('grants the current month for an annual subscriber without backfill', async () => {
    const f = fixture(subscriber('com.birkareai.pro.yearly'));
    const status = await f.service.readStatus(USER_ID, true);
    assert.deepEqual(
      { active: status.active, plan: status.plan, creditsGranted: status.creditsGranted },
      { active: true, plan: 'annual', creditsGranted: 80 },
    );
    assert.match([...f.grants.keys()][0]!, /2026-09/);
  });

  it('grants lifetime starting credits once and reports no expiration', async () => {
    const f = fixture(subscriber('com.birkareai.pro.lifetime', { expires: null }));
    const first = await f.service.readStatus(USER_ID, true);
    const second = await f.service.readStatus(USER_ID, true);
    assert.deepEqual(
      {
        active: first.active,
        plan: first.plan,
        expiresAt: first.expiresAt,
        creditsGranted: first.creditsGranted,
      },
      { active: true, plan: 'lifetime', expiresAt: null, creditsGranted: 200 },
    );
    assert.equal(second.creditsGranted, 0);
    assert.equal(f.wallet().available, 200);
  });

  it('does not grant an expired entitlement', async () => {
    const f = fixture(subscriber('monthly', { expires: '2026-09-10T12:00:00.000Z' }));
    const status = await f.service.readStatus(USER_ID, true);
    assert.equal(status.active, false);
    assert.equal(status.creditsGranted, 0);
    assert.equal(f.grantCalls(), 0);
  });

  it('fails closed when RevenueCat is disabled', async () => {
    const service = createRevenueCatService({
      config: config({ REVENUECAT_ENABLED: false }),
      repository: {} as BirKareRepository,
      now: () => fixedNow,
    });
    const status = await service.readStatus(USER_ID);
    assert.deepEqual(
      { configured: status.configured, active: status.active },
      { configured: false, active: false },
    );
    await assert.rejects(
      service.assertActive(USER_ID),
      (error: unknown) => (error as { code?: string }).code === 'BIRKARE_PRO_REQUIRED',
    );
  });

  it('authenticates and de-duplicates RevenueCat webhooks', async () => {
    const f = fixture(subscriber('monthly'));
    const payload = {
      api_version: '1.0',
      event: {
        id: 'event-1',
        type: 'INITIAL_PURCHASE',
        app_user_id: USER_ID,
        product_id: 'monthly',
        entitlement_ids: ['create_an_app_called_birkare_pro'],
        environment: 'SANDBOX',
      },
    };
    await assert.rejects(
      f.service.processWebhook('wrong-token', payload),
      (error: unknown) => (error as { code?: string }).code === 'REVENUECAT_WEBHOOK_UNAUTHORIZED',
    );
    const first = await f.service.processWebhook(
      'Bearer webhook-token-at-least-24-characters',
      payload,
    );
    assert.deepEqual(
      { duplicate: first.duplicate, processed: first.processed },
      {
        duplicate: false,
        processed: true,
      },
    );
    assert.deepEqual(
      await f.service.processWebhook('webhook-token-at-least-24-characters', payload),
      {
        duplicate: true,
        processed: true,
      },
    );

    await assert.rejects(
      f.service.processWebhook('webhook-token-at-least-24-characters', {
        ...payload,
        event: { ...payload.event, product_id: 'yearly' },
      }),
      (error: unknown) => (error as { code?: string }).code === 'REVENUECAT_WEBHOOK_CONFLICT',
    );
  });

  it('rejects invalid event identifiers and accepts a BirKare UUID from aliases', async () => {
    const f = fixture(subscriber('monthly'));
    await assert.rejects(
      f.service.processWebhook('webhook-token-at-least-24-characters', {
        event: { id: '../event', app_user_id: 'anonymous-revenuecat-id' },
      }),
      (error: unknown) => (error as { code?: string }).code === 'REVENUECAT_WEBHOOK_INVALID',
    );

    const result = await f.service.processWebhook('webhook-token-at-least-24-characters', {
      event: {
        id: 'event-alias-1',
        type: 'INITIAL_PURCHASE',
        app_user_id: '$RCAnonymousID:fixture',
        aliases: ['$RCAnonymousID:fixture', USER_ID],
      },
    });
    assert.equal(result.processed, true);
  });

  it('verifies the RevenueCat HMAC over the exact raw body and rejects stale signatures', async () => {
    const signingSecret = 'fixture-revenuecat-signing-secret-at-least-32';
    const payload = {
      event: { id: 'event-hmac-1', type: 'RENEWAL', app_user_id: USER_ID },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(fixedNow.getTime() / 1000));
    const signature = createHmac('sha256', signingSecret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    const f = fixture(subscriber('monthly'), {
      REVENUECAT_WEBHOOK_SIGNING_SECRET: signingSecret,
    });

    const accepted = await f.service.processWebhook(
      'webhook-token-at-least-24-characters',
      payload,
      { signature: `t=${timestamp},v1=${signature}`, rawBody },
    );
    assert.equal(accepted.processed, true);

    await assert.rejects(
      f.service.processWebhook(
        'webhook-token-at-least-24-characters',
        { event: { ...payload.event, id: 'event-hmac-2' } },
        { signature: `t=${Number(timestamp) - 301},v1=${signature}`, rawBody },
      ),
      (error: unknown) =>
        (error as { code?: string }).code === 'REVENUECAT_WEBHOOK_SIGNATURE_INVALID',
    );
  });
});
