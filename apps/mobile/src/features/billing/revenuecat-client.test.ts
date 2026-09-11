import { describe, expect, it, vi } from 'vitest';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { createRevenueCatClient, hasPro } from './revenuecat-client';

const entitlementId = 'create_an_app_called_birkare_pro';

function info(active = false, marker = 'now'): CustomerInfo {
  return {
    requestDate: marker,
    entitlements: {
      active: active
        ? {
            [entitlementId]: { isActive: true, productIdentifier: 'monthly', willRenew: true },
          }
        : {},
    },
  } as unknown as CustomerInfo;
}

const pkg = {
  identifier: '$rc_monthly',
  product: { identifier: 'monthly', priceString: '₺99,99' },
} as PurchasesPackage;

const offering = {
  identifier: 'birkare_pro',
  availablePackages: [pkg],
  monthly: pkg,
} as PurchasesOffering;

const unrelatedOffering = {
  identifier: 'default',
  availablePackages: [],
} as unknown as PurchasesOffering;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture(unavailableReason?: string) {
  let user: string | null = 'user-a';
  let latestInfo = info();
  let listener: ((value: CustomerInfo) => void) | null = null;
  const sdk = {
    configure: vi.fn(),
    logIn: vi.fn(async () => ({ customerInfo: latestInfo, created: false })),
    logOut: vi.fn(async () => info()),
    isAnonymous: vi.fn(async () => false),
    getCustomerInfo: vi.fn(async () => latestInfo),
    getOfferings: vi.fn(async () => ({
      current: unrelatedOffering,
      all: { birkare_pro: offering, default: unrelatedOffering },
    })),
    purchasePackage: vi.fn(async (_package: PurchasesPackage) => ({ customerInfo: latestInfo })),
    restorePurchases: vi.fn(async () => latestInfo),
    addCustomerInfoUpdateListener: vi.fn((callback: (value: CustomerInfo) => void) => {
      listener = callback;
    }),
    removeCustomerInfoUpdateListener: vi.fn(),
  };
  const ui = {
    presentPaywallIfNeeded: vi.fn(async () => 'PURCHASED'),
    presentCustomerCenter: vi.fn(async () => undefined),
  };
  const loadSdk = vi.fn(
    async () =>
      ({
        default: sdk,
        PURCHASES_ERROR_CODE: {
          PURCHASE_CANCELLED_ERROR: '1',
          PAYMENT_PENDING_ERROR: '20',
          NETWORK_ERROR: '10',
          CONFIGURATION_ERROR: '23',
        },
      }) as unknown as typeof import('react-native-purchases'),
  );
  const client = createRevenueCatClient({
    apiKey: 'test_fixture',
    entitlementId,
    offeringId: 'birkare_pro',
    unavailableReason,
    getUserId: () => user,
    loadSdk,
    loadUi: async () =>
      ({
        default: ui,
        PAYWALL_RESULT: {
          PURCHASED: 'PURCHASED',
          RESTORED: 'RESTORED',
          CANCELLED: 'CANCELLED',
          ERROR: 'ERROR',
          NOT_PRESENTED: 'NOT_PRESENTED',
        },
      }) as unknown as typeof import('react-native-purchases-ui'),
  });
  return {
    client,
    sdk,
    ui,
    loadSdk,
    signIn: async () => client.setUser(user),
    setUser(value: string | null) {
      user = value;
      return client.setUser(value);
    },
    setInfo(value: CustomerInfo) {
      latestInfo = value;
    },
    emit(value: CustomerInfo) {
      listener?.(value);
    },
  };
}

