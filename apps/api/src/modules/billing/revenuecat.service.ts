import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { BirKareConfig } from '@birkare/config';
import type { BirKareRepository, CreditTransactionRecord } from '@birkare/database';
import { BIRKARE_CREDIT_PRODUCTS, conflict, forbidden, unavailable } from '@birkare/shared';

const REVENUECAT_EVENT_ID = /^[A-Za-z0-9._:$-]{1,200}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Ledger reference types under which RevenueCat purchases are credited. */
const STORE_GRANT_REFERENCE_TYPES = ['REVENUECAT', 'REVENUECAT_CONSUMABLE'];

/**
 * What a store refund did to the ledger. `matched` counts the grants found for
 * the refunded store transaction; 0 means it was never credited here.
 */
export type RevenueCatRefundOutcome = {
  action: 'REFUND' | 'REFUND_REVERSED';
  matched: number;
  applied: number;
  credits: number;
  shortfall: number;
};

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
  /** Credits clawed back during this read because RevenueCat marks a purchase refunded. */
  creditsRevoked: number;
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
  store_transaction_id?: string | number | null;
  /** Set by RevenueCat when it detected a store refund of this subscription. */
  refunded_at?: string | null;
};

type RevenueCatNonSubscription = {
  id?: string | null;
  purchase_date?: string | null;
  original_purchase_date?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
  /** The store's own identifier; `id` above is RevenueCat's. Not always present. */
  store_transaction_id?: string | number | null;
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
    transaction_id?: string | null;
    original_transaction_id?: string | null;
    /** Only on CANCELLATION. `CUSTOMER_SUPPORT` is RevenueCat's refund reason. */
    cancel_reason?: string | null;
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
> &
  Partial<Pick<BirKareConfig, 'REVENUECAT_API_BASE_URL'>>;

type Dependencies = {
  config: RevenueCatConfig;
  repository: BirKareRepository;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Receives refunds that could not be matched to a grant (needs a human look). */
  logger?: { warn(details: Record<string, unknown>, message: string): void };
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

/** A usable store transaction identifier, or null when RevenueCat omits it. */
function storeReference(value: string | number | null | undefined): string | null {
  const text = typeof value === 'number' ? String(value) : value?.trim();
  return text && text.length <= 200 ? text : null;
}

/**
 * RevenueCat sets `refunded_at` on a subscription it saw refunded. Guard
 * against a marker left over from an earlier period: it only applies to the
 * transaction currently listed when it is not older than that purchase.
 */
function refundApplies(subscription: RevenueCatSubscription | undefined): boolean {
  const refundedAt = validDate(subscription?.refunded_at);
  if (!refundedAt) return false;
  const purchasedAt = validDate(subscription?.purchase_date);
  return !purchasedAt || refundedAt.getTime() >= purchasedAt.getTime();
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
  const apiBase = config.REVENUECAT_API_BASE_URL ?? 'https://api.revenuecat.com/v1';
  const cache = new Map<string, CachedStatus>();
  const monthlyProducts = csvSet(config.REVENUECAT_MONTHLY_PRODUCT_IDS);
  const annualProducts = csvSet(config.REVENUECAT_ANNUAL_PRODUCT_IDS);
  const lifetimeProducts = csvSet(config.REVENUECAT_LIFETIME_PRODUCT_IDS);

  const configured = () =>
    config.REVENUECAT_ENABLED &&
    Boolean(config.REVENUECAT_SECRET_API_KEY?.trim().startsWith('sk_'));

  function planFor(productId: string | null): RevenueCatPlan {
    if (!productId) return 'unknown';
    // RevenueCat represents current Google Play subscription base plans as
    // `<subscription-id>:<base-plan-id>`. Match the exact value first, then the
    // configured subscription id. Apple and legacy Google identifiers remain
    // unchanged and continue through the same path.
    const subscriptionId = productId.split(':', 1)[0] ?? productId;
    if (monthlyProducts.has(productId) || monthlyProducts.has(subscriptionId)) return 'monthly';
    if (annualProducts.has(productId) || annualProducts.has(subscriptionId)) return 'annual';
    if (lifetimeProducts.has(productId) || lifetimeProducts.has(subscriptionId)) return 'lifetime';
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
        `${apiBase}/subscribers/${encodeURIComponent(userId)}`,
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
    storeTransactionId?: string | null,
    /** The store's identifier when `storeTransactionId` is RevenueCat's own id. */
    refundLookupId?: string | null,
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
      // The idempotency key keeps one grant per account and period. When the
      // store transaction is known it additionally becomes an exclusive
      // reference, so restoring/transferring the same paid period to another
      // BirKare account cannot mint the period's credits a second time.
      ...(storeTransactionId
        ? { referenceId: `${storeTransactionId}:${periodKey}`, exclusiveReference: true }
        : { referenceId: productId }),
      ...(refundLookupId && refundLookupId !== storeTransactionId
        ? { storeTransactionId: refundLookupId }
        : {}),
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
          // One paid store transaction is credited once, whichever account
          // RevenueCat currently lists it under (restore/transfer/alias).
          exclusiveReference: true,
          // A refund only names the store's transaction id; keep it findable.
          ...(storeReference(purchase.store_transaction_id) &&
          storeReference(purchase.store_transaction_id) !== transactionId
            ? { storeTransactionId: storeReference(purchase.store_transaction_id)! }
            : {}),
          idempotencyKey: `revenuecat:${userId}:credit-pack:${pack.productId}:${transactionId}`,
          description: `BirKare ${pack.credits} kredi paketi`,
        });
        if (result.created) creditsGranted += pack.credits;
      }
    }
    return creditsGranted;
  }

  /**
   * Grants credited for one store transaction. Subscription periods are
   * referenced by the store id directly; credit packs and lifetime are
   * referenced by RevenueCat's own purchase id, so those are resolved through
   * the store id saved with the grant or through RevenueCat's purchase list.
   */
  async function grantsForStoreTransaction(
    storeTransactionId: string,
    listings: Array<RevenueCatSubscriber | undefined>,
  ): Promise<CreditTransactionRecord[]> {
    const referenceIds: string[] = [];
    for (const listing of listings) {
      for (const purchases of Object.values(listing?.non_subscriptions ?? {})) {
        for (const purchase of purchases) {
          const id = purchase.id?.trim();
          if (id && storeReference(purchase.store_transaction_id) === storeTransactionId)
            referenceIds.push(id, `${id}:${id}`);
        }
      }
    }
    return repository.findStoreCreditGrants({
      referenceTypes: STORE_GRANT_REFERENCE_TYPES,
      storeTransactionId,
      referenceIds,
    });
  }

  /** Claws back every grant of a refunded store transaction, each at most once. */
  async function revokeRefundedTransaction(
    storeTransactionId: string,
    source: string,
    listings: Array<RevenueCatSubscriber | undefined>,
  ): Promise<RevenueCatRefundOutcome> {
    const outcome: RevenueCatRefundOutcome = {
      action: 'REFUND',
      matched: 0,
      applied: 0,
      credits: 0,
      shortfall: 0,
    };
    for (const grant of await grantsForStoreTransaction(storeTransactionId, listings)) {
      const result = await repository.reverseCreditGrant({
        grantTransactionId: grant.id,
        type: 'REFUND',
        source,
        description: 'Mağaza iadesi: satın alma kredisi geri alındı',
      });
      if (result.status === 'NOT_FOUND') continue;
      outcome.matched += 1;
      if (result.userId) cache.delete(result.userId);
      if (result.status !== 'REVERSED') continue;
      outcome.applied += 1;
      outcome.credits += result.deducted;
      outcome.shortfall += result.shortfall;
    }
    return outcome;
  }

  /** A store refund was undone: give back what that refund removed, once. */
  async function restoreRefundedTransaction(
    storeTransactionId: string,
    source: string,
    listings: Array<RevenueCatSubscriber | undefined>,
  ): Promise<RevenueCatRefundOutcome> {
    const outcome: RevenueCatRefundOutcome = {
      action: 'REFUND_REVERSED',
      matched: 0,
      applied: 0,
      credits: 0,
      shortfall: 0,
    };
    for (const grant of await grantsForStoreTransaction(storeTransactionId, listings)) {
      const result = await repository.restoreReversedCreditGrant({
        grantTransactionId: grant.id,
        source,
        description: 'Mağaza iadesi geri alındı: kredi yeniden tanımlandı',
      });
      if (result.status === 'NOT_FOUND') continue;
      outcome.matched += 1;
      if (result.userId) cache.delete(result.userId);
      if (result.status !== 'RESTORED') continue;
      outcome.applied += 1;
      outcome.credits += result.restored;
    }
    return outcome;
  }

  /** /sync and /status reconciliation: RevenueCat marks refunded subscriptions. */
  async function revokeRefundedSubscriptions(
    data: RevenueCatSubscriber | undefined,
  ): Promise<number> {
    let revoked = 0;
    for (const subscription of Object.values(data?.subscriptions ?? {})) {
      const storeTransactionId = storeReference(subscription.store_transaction_id);
      if (!storeTransactionId || !refundApplies(subscription)) continue;
      revoked += (await revokeRefundedTransaction(storeTransactionId, 'revenuecat-sync', [data]))
        .credits;
    }
    return revoked;
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
        creditsRevoked: 0,
      };
    }

    const data = await subscriber(userId);
    const creditsRevoked = await revokeRefundedSubscriptions(data);
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

    // A refunded transaction earns nothing further, even where the store left
    // the entitlement active (a refund does not always revoke access).
    if (active && productId && plan !== 'unknown' && !refundApplies(subscription)) {
      if (plan === 'lifetime') {
        const lifetimeKey =
          nonSubscription?.id ||
          nonSubscription?.original_purchase_date ||
          nonSubscription?.purchase_date ||
          'first-purchase';
        creditsGranted = (
          await grant(
            userId,
            productId,
            plan,
            lifetimeKey,
            storeReference(nonSubscription?.id),
            storeReference(nonSubscription?.store_transaction_id),
          )
        ).credits;
      } else if (plan === 'monthly') {
        const period = validDate(subscription?.purchase_date) ?? now();
        creditsGranted = (
          await grant(
            userId,
            productId,
            plan,
            utcMonthKey(period),
            storeReference(subscription?.store_transaction_id),
          )
        ).credits;
      } else {
        creditsGranted = (
          await grant(
            userId,
            productId,
            plan,
            utcMonthKey(now()),
            storeReference(subscription?.store_transaction_id),
          )
        ).credits;
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
      creditsRevoked,
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
  ): Promise<{
    duplicate: boolean;
    processed: boolean;
    status?: RevenueCatSubscriptionStatus;
    refund?: RevenueCatRefundOutcome;
  }> {
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
    // RevenueCat reports a store refund as CANCELLATION with cancel_reason
    // CUSTOMER_SUPPORT (subscriptions and non-renewing purchases alike), and an
    // undone refund as REFUND_REVERSED. Both name the store transaction, which
    // is what identifies the grant; they are therefore acknowledged even when
    // the event carries no BirKare account (nothing to do, never retried).
    const refundAction: RevenueCatRefundOutcome['action'] | null =
      event?.type === 'CANCELLATION' && event.cancel_reason === 'CUSTOMER_SUPPORT'
        ? 'REFUND'
        : event?.type === 'REFUND_REVERSED'
          ? 'REFUND_REVERSED'
          : null;
    if (!eventId || !REVENUECAT_EVENT_ID.test(eventId) || (!userId && !refundAction)) {
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

    const user = userId ? await repository.getUserById(userId) : null;
    let refund: RevenueCatRefundOutcome | undefined;
    if (refundAction) {
      const storeTransactionId = storeReference(event?.transaction_id);
      // RevenueCat's purchase list maps the store id to the id a credit pack
      // was granted under. A failure here fails the delivery so it is retried.
      const listing = userId && configured() ? await subscriber(userId) : undefined;
      refund = !storeTransactionId
        ? { action: refundAction, matched: 0, applied: 0, credits: 0, shortfall: 0 }
        : refundAction === 'REFUND'
          ? await revokeRefundedTransaction(storeTransactionId, 'revenuecat-webhook', [listing])
          : await restoreRefundedTransaction(storeTransactionId, 'revenuecat-webhook', [listing]);
      if (refund.matched === 0)
        dependencies.logger?.warn(
          { eventId, type: event?.type, productId: event?.product_id ?? null },
          'RevenueCat iade bildirimi hiçbir kredi tanımıyla eşleşmedi; işlem yapılmadı.',
        );
    }
    let status: RevenueCatSubscriptionStatus | undefined;
    if (userId && user && !user.deletedAt) {
      cache.delete(userId);
      status = await readStatus(userId, true);
    }
    await repository.putIdempotency({
      userId: user?.id ?? null,
      route,
      key: eventId,
      requestHash,
      responseCode: 200,
      responseBody: {
        processed: Boolean(user),
        type: event?.type ?? 'UNKNOWN',
        ...(refund ? { refund } : {}),
      },
      expiresAt: new Date(now().getTime() + 400 * 24 * 60 * 60 * 1000),
    });
    return {
      duplicate: false,
      processed: Boolean(user),
      ...(status ? { status } : {}),
      ...(refund ? { refund } : {}),
    };
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
