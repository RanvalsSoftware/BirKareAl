export type ApiPlatform = 'android' | 'ios' | 'web' | string;

function hostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function expoLanApiBaseUrl(hostUri: string | null | undefined, platform: ApiPlatform): string | null {
  if (platform === 'web' || !hostUri) return null;
  try {
    const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
    if (!host || ['localhost', '127.0.0.1', '::1'].includes(host)) return null;
    return `http://${host}:4000`;
  } catch {
    return null;
  }
}

export function resolveApiBaseUrl(input: {
  configuredApiBaseUrl?: string;
  expoHostUri?: string | null;
  platform: ApiPlatform;
}): string {
  const configured = input.configuredApiBaseUrl?.trim();
  const host = configured ? hostname(configured) : null;
  const fallback =
    input.platform === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

  // Explicit iOS loopback is intentional for the iOS Simulator. Do not rewrite
  // it to Metro's LAN host: Docker exposes the local API on 127.0.0.1:4000.
  // Physical iPhones must use an explicit Mac LAN address in EXPO_PUBLIC_API_BASE_URL.
  if (
    input.platform === 'ios' &&
    configured &&
    ['localhost', '127.0.0.1', '::1'].includes(host ?? '')
  ) {
    return configured.replace(/\/$/, '');
  }

  // 10.0.2.2 is Android-emulator-only. If it leaks into iOS, recover via the
  // Expo LAN host instead of sending requests to an unreachable address.
  if (input.platform === 'ios' && host === '10.0.2.2') {
    return (expoLanApiBaseUrl(input.expoHostUri, input.platform) ?? fallback).replace(/\/$/, '');
  }

  if (!configured) {
    return (expoLanApiBaseUrl(input.expoHostUri, input.platform) ?? fallback).replace(/\/$/, '');
  }

  // Android localhost points at the emulator/device itself. Prefer Metro's LAN
  // host when known; otherwise use the standard emulator alias.
  if (
    input.platform === 'android' &&
    ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host ?? '')
  ) {
    return (expoLanApiBaseUrl(input.expoHostUri, input.platform) ?? fallback).replace(/\/$/, '');
  }

  return configured.replace(/\/$/, '');
}
