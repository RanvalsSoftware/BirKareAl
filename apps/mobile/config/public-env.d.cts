export const DEFAULT_SUPPORT_EMAIL: string;
export const PUBLIC_MOBILE_KEYS: readonly string[];
export function assertKnownPublicKeys(values: Record<string, string | undefined>): void;
export function resolvePublicMobileConfig(
  values: Record<string, string | undefined>,
  options?: { release?: boolean },
): { appEnv: 'development' | 'staging' | 'production'; apiBaseUrl: string; supportEmail: string };