describe('RevenueCat account and purchase lifecycle', () => {
  it('checks the exact entitlement, not any purchase or another entitlement', () => {
    expect(hasPro(null, entitlementId)).toBe(false);
    expect(hasPro(info(), entitlementId)).toBe(false);
    expect(hasPro(info(true), entitlementId)).toBe(true);
    expect(hasPro(info(true), 'other')).toBe(false);
  });

  it('configures once using the authenticated backend user ID', async () => {
    const f = fixture();
    await f.signIn();
    await f.signIn();
    expect(f.sdk.configure).toHaveBeenCalledExactlyOnceWith({
      apiKey: 'test_fixture',
      appUserID: 'user-a',
    });
    expect(f.client.getSnapshot().status).toBe('ready');
  });

  it('selects the configured offering instead of an unrelated current offering', async () => {
    const f = fixture();
    await f.signIn();
    expect(f.client.getSnapshot().offering).toBe(offering);
  });

  it('does not load SDKs on unsupported platforms or Expo Go', async () => {
    const f = fixture('Native build required');
    await f.signIn();
    expect(f.loadSdk).not.toHaveBeenCalled();
    expect(f.client.getSnapshot().status).toBe('unavailable');
    expect((await f.client.restore()).kind).toBe('error');
  });

  it('clears entitlement synchronously on account switch', async () => {
    const f = fixture();
    f.setInfo(info(true));
    await f.signIn();
    f.setInfo(info());
    const login = f.setUser('user-b');
    expect(f.client.getSnapshot().customerInfo).toBeNull();
    await login;
    expect(f.sdk.logIn).toHaveBeenCalledWith('user-b');
    expect(f.sdk.configure).toHaveBeenCalledTimes(1);
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('logs out and blocks purchases without an app account', async () => {
    const f = fixture();
    f.setInfo(info(true));
    await f.signIn();
    const logout = f.setUser(null);
    expect(f.client.getSnapshot().customerInfo).toBeNull();
    await logout;
    expect(f.sdk.logOut).toHaveBeenCalledTimes(1);
    expect((await f.client.purchase(pkg)).kind).toBe('error');
    expect(f.sdk.purchasePackage).not.toHaveBeenCalled();
  });

  it('discards a late customer response after switching accounts', async () => {
    const f = fixture();
    const read = deferred<CustomerInfo>();
    f.sdk.getCustomerInfo.mockImplementationOnce(() => read.promise);
    const first = f.signIn();
    await vi.waitFor(() => expect(f.sdk.getCustomerInfo).toHaveBeenCalled());
    const second = f.setUser('user-b');
    read.resolve(info(true, 'old-account'));
    await Promise.all([first, second]);
    expect(f.client.getSnapshot().userId).toBe('user-b');
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('discards a completed purchase from a previous app account', async () => {
    const f = fixture();
    await f.signIn();
    const buy = deferred<{ customerInfo: CustomerInfo }>();
    f.sdk.purchasePackage.mockImplementationOnce(() => buy.promise);
    const purchase = f.client.purchase(pkg);
    await vi.waitFor(() => expect(f.sdk.purchasePackage).toHaveBeenCalled());
    const login = f.setUser('user-b');
    buy.resolve({ customerInfo: info(true) });
    expect((await purchase).kind).toBe('cancelled');
    await login;
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('purchases the exact package from the configured offering', async () => {
    const f = fixture();
    await f.signIn();
    f.setInfo(info(true));
    expect(await f.client.purchase(pkg)).toEqual({ kind: 'completed', isPro: true });
    expect(f.sdk.purchasePackage.mock.calls[0]?.[0]).toBe(pkg);
  });

  it('rejects products that are not in the configured offering', async () => {
    const f = fixture();
    await f.signIn();
    const other = { ...pkg, identifier: 'unknown' };
    expect((await f.client.purchase(other)).kind).toBe('error');
    expect(f.sdk.purchasePackage).not.toHaveBeenCalled();
  });

  it('does not start duplicate purchases on repeated taps', async () => {
    const f = fixture();
    await f.signIn();
    const buy = deferred<{ customerInfo: CustomerInfo }>();
    f.sdk.purchasePackage.mockImplementationOnce(() => buy.promise);
    const first = f.client.purchase(pkg);
    expect((await f.client.purchase(pkg)).kind).toBe('error');
    buy.resolve({ customerInfo: info(true) });
    await first;
    expect(f.sdk.purchasePackage).toHaveBeenCalledTimes(1);
    expect(f.client.getSnapshot().busy).toBe(false);
  });

  it('treats user cancellation as cancellation, without an error banner', async () => {
    const f = fixture();
    await f.signIn();
    f.sdk.purchasePackage.mockRejectedValueOnce({ userCancelled: true, code: '1' });
    expect(await f.client.purchase(pkg)).toEqual({ kind: 'cancelled' });
    expect(f.client.getSnapshot().error).toBeNull();
  });

  it('never grants Pro for a pending payment', async () => {
    const f = fixture();
    await f.signIn();
    f.sdk.purchasePackage.mockRejectedValueOnce({ code: '20' });
    expect((await f.client.purchase(pkg)).kind).toBe('pending');
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('handles network errors and permits an explicit retry', async () => {
    const f = fixture();
    await f.signIn();
    f.sdk.purchasePackage.mockRejectedValueOnce({ code: '10' });
    expect((await f.client.purchase(pkg)).kind).toBe('error');
    f.setInfo(info(true));
    expect((await f.client.purchase(pkg)).kind).toBe('completed');
  });

  it('restores only the entitlement actually returned by RevenueCat', async () => {
    const f = fixture();
    await f.signIn();
    expect(await f.client.restore()).toEqual({ kind: 'completed', isPro: false });
    f.setInfo(info(true));
    expect(await f.client.restore()).toEqual({ kind: 'completed', isPro: true });
  });

  it('keeps restore available when fetching offerings fails', async () => {
    const f = fixture();
    f.sdk.getOfferings.mockRejectedValueOnce({ code: '10' });
    await f.signIn();
    expect(f.client.getSnapshot().status).toBe('ready');
    f.setInfo(info(true));
    expect(await f.client.restore()).toEqual({ kind: 'completed', isPro: true });
  });

  it('shows the native paywall fallback for the exact entitlement and offering', async () => {
    const f = fixture();
    await f.signIn();
    f.setInfo(info(true));
    expect(await f.client.presentPaywall()).toEqual({ kind: 'completed', isPro: true });
    expect(f.ui.presentPaywallIfNeeded).toHaveBeenCalledWith({
      requiredEntitlementIdentifier: entitlementId,
      offering,
      displayCloseButton: true,
    });
  });

  it('does not equate PURCHASED paywall result with active entitlement', async () => {
    const f = fixture();
    await f.signIn();
    expect(await f.client.presentPaywall()).toEqual({ kind: 'completed', isPro: false });
  });

  it('handles cancellation, error, restored and not-presented paywall results', async () => {
    const f = fixture();
    await f.signIn();
    f.ui.presentPaywallIfNeeded.mockResolvedValueOnce('CANCELLED');
    expect((await f.client.presentPaywall()).kind).toBe('cancelled');
    f.ui.presentPaywallIfNeeded.mockResolvedValueOnce('ERROR');
    expect((await f.client.presentPaywall()).kind).toBe('error');
    f.setInfo(info(true));
    for (const result of ['RESTORED', 'NOT_PRESENTED']) {
      f.ui.presentPaywallIfNeeded.mockResolvedValueOnce(result);
      expect(await f.client.presentPaywall()).toEqual({ kind: 'completed', isPro: true });
    }
  });

  it('refreshes customer info after Customer Center closes', async () => {
    const f = fixture();
    await f.signIn();
    f.setInfo(info(true));
    expect(await f.client.presentCustomerCenter()).toEqual({ kind: 'completed', isPro: true });
    expect(f.ui.presentCustomerCenter).toHaveBeenCalledTimes(1);
  });

  it('does not grant another account’s entitlement from a delayed listener payload', async () => {
    const f = fixture();
    await f.signIn();
    f.emit(info(true, 'delayed-other-account'));
    await f.client.refresh();
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('refresh revokes expired entitlements instead of retaining a local Pro boolean', async () => {
    const f = fixture();
    f.setInfo(info(true));
    await f.signIn();
    f.setInfo(info(false, 'expired'));
    await f.client.refresh();
    expect(hasPro(f.client.getSnapshot().customerInfo, entitlementId)).toBe(false);
  });

  it('cleans up its single native customer info listener', async () => {
    const f = fixture();
    await f.signIn();
    f.client.dispose();
    expect(f.sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledTimes(1);
  });
});
