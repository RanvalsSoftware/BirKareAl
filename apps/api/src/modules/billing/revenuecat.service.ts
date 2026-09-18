import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { BirKareConfig } from '@birkare/config';
import type { BirKareRepository, CreditTransactionRecord } from '@birkare/database';
import { BIRKARE_CREDIT_PRODUCTS, conflict, forbidden, unavailable } from '@birkare/shared';

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
const REVENUECAT_EVENT_ID = /^[A-Za-z0-9._:$-]{1,200}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RevenueCatPlan = 'monthly' | 'annual' | 'lifetime' | 'unknown';

export type RevenueCatSubscriptionStatus = {
  configured: boolean;
  active: boolean;
  entitlementId: string;
  productId: string | null;
  plan: RevenueCatPlan;
  expiresAt: string | null;
  willRenew: boolean;
  environment: 'sandbox' | 'production' | 'unknown';
  store: string | null;
  creditsGranted: number;
  creditPackCreditsGranted: number;
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
};

type RevenueCatSubscription = {
  expires_date?: string | null;
  purchase_date?: string | null;
  original_purchase_date?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
};

type RevenueCatNonSubscription = {
  id?: string | null;
  purchase_date?: string | null;
  original_purchase_date?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
};

type RevenueCatSubscriber = {
  entitlements?: Record<string, RevenueCatEntitlement>;
  subscriptions?: Record<string, RevenueCatSubscription>;
  non_subscriptions?: Record<string, RevenueCatNonSubscription[]>;
};

type RevenueCatSubscriberResponse = {
  subscriber?: RevenueCatSubscriber;
};

export type RevenueCatWebhookEvent = {
  api_version?: string;
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    product_id?: string;
    entitlement_ids?: string[];
    transaction_id?: string;
    original_transaction_id?: string;
    environment?: string;
  };
};

type RevenueCatConfig = Pick<
  BirKareConfig,
  | 'REVENUECAT_ENABLED'
  | 'REVENUECAT_SECRET_API_KEY'
  | 'REVENUECAT_WEBHOOK_AUTH_TOKEN'
  | 'REVENUECAT_WEBHOOK_SIGNING_SECRET'
  | 'REVENUECAT_ENTITLEMENT_ID'
  | 'REVENUECAT_OFFERING_ID'
  | 'REVENUECAT_MONTHLY_PRODUCT_IDS'
  | 'REVENUECAT_ANNUAL_PRODUCT_IDS'
  | 'REVENUECAT_LIFETIME_PRODUCT_IDS'
  | 'REVENUECAT_MONTHLY_CREDITS'
  | 'REVENUECAT_ANNUAL_MONTHLY_CREDITS'
  | 'REVENUECAT_LIFETIME_CREDITS'
  | 'REVENUECAT_REQUEST_TIMEOUT_MS'
  | 'REVENUECAT_CACHE_TTL_MS'
>;

