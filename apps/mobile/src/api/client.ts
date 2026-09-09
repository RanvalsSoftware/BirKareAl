import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getRefreshToken, saveRefreshToken, clearRefreshToken } from '../features/auth/token-store';

export type ApiError = Error & {
  code?: string;
  requestId?: string;
  details?: unknown;
  status?: number;
};

export const API_REQUEST_TIMEOUT_MS = 30_000;

/** Bounds fetching AND reading the response body, including on native devices. */
function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  inheritedSignal?: AbortSignal | null,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: { value: T } | { error: unknown }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      inheritedSignal?.removeEventListener('abort', cancel);
      if ('error' in result) reject(result.error);
      else resolve(result.value);
    };
    const cancel = () => {
      controller.abort();
      const error = new Error('İstek iptal edildi.') as ApiError;
      error.code = 'NETWORK_REQUEST_CANCELLED';
      finish({ error });
    };
    if (inheritedSignal?.aborted) {
      cancel();
      return;
    }
    inheritedSignal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error(
        'Sunucu zamanında yanıt vermedi. Bağlantını kontrol edip yeniden deneyebilirsin.',
      ) as ApiError;
      error.code = 'NETWORK_REQUEST_TIMEOUT';
      finish({ error });
    }, API_REQUEST_TIMEOUT_MS);
    void request(controller.signal).then(
      (value) => finish({ value }),
      (error) => finish({ error }),
    );
  });
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: { requestId?: string; timestamp?: string };
};

type TokenReader = () => string | null;
type SessionWriter = (input: { accessToken: string; refreshToken?: string }) => void;
type SessionClearer = () => void;

let readAccessToken: TokenReader = () => null;
let writeSession: SessionWriter = () => undefined;
let clearSession: SessionClearer = () => undefined;
let refreshInFlight: { revision: number; promise: Promise<string | null> } | null = null;
let sessionRevision = 0;

/** Invalidate requests before storing a new login or clearing the current one. */
export function invalidateSessionRequests(): void {
  sessionRevision += 1;
}

function assertCurrentSession(revision: number): void {
  if (revision === sessionRevision) return;
  const error = new Error('Oturum değişti. Lütfen bu işlemi yeniden başlat.') as ApiError;
  error.code = 'AUTH_SESSION_CHANGED';
  throw error;
}

/** Keep every stage of a multi-request operation inside its original login. */
export function captureSessionRequestScope() {
  const revision = sessionRevision;
  return { revision, assertCurrent: () => assertCurrentSession(revision) };
}

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl;
const platformDefaultApiBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

function getExpoDevelopmentApiBaseUrl(): string | null {
  if (Platform.OS === 'web') return null;

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return `http://${host}:4000`;
  } catch {
    return null;
  }
}

const expoDevelopmentApiBaseUrl = getExpoDevelopmentApiBaseUrl();

// `localhost` inside an Android emulator or a physical device is not the
// development machine. Expo exposes Metro's LAN host while developing, so use
// that address on real devices and retain 10.0.2.2 as the Android emulator fallback.
export const apiBaseUrl = (
  !configuredApiBaseUrl || configuredApiBaseUrl === 'http://localhost:4000'
    ? (expoDevelopmentApiBaseUrl ?? platformDefaultApiBaseUrl)
    : configuredApiBaseUrl
).replace(/\/$/, '');

export function configureSessionBridge(input: {
  getAccessToken: TokenReader;
  setSession: SessionWriter;
  clearSession: SessionClearer;
}) {
  readAccessToken = input.getAccessToken;
  writeSession = input.setSession;
  clearSession = input.clearSession;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    const error = new Error(
      (payload as { error?: { message?: string } } | null)?.error?.message ??
        'Sunucuyla iletişim kurulamadı.',
    ) as ApiError;
    const apiError = (payload as { error?: { code?: string; details?: unknown } } | null)?.error;
    error.code = apiError?.code;
    error.status = response.status;
    error.details = apiError?.details;
    error.requestId = response.headers.get('x-request-id') ?? undefined;
    throw error;
  }
  return payload;
}

async function refreshAccessToken(revision: number): Promise<string | null> {
  assertCurrentSession(revision);
  if (refreshInFlight?.revision === revision) return refreshInFlight.promise;

  const promise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      assertCurrentSession(revision);
      if (!refreshToken) return null;
      const payload = await withRequestTimeout(async (signal) => {
        const response = await fetch(`${apiBaseUrl}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal,
        });
        return readJson<{ accessToken: string; refreshToken: string }>(response);
      });
      assertCurrentSession(revision);
      await saveRefreshToken(payload.data.refreshToken);
      assertCurrentSession(revision);
      writeSession({
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
      });
      return payload.data.accessToken;
    } catch (error) {
      // An old account's refresh must never log out or overwrite a new login.
      assertCurrentSession(revision);
      // Losing connectivity or a temporary server failure does not invalidate
      // a refresh token. Keep the user signed in and allow a later retry.
      const status = (error as ApiError | null)?.status;
      if (status !== 400 && status !== 401 && status !== 403) throw error;
      await clearRefreshToken();
      assertCurrentSession(revision);
      clearSession();
      return null;
    } finally {
      if (refreshInFlight?.revision === revision) refreshInFlight = null;
    }
  })();

  refreshInFlight = { revision, promise };
  return promise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {},
): Promise<T> {
  return withRequestTimeout(async (signal) => {
    const revision = sessionRevision;
    const perform = (accessToken: string | null) =>
      fetch(`${apiBaseUrl}${path}`, {
        ...init,
        signal,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-platform': 'mobile',
          ...(init.headers ?? {}),
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
      });

    let accessToken = options.authenticated === false ? null : readAccessToken();
    let response = await perform(accessToken);
    if (options.authenticated !== false) assertCurrentSession(revision);
    if (response.status === 401 && options.authenticated !== false) {
      accessToken = await refreshAccessToken(revision);
      if (accessToken) response = await perform(accessToken);
    }
    const payload = await readJson<T>(response);
    if (options.authenticated !== false) assertCurrentSession(revision);
    return payload.data;
  }, init.signal);
}
