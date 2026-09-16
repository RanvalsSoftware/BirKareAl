import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

type SdkModule = typeof import('react-native-purchases');
type UiModule = typeof import('react-native-purchases-ui');
type PurchasesStoreProduct = Awaited<ReturnType<SdkModule['default']['getProducts']>>[number];

type ClientOptions = {
  apiKey: string;
  entitlementId: string;
  offeringId?: string;
  creditProductIds?: readonly string[];
  unavailableReason?: string;
  getUserId: () => string | null;
  loadSdk: () => Promise<SdkModule>;
  loadUi: () => Promise<UiModule>;
};

export type BillingSnapshot = {
  status: 'signed_out' | 'connecting' | 'ready' | 'error' | 'unavailable';
  userId: string | null;
  customerInfo: CustomerInfo | null;
  offering: PurchasesOffering | null;
  creditProducts: PurchasesStoreProduct[];
  busy: boolean;
  error: string | null;
};

export type BillingResult =
  | { kind: 'completed'; isPro: boolean }
  | { kind: 'cancelled' }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

export function hasPro(info: CustomerInfo | null, entitlementId: string): boolean {
  return info?.entitlements.active[entitlementId] !== undefined;
}

/**
 * One client per app process. Auth changes and all SDK operations are serialized.
 * Epoch checks discard purchases/refreshes belonging to a previous app account.
 * CustomerInfo and store product values control UI only: this module NEVER modifies the credit wallet.
 */
