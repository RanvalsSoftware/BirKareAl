export const ENTITLEMENT_ID: 'create_an_app_called_birkare_pro';
export const OFFERING_ID: 'birkare_pro';
export const DEVELOPMENT_TEST_KEY: string;
export const DEFAULT_IOS_PUBLIC_KEY: string;
export type RevenueCatPublicConfig = {
  appEnv: string;
  entitlementId: string;
  offeringId: string;
  iosApiKey: string;
  androidApiKey: string;
};
export function resolveRevenueCatConfig(
  values: Record<string, string | undefined>,
): RevenueCatPublicConfig;