type Dependencies = {
  config: RevenueCatConfig;
  repository: BirKareRepository;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type CachedStatus = { expiresAt: number; value: RevenueCatSubscriptionStatus };

function csvSet(value: string): Set<string> {
  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function utcMonthKey(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function safeTokenEquals(received: string, expected: string): boolean {
  const normalize = (value: string) => value.trim().replace(/^Bearer\s+/i, '');
  const left = Buffer.from(normalize(received));
  const right = Buffer.from(normalize(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

function hashBody(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function verifyWebhookSignature(input: {
  header?: string;
  rawBody?: Buffer;
  secret: string;
  now: Date;
}): boolean {
  if (!input.header || !input.rawBody) return false;
  const parts = new Map(
    input.header.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')] as const;
    }),
  );
  const timestamp = parts.get('t');
  const receivedHex = parts.get('v1');
  if (
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    !receivedHex ||
    !/^[0-9a-f]{64}$/i.test(receivedHex)
  ) {
    return false;
  }
  const timestampSeconds = Number(timestamp);
  if (Math.abs(Math.floor(input.now.getTime() / 1000) - timestampSeconds) > 5 * 60) return false;
  const expectedHex = createHmac('sha256', input.secret)
    .update(timestamp)
    .update('.')
    .update(input.rawBody)
    .digest('hex');
  const received = Buffer.from(receivedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createRevenueCatService(dependencies: Dependencies) {
  const { config, repository } = dependencies;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const cache = new Map<string, CachedStatus>();
  const monthlyProducts = csvSet(config.REVENUECAT_MONTHLY_PRODUCT_IDS);
  const annualProducts = csvSet(config.REVENUECAT_ANNUAL_PRODUCT_IDS);
  const lifetimeProducts = csvSet(config.REVENUECAT_LIFETIME_PRODUCT_IDS);

  const configured = () =>
    config.REVENUECAT_ENABLED &&
    Boolean(config.REVENUECAT_SECRET_API_KEY?.trim().startsWith('sk_'));

  function planFor(productId: string | null): RevenueCatPlan {
    if (!productId) return 'unknown';
    if (monthlyProducts.has(productId)) return 'monthly';
    if (annualProducts.has(productId)) return 'annual';
    if (lifetimeProducts.has(productId)) return 'lifetime';
    return 'unknown';
  }

  async function subscriber(userId: string): Promise<RevenueCatSubscriber | undefined> {
    if (!configured()) {
      throw unavailable(
        'REVENUECAT_NOT_CONFIGURED',
        'Abonelik doğrulama servisi henüz yapılandırılmadı.',
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.REVENUECAT_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(
        `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${config.REVENUECAT_SECRET_API_KEY}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );
      if (response.status === 404) return undefined;
      if (!response.ok) {
        throw unavailable(
          'REVENUECAT_UPSTREAM_ERROR',
          'Abonelik durumu doğrulanamadı. Biraz sonra tekrar deneyin.',
        );
      }
      return ((await response.json()) as RevenueCatSubscriberResponse).subscriber;
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw unavailable(
        'REVENUECAT_UNAVAILABLE',
        'Abonelik doğrulama servisine ulaşılamadı. Biraz sonra tekrar deneyin.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async function grant(
    userId: string,
    productId: string,
    plan: Exclude<RevenueCatPlan, 'unknown'>,
    periodKey: string,
  ): Promise<{ credits: number; transaction: CreditTransactionRecord | null }> {
    const amount =
      plan === 'monthly'
        ? config.REVENUECAT_MONTHLY_CREDITS
        : plan === 'annual'
          ? config.REVENUECAT_ANNUAL_MONTHLY_CREDITS
          : config.REVENUECAT_LIFETIME_CREDITS;
    if (amount <= 0) return { credits: 0, transaction: null };

    const result = await repository.grantCredits({
      userId,
      amount,
      type: plan === 'lifetime' ? 'PURCHASE' : 'SUBSCRIPTION_GRANT',
      referenceType: 'REVENUECAT',
      referenceId: productId,
      idempotencyKey: `revenuecat:${userId}:${plan}:${productId}:${periodKey}`,
      description:
        plan === 'monthly'
          ? 'BirKare Pro aylık dönem kredisi'
          : plan === 'annual'
            ? 'BirKare Pro yıllık plan aylık kredisi'
            : 'BirKare Pro ömür boyu başlangıç kredisi',
    });
    return { credits: result.created ? amount : 0, transaction: result.transaction };
  }

  async function grantCreditPackPurchases(
    userId: string,
    data: RevenueCatSubscriber | undefined,
  ): Promise<number> {
    let creditsGranted = 0;
    for (const pack of BIRKARE_CREDIT_PRODUCTS) {
      for (const purchase of data?.non_subscriptions?.[pack.productId] ?? []) {
        const transactionId = purchase.id?.trim();
        if (!transactionId) continue;
        const result = await repository.grantCredits({
          userId,
          amount: pack.credits,
          type: 'PURCHASE',
          referenceType: 'REVENUECAT_CONSUMABLE',
          referenceId: transactionId,
          idempotencyKey: `revenuecat:${userId}:credit-pack:${pack.productId}:${transactionId}`,
          description: `BirKare ${pack.credits} kredi paketi`,
        });
        if (result.created) creditsGranted += pack.credits;
      }
    }
    return creditsGranted;
  }

  async function readStatus(userId: string, force = false): Promise<RevenueCatSubscriptionStatus> {
    const timestamp = now().getTime();
    const cached = cache.get(userId);
    if (!force && cached && cached.expiresAt > timestamp) return cached.value;

    if (!configured()) {
      return {
        configured: false,
        active: false,
        entitlementId: config.REVENUECAT_ENTITLEMENT_ID,
        productId: null,
        plan: 'unknown',
        expiresAt: null,
        willRenew: false,
        environment: 'unknown',
        store: null,
        creditsGranted: 0,
        creditPackCreditsGranted: 0,
      };
    }

    const data = await subscriber(userId);
    const creditPackCreditsGranted = await grantCreditPackPurchases(userId, data);
    const entitlement = data?.entitlements?.[config.REVENUECAT_ENTITLEMENT_ID];
    const productId = entitlement?.product_identifier ?? null;
    const plan = planFor(productId);
    const expires = validDate(entitlement?.expires_date);
    const active = Boolean(entitlement) && (!expires || expires.getTime() > timestamp);
    const subscription = productId ? data?.subscriptions?.[productId] : undefined;
    const nonSubscription = productId ? data?.non_subscriptions?.[productId]?.at(-1) : undefined;
    const source = subscription ?? nonSubscription;
    let creditsGranted = 0;

    if (active && productId && plan !== 'unknown') {
      if (plan === 'lifetime') {
        const lifetimeKey =
          nonSubscription?.id ||
          nonSubscription?.original_purchase_date ||
          nonSubscription?.purchase_date ||
          'first-purchase';
        creditsGranted = (await grant(userId, productId, plan, lifetimeKey)).credits;
      } else if (plan === 'monthly') {
        const period = validDate(subscription?.purchase_date) ?? now();
        creditsGranted = (await grant(userId, productId, plan, utcMonthKey(period))).credits;
      } else {
        creditsGranted = (await grant(userId, productId, plan, utcMonthKey(now()))).credits;
      }
    }

    const value: RevenueCatSubscriptionStatus = {
      configured: true,
      active,
      entitlementId: config.REVENUECAT_ENTITLEMENT_ID,
      productId,
      plan,
      expiresAt: expires?.toISOString() ?? null,
      willRenew: Boolean(subscription && !subscription.unsubscribe_detected_at),
      environment: source?.is_sandbox === true ? 'sandbox' : source ? 'production' : 'unknown',
      store: source?.store ?? null,
      creditsGranted,
      creditPackCreditsGranted,
    };
    cache.set(userId, { expiresAt: timestamp + config.REVENUECAT_CACHE_TTL_MS, value });
    return value;
  }

  async function assertActive(userId: string): Promise<RevenueCatSubscriptionStatus> {
    const status = await readStatus(userId);
    if (!status.active) {
      throw forbidden('BIRKARE_PRO_REQUIRED', 'Bu özellik için aktif BirKare Pro erişimi gerekir.');
    }
    return status;
  }

  async function processWebhook(
    authorization: string | undefined,
    payload: RevenueCatWebhookEvent,
    verification?: { signature?: string; rawBody?: Buffer },
  ): Promise<{ duplicate: boolean; processed: boolean; status?: RevenueCatSubscriptionStatus }> {
    const expected = config.REVENUECAT_WEBHOOK_AUTH_TOKEN?.trim();
    if (!expected || !authorization || !safeTokenEquals(authorization, expected)) {
      throw forbidden('REVENUECAT_WEBHOOK_UNAUTHORIZED', 'Webhook doğrulaması başarısız.');
    }
    const signingSecret = config.REVENUECAT_WEBHOOK_SIGNING_SECRET?.trim();
    if (
      signingSecret &&
      !verifyWebhookSignature({
        header: verification?.signature,
        rawBody: verification?.rawBody,
        secret: signingSecret,
        now: now(),
      })
    ) {
      throw forbidden(
        'REVENUECAT_WEBHOOK_SIGNATURE_INVALID',
        'Webhook imza doğrulaması başarısız.',
      );
    }
    const event = payload.event;
    const eventId = event?.id?.trim();
    const userId = [event?.app_user_id, event?.original_app_user_id, ...(event?.aliases ?? [])]
      .map((value) => value?.trim())
      .find((value): value is string => Boolean(value && UUID.test(value)));
    if (!eventId || !REVENUECAT_EVENT_ID.test(eventId) || !userId) {
      throw forbidden(
        'REVENUECAT_WEBHOOK_INVALID',
        'Webhook event kimliği veya BirKare kullanıcı kimliği geçersiz.',
      );
    }

    const route = 'POST:/v1/billing/revenuecat/webhook';
    const requestHash = hashBody(payload);
    const existing = await repository.getIdempotency(route, eventId);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw conflict(
          'REVENUECAT_WEBHOOK_CONFLICT',
          'Aynı event kimliği farklı bir içerikle tekrar kullanılamaz.',
        );
      }
      return { duplicate: true, processed: true };
    }

    const user = await repository.getUserById(userId);
    let status: RevenueCatSubscriptionStatus | undefined;
    if (user && !user.deletedAt) {
      cache.delete(userId);
      status = await readStatus(userId, true);
    }
    await repository.putIdempotency({
      userId: user?.id ?? null,
      route,
      key: eventId,
      requestHash,
      responseCode: 200,
      responseBody: { processed: Boolean(user), type: event?.type ?? 'UNKNOWN' },
      expiresAt: new Date(now().getTime() + 400 * 24 * 60 * 60 * 1000),
    });
    return { duplicate: false, processed: Boolean(user), ...(status ? { status } : {}) };
  }

  return {
    configured,
    planFor,
    readStatus,
    assertActive,
    processWebhook,
    clearUserCache(userId: string) {
      cache.delete(userId);
    },
  };
}

export type RevenueCatService = ReturnType<typeof createRevenueCatService>;
