import { tr as translateCopy } from '@/i18n/engine';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { accountQueryKey } from '@/features/auth/account-query-cache';
import { MOBILE_CREDIT_PRODUCTS } from './billing-policy';
import { CREDIT_WALLET_QUERY_KEY } from './use-wallet';
import { createRevenueCatClient, hasPro } from './revenuecat-client';
import type { RevenueCatPublicConfig } from '../../../config/revenuecat.cjs';

const config = Constants.expoConfig?.extra?.revenueCat as RevenueCatPublicConfig | undefined;
const entitlementId = 'create_an_app_called_birkare_pro';
const offeringId = config?.offeringId || 'birkare_pro';
const appEnv = config?.appEnv || 'development';
const apiKey = (Platform.OS === 'ios' ? config?.iosApiKey : config?.androidApiKey) || '';
const isTestStore = apiKey.startsWith('test_');
const creditProductIds = MOBILE_CREDIT_PRODUCTS.map((item) => item.productId);
const getUserId = () => {
  const auth = useAuthStore.getState();
  return auth.state === 'authenticated' ? (auth.user?.id ?? null) : null;
};

function unavailableReason(): string | undefined {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    return translateCopy('Satın alımlar iOS veya Android uygulamasında kullanılabilir.');
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return translateCopy(
      'Gerçek satın alma testi için Expo Go yerine uygulamanın yeni native derlemesini açın.',
    );
  if (!config || config.entitlementId !== entitlementId || !apiKey)
    return translateCopy('Satın alma şu anda kullanılamıyor.');
  if (isTestStore && appEnv !== 'development')
    return translateCopy('Satın alma şu anda kullanılamıyor.');
  return undefined;
}

let sdkPromise: Promise<typeof import('react-native-purchases')> | null = null;
let uiPromise: Promise<typeof import('react-native-purchases-ui')> | null = null;

export const revenueCat = createRevenueCatClient({
  apiKey,
  entitlementId,
  offeringId,
  creditProductIds,
  unavailableReason: unavailableReason(),
  getUserId,
  loadSdk: async () => {
    sdkPromise ??= import('react-native-purchases').then(async (module) => {
      await module.default.setLogLevel(
        appEnv === 'development' ? module.LOG_LEVEL.DEBUG : module.LOG_LEVEL.WARN,
      );
      return module;
    });
    try {
      return await sdkPromise;
    } catch (error) {
      sdkPromise = null;
      throw error;
    }
  },
  loadUi: async () => {
    uiPromise ??= import('react-native-purchases-ui');
    try {
      return await uiPromise;
    } catch (error) {
      uiPromise = null;
      throw error;
    }
  },
});

async function refreshFreshCustomerInfo(): Promise<void> {
  if (sdkPromise) {
    try {
      const sdk = await sdkPromise;
      sdk.default.invalidateCustomerInfoCache();
    } catch {
      // Normal refresh below still gives the SDK a chance to recover.
    }
  }
  await revenueCat.refresh();
}

export type BillingSyncResponse = { creditPackCreditsGranted?: number };

let syncInFlight: Promise<BillingSyncResponse> | null = null;

/**
 * Asks the server to reconcile store purchases with the wallet. Concurrent
 * callers share one request, so a purchase never spends the endpoint's rate
 * limit twice, and a failed attempt is retried before the caller hears of it.
 */
export function syncBilling(retryDelaysMs: readonly number[] = []): Promise<BillingSyncResponse> {
  syncInFlight ??= (async () => {
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await apiRequest<BillingSyncResponse>('/v1/billing/revenuecat/sync', {
            method: 'POST',
          });
        } catch (error) {
          const delay = retryDelaysMs[attempt];
          if (delay === undefined) throw error;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

/** Changes only when something purchasable changed, not on every store refresh. */
function purchaseFingerprint(info: {
  entitlements: { active: Record<string, { expirationDate?: string | null }> };
  nonSubscriptionTransactions?: readonly { transactionIdentifier: string }[];
}): string {
  return JSON.stringify([
    Object.entries(info.entitlements.active)
      .map(([id, entitlement]) => `${id}:${entitlement.expirationDate ?? ''}`)
      .sort(),
    (info.nonSubscriptionTransactions ?? []).map((item) => item.transactionIdentifier).sort(),
  ]);
}

/** Mount once below QueryClientProvider. No anonymous customer may buy. */
export function RevenueCatBootstrap() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const identify = () => {
      void revenueCat.setUser(getUserId());
    };
    identify();
    const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
      if (state.user?.id !== previous.user?.id || state.state !== previous.state) identify();
    });
    let lastSynced: string | null = null;
    const unsubscribeBilling = revenueCat.subscribe(() => {
      const state = revenueCat.getSnapshot();
      if (!state.customerInfo || state.userId !== getUserId()) return;
      const fingerprint = `${state.userId}|${purchaseFingerprint(state.customerInfo)}`;
      if (fingerprint === lastSynced) return;
      lastSynced = fingerprint;
      void syncBilling()
        .catch(() => {
          // Let the next store refresh try again instead of treating this state as synced.
          lastSynced = null;
        })
        .finally(() =>
          queryClient
            .invalidateQueries({
              queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, state.userId ?? undefined),
            })
            .catch(() => undefined),
        );
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void revenueCat.refresh();
    });
    return () => {
      unsubscribeAuth();
      unsubscribeBilling();
      appState.remove();
    };
  }, [queryClient]);
  return null;
}

export function useRevenueCat() {
  const state = useSyncExternalStore(
    revenueCat.subscribe,
    revenueCat.getSnapshot,
    revenueCat.getSnapshot,
  );
  const userId = useAuthStore((auth) =>
    auth.state === 'authenticated' ? (auth.user?.id ?? null) : null,
  );
  const belongsToUser = Boolean(userId) && state.userId === userId;
  const customerInfo = belongsToUser ? state.customerInfo : null;
  const entitlement = customerInfo?.entitlements.active[entitlementId];
  const subscriptionCancelled = Boolean(
    entitlement?.expirationDate && entitlement.willRenew === false,
  );
  const subscriptionStatus = !entitlement
    ? ('inactive' as const)
    : subscriptionCancelled
      ? ('cancelled' as const)
      : entitlement.expirationDate
        ? ('active' as const)
        : ('lifetime' as const);
  const testEnvironmentLabel = isTestStore
    ? translateCopy('REVENUECAT TEST STORE · GERÇEK ÜCRET ALINMAZ')
    : appEnv !== 'production'
      ? translateCopy('APP STORE / PLAY TEST ORTAMI · GERÇEK MAĞAZA FİYATLARI SANDBOX’TAN GELİR')
      : null;
  return {
    ...state,
    customerInfo,
    offering: belongsToUser ? state.offering : null,
    creditProducts: belongsToUser ? state.creditProducts : [],
    isPro: hasPro(customerInfo, entitlementId),
    entitlement,
    subscriptionCancelled,
    subscriptionStatus,
    managementUrl: customerInfo?.managementURL ?? null,
    entitlementId,
    offeringId,
    appEnv,
    isTestStore,
    testEnvironmentLabel,
    ready: belongsToUser && state.status === 'ready',
    refresh: revenueCat.refresh,
    refreshFresh: refreshFreshCustomerInfo,
    purchase: revenueCat.purchase,
    purchaseCredit: revenueCat.purchaseCredit,
    restore: revenueCat.restore,
    presentPaywall: revenueCat.presentPaywall,
    presentCustomerCenter: revenueCat.presentCustomerCenter,
  };
}
