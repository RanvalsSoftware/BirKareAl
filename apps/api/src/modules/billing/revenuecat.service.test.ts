import { describe, expect, it, vi } from 'vitest';
import type {
  BirKareRepository,
  CreditTransactionRecord,
  CreditWalletRecord,
  GrantCreditsInput,
} from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { createRevenueCatService } from './revenuecat.service.js';

const fixedNow = new Date('2026-09-11T12:00:00.000Z');

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
    REVENUECAT_ANNUAL_MONTHLY_CREDITS: 100,
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
      subscriptions: productId === 'lifetime' || productId.endsWith('.lifetime') ? {} : { [productId]: subscription },
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

function fixture(payload: unknown) {
  const idempotency = new Map<string, unknown>();
  const grants = new Map<string, CreditTransactionRecord>();
  let available = 0;
  const wallet = (): CreditWalletRecord => ({
    id: 'wallet-1',
    userId: 'user-1',
    available,
    reserved: 0,
    lifetimeEarned: Math.max(available, 0),
    lifetimeSpent: 0,
    version: grants.size,
    createdAt: fixedNow,
    updatedAt: fixedNow,
  });
  const repository = {
    getUserById: vi.fn(async (id: string) =>
      id === 'user-1'
        ? ({ id, deletedAt: null } as Awaited<ReturnType<BirKareRepository['getUserById']>>)
        : null,
    getWallet: vi.fn(async () => wallet()),
    grantCredits: vi.fn(async (input: GrantCreditsInput) => {
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
    }),
    getIdempotency: vi.fn(async (route: string, key: string) => idempotency.get(`${route}:${key}`) ?? null),
    putIdempotency: vi.fn(async (record: { route: string; key: string }) => {
      const value = { ...record, id: 'idem-1', createdAt: fixedNow };
      idempotency.set(`${record.route}:${record.key}`, value);
      return value;
    }),
  } as unknown as BirKareRepository;
  const fetchImpl = vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  const service = createRevenueCatService({
    config: config(),
    repository,
    fetchImpl,
    now: () => fixedNow,
  });
  return { service, repository, fetchImpl, grants, wallet };
}

describe('RevenueCat server verification and credit grants', () => {
  it('grants one monthly period exactly once', async () => {
    const f = fixture(subscriber('com.birkareai.pro.monthly'));
    const first = await f.service.readStatus('user-1', true);
    const second = await f.service.readStatus('user-1', true);
    expect(first).toMatchObject({ active: true, plan: 'monthly', creditsGranted: 80, environment: 'sandbox' });
    expect(second.creditsGranted).toBe(0);
    expect(f.wallet().available).toBe(80);
    expect(f.repository.grantCredits).toHaveBeenCalledTimes(2);
  });

  it('grants the current month for an annual subscriber without backfill', async () => {
    const f = fixture(subscriber('com.birkareai.pro.yearly'));
    const status = await f.service.readStatus('user-1', true);
    expect(status).toMatchObject({ active: true, plan: 'annual', creditsGranted: 100 });
    expect([...f.grants.keys()][0]).toContain('2026-09');
  });

  it('grants lifetime starting credits once and reports no expiration', async () => {
    const f = fixture(subscriber('com.birkareai.pro.lifetime', { expires: null }));
    const first = await f.service.readStatus('user-1', true);
    const second = await f.service.readStatus('user-1', true);
    expect(first).toMatchObject({ active: true, plan: 'lifetime', expiresAt: null, creditsGranted: 200 });
    expect(second.creditsGranted).toBe(0);
    expect(f.wallet().available).toBe(200);
  });

  it('does not grant an expired entitlement', async () => {
    const f = fixture(subscriber('monthly', { expires: '2026-09-10T12:00:00.000Z' }));
    const status = await f.service.readStatus('user-1', true);
    expect(status.active).toBe(false);
    expect(status.creditsGranted).toBe(0);
    expect(f.repository.grantCredits).not.toHaveBeenCalled();
  });

  it('fails closed when RevenueCat is disabled', async () => {
    const service = createRevenueCatService({
      config: config({ REVENUECAT_ENABLED: false }),
      repository: {} as BirKareRepository,
      now: () => fixedNow,
    });
    expect(await service.readStatus('user-1')).toMatchObject({ configured: false, active: false });
    await expect(service.assertActive('user-1')).rejects.toMatchObject({ code: 'BIRKARE_PRO_REQUIRED' });
  });

  it('authenticates and de-duplicates RevenueCat webhooks', async () => {
    const f = fixture(subscriber('monthly'));
    const payload = {
      api_version: '1.0',
      event: {
        id: 'event-1',
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user-1',
        product_id: 'monthly',
        entitlement_ids: ['create_an_app_called_birkare_pro'],
        environment: 'SANDBOX',
      },
    };
    await expect(f.service.processWebhook('wrong-token', payload)).rejects.toMatchObject({
      code: 'REVENUECAT_WEBHOOK_UNAUTHORIZED',
    });
    expect(await f.service.processWebhook('Bearer webhook-token-at-least-24-characters', payload)).toMatchObject({
      duplicate: false,
      processed: true,
    });
    expect(await f.service.processWebhook('webhook-token-at-least-24-characters', payload)).toEqual({
      duplicate: true,
      processed: true,
    });
  });
});
