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

function needsNativeDevelopmentHost(value: string | undefined, platform: ApiPlatform): boolean {
  if (!value) return true;
  if (platform === 'web') return false;
  const host = hostname(value);
  if (!host) return false;
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) return true;
  // 10.0.2.2 is an Android Emulator alias. It is unreachable from iOS.
  if (host === '10.0.2.2' && platform !== 'android') return true;
  return false;
}

export function resolveApiBaseUrl(input: {
  configuredApiBaseUrl?: string;
  expoHostUri?: string | null;
  platform: ApiPlatform;
}): string {
  const configured = input.configuredApiBaseUrl?.trim();
  const fallback =
    input.platform === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

  const resolved = needsNativeDevelopmentHost(configured, input.platform)
    ? (expoLanApiBaseUrl(input.expoHostUri, input.platform) ?? fallback)
    : (configured ?? fallback);

  return resolved.replace(/\/$/, '');
}