export function createRevenueCatClient(options: ClientOptions) {
  let snapshot: BillingSnapshot = {
    status: 'signed_out',
    userId: null,
    customerInfo: null,
    offering: null,
    creditProducts: [],
    busy: false,
    error: null,
  };
  const subscribers = new Set<() => void>();
  let sdkModule: SdkModule | null = null;
  let configured = false;
  let sdkUserId: string | null = null;
  let targetUserId: string | null = null;
  let epoch = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let working = false;
  let interactive = false;
  let refreshPromise: Promise<void> | null = null;
  let listening = false;

  const publish = (patch: Partial<BillingSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    subscribers.forEach((listener) => listener());
  };

  const current = (version: number, userId: string | null) =>
    version === epoch && userId === targetUserId && userId === options.getUserId();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(async () => {
      working = true;
      try {
        return await task();
      } finally {
        working = false;
      }
    });
    queue = next.catch(() => undefined);
    return next;
  };

  const messageFor = (error: unknown): string => {
    const code = String((error as { code?: unknown } | null)?.code ?? '');
    const codes = sdkModule?.PURCHASES_ERROR_CODE;
    if (codes && code === String(codes.NETWORK_ERROR))
      return 'Mağazaya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
    if (codes && code === String(codes.CONFIGURATION_ERROR))
      return 'Mağaza ürünleri hazır değil. RevenueCat ürün, entitlement ve offering bağlantılarını kontrol edin.';
    if (error instanceof Error && error.name === 'BirKareBillingError') return error.message;
    return 'Satın alma servisine ulaşılamadı. Tekrar deneyin; yeni SDK eklendiyse uygulamayı yeniden derleyin.';
  };

  const fail = (message: string): never => {
    const error = new Error(message);
    error.name = 'BirKareBillingError';
    throw error;
  };

  const assertAccount = (version: number, userId: string | null) => {
    if (!userId || !current(version, userId) || sdkUserId !== userId)
      fail('Hesap değişti. İşleme devam etmek için hesabınıza tekrar giriş yapın.');
  };

  const saveInfo = (info: CustomerInfo, version: number, userId: string) => {
    if (current(version, userId)) publish({ customerInfo: info });
  };

  const readOfferings = async (version: number, userId: string) => {
    try {
      const offerings = await sdkModule!.default.getOfferings();
      const offering = options.offeringId
        ? (offerings.all[options.offeringId] ?? null)
        : offerings.current;
      if (current(version, userId)) {
        publish({
          offering,
          error: offering
            ? null
            : options.offeringId
              ? `RevenueCat’te \`${options.offeringId}\` offering’i bulunamadı. Ürünleri bu offering’e bağlayın.`
              : 'RevenueCat’te bu uygulama için geçerli bir offering bulunamadı. Ürünleri bağlayıp current offering seçin.',
        });
      }
    } catch (error) {
      if (current(version, userId)) publish({ offering: null, error: messageFor(error) });
    }
  };

  const readCreditProducts = async (version: number, userId: string) => {
    const ids = [...(options.creditProductIds ?? [])];
    if (!ids.length) {
      if (current(version, userId)) publish({ creditProducts: [] });
      return;
    }
    try {
      const products = await sdkModule!.default.getProducts(
        ids,
        sdkModule!.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      );
      const order = new Map(ids.map((id, index) => [id, index]));
      products.sort(
        (left, right) =>
          (order.get(left.identifier) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.identifier) ?? Number.MAX_SAFE_INTEGER),
      );
      if (current(version, userId)) publish({ creditProducts: products });
    } catch (error) {
      if (current(version, userId)) {
        publish({
          creditProducts: [],
          error: `Ek kredi ürünleri mağazadan alınamadı. ${messageFor(error)}`,
        });
      }
    }
  };

  const onCustomerInfo = (info: CustomerInfo) => {
    if (working || snapshot.status !== 'ready' || !targetUserId) return;
    if (
      snapshot.customerInfo?.requestDate === info.requestDate &&
      JSON.stringify(snapshot.customerInfo?.entitlements) === JSON.stringify(info.entitlements)
    )
      return;
    void refresh();
  };

  async function setUser(userId: string | null, force = false): Promise<void> {
    if (
      !force &&
      userId === targetUserId &&
      ['ready', 'connecting', 'signed_out'].includes(snapshot.status)
    )
      return;
    targetUserId = userId;
    const version = ++epoch;
    publish({
      userId,
      customerInfo: null,
      offering: null,
      creditProducts: [],
      busy: false,
      error: null,
      status: userId ? 'connecting' : 'signed_out',
    });
    await enqueue(async () => {
      if (!current(version, userId)) return;
      try {
        if (!userId) {
          if (configured && sdkModule && !(await sdkModule.default.isAnonymous())) {
            await sdkModule.default.logOut();
          }
          sdkUserId = null;
          return;
        }
        if (options.unavailableReason) {
          publish({ status: 'unavailable', error: options.unavailableReason });
          return;
        }
        if (!options.apiKey) fail('RevenueCat public SDK anahtarı yapılandırılmamış.');
        sdkModule ??= await options.loadSdk();
        if (!current(version, userId)) return;
        const sdk = sdkModule.default;
        if (!configured) {
          sdk.configure({ apiKey: options.apiKey, appUserID: userId });
          configured = true;
        } else if (sdkUserId !== userId) {
          await sdk.logIn(userId);
        }
        sdkUserId = userId;
        if (!listening) {
          sdk.addCustomerInfoUpdateListener(onCustomerInfo);
          listening = true;
        }
        const info = await sdk.getCustomerInfo();
        if (!current(version, userId)) return;
        publish({ status: 'ready', customerInfo: info });
        await Promise.all([readOfferings(version, userId), readCreditProducts(version, userId)]);
      } catch (error) {
        if (current(version, userId))
          publish({ status: userId ? 'error' : 'signed_out', error: messageFor(error) });
      }
    });
  }

  async function refresh(): Promise<void> {
    if (refreshPromise) return refreshPromise;
    if (!targetUserId || targetUserId !== options.getUserId()) return;
    if (snapshot.status !== 'ready') return setUser(targetUserId, true);
    const userId = targetUserId;
    const version = epoch;
    refreshPromise = enqueue(async () => {
      if (!current(version, userId)) return;
      try {
        assertAccount(version, userId);
        saveInfo(await sdkModule!.default.getCustomerInfo(), version, userId);
        await Promise.all([readOfferings(version, userId), readCreditProducts(version, userId)]);
      } catch (error) {
        if (current(version, userId)) publish({ error: messageFor(error) });
      }
    }).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  async function action(
    task: (version: number, userId: string) => Promise<BillingResult>,
  ): Promise<BillingResult> {
    if (interactive) return { kind: 'error', message: 'Bir mağaza işlemi zaten devam ediyor.' };
    const userId = targetUserId;
    const version = epoch;
    if (!userId || userId !== options.getUserId() || snapshot.status !== 'ready')
      return {
        kind: 'error',
        message:
          snapshot.error || 'Satın alma için giriş yapın ve mağazanın hazırlanmasını bekleyin.',
      };
    interactive = true;
    publish({ busy: true, error: null });
    try {
      return await enqueue(async () => {
        try {
          assertAccount(version, userId);
          const result = await task(version, userId);
          return current(version, userId) ? result : { kind: 'cancelled' as const };
        } catch (error) {
          if (!current(version, userId)) return { kind: 'cancelled' as const };
          const purchaseError = error as { userCancelled?: boolean; code?: unknown } | null;
          const codes = sdkModule?.PURCHASES_ERROR_CODE;
          if (
            purchaseError?.userCancelled ||
            (codes && String(purchaseError?.code) === String(codes.PURCHASE_CANCELLED_ERROR))
          )
            return { kind: 'cancelled' as const };
          if (codes && String(purchaseError?.code) === String(codes.PAYMENT_PENDING_ERROR))
            return {
              kind: 'pending' as const,
              message:
                'Ödeme onay bekliyor. Onaylanana kadar satın alma tamamlanmaz; tekrar satın almayın.',
            };
          const message = messageFor(error);
          publish({ error: message });
          return { kind: 'error' as const, message };
        }
      });
    } finally {
      interactive = false;
      if (current(version, userId)) publish({ busy: false });
    }
  }

  const completed = (info: CustomerInfo, version: number, userId: string): BillingResult => {
    saveInfo(info, version, userId);
    return { kind: 'completed', isPro: hasPro(info, options.entitlementId) };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    setUser,
    refresh,
    purchase: (pkg: PurchasesPackage) =>
      action(async (version, userId) => {
        const offered = snapshot.offering?.availablePackages.find(
          (item) =>
            item.identifier === pkg.identifier &&
            item.product.identifier === pkg.product.identifier,
        );
        if (!offered) fail('Bu paket artık geçerli teklifte yok. Paket listesini yenileyin.');
        const { customerInfo } = await sdkModule!.default.purchasePackage(offered!);
        return completed(customerInfo, version, userId);
      }),
    purchaseCredit: (product: PurchasesStoreProduct) =>
      action(async (version, userId) => {
        const allowed = new Set(options.creditProductIds ?? []);
        const offered = snapshot.creditProducts.find((item) => item.identifier === product.identifier);
        if (!allowed.has(product.identifier) || !offered)
          fail('Bu kredi paketi artık mağazada kullanılamıyor. Paket listesini yenileyin.');
        const { customerInfo } = await sdkModule!.default.purchaseStoreProduct(offered);
        return completed(customerInfo, version, userId);
      }),
    restore: () =>
      action(async (version, userId) =>
        completed(await sdkModule!.default.restorePurchases(), version, userId),
      ),
    presentPaywall: () =>
      action(async (version, userId) => {
        if (!snapshot.offering) fail('Önce RevenueCat’te ürünleri bir offering’e bağlayın.');
        const ui = await options.loadUi();
        assertAccount(version, userId);
        const result = await ui.default.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: options.entitlementId,
          offering: snapshot.offering!,
          displayCloseButton: true,
        });
        if (result === ui.PAYWALL_RESULT.CANCELLED) return { kind: 'cancelled' };
        if (result === ui.PAYWALL_RESULT.ERROR)
          fail(
            'Paywall açılamadı veya işlem tamamlanamadı. Paket kartlarıyla tekrar deneyebilirsiniz.',
          );
        assertAccount(version, userId);
        return completed(await sdkModule!.default.getCustomerInfo(), version, userId);
      }),
    presentCustomerCenter: () =>
      action(async (version, userId) => {
        const ui = await options.loadUi();
        assertAccount(version, userId);
        await ui.default.presentCustomerCenter();
        assertAccount(version, userId);
        return completed(await sdkModule!.default.getCustomerInfo(), version, userId);
      }),
    dispose() {
      epoch++;
      targetUserId = null;
      if (listening && sdkModule)
        sdkModule.default.removeCustomerInfoUpdateListener(onCustomerInfo);
      listening = false;
      subscribers.clear();
    },
  };
}
