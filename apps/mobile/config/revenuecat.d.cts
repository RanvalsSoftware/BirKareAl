export const ENTITLEMENT_ID: 'create_an_app_called_birkare_pro';
export type RevenueCatPublicConfig = {
  appEnv: string;
  entitlementId: string;
  iosApiKey: string;
  androidApiKey: string;
};
export function resolveRevenueCatConfig(
  values: Record<string, string | undefined>,
): RevenueCatPublicConfig;
