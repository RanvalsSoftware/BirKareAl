import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tokens = vi.hoisted(() => ({
  getRefreshToken: vi.fn(async () => 'old-refresh'),
  saveRefreshToken: vi.fn(async (_token: string) => undefined),
  clearRefreshToken: vi.fn(async () => undefined),
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://test.invalid' } } },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../features/auth/token-store', () => tokens);

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

describe('authenticated request account boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('bounds a stalled native fetch and aborts the underlying request', async () => {
    vi.useFakeTimers();
    const { apiRequest, API_REQUEST_TIMEOUT_MS } = await import('./client');
    const fetch = vi.fn(
      (_url: string, _init: RequestInit) => new Promise<Response>(() => undefined),
    );
    vi.stubGlobal('fetch', fetch);
    const pending = apiRequest('/v1/generations/test');
    const assertion = expect(pending).rejects.toMatchObject({ code: 'NETWORK_REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await assertion;
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('also bounds a response whose body never finishes', async () => {
    vi.useFakeTimers();
    const { apiRequest, API_REQUEST_TIMEOUT_MS } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, ok: true, json: () => new Promise(() => undefined) })),
    );
    const pending = apiRequest('/v1/generations/test');
    const assertion = expect(pending).rejects.toMatchObject({ code: 'NETWORK_REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it.each(['network', 'server'])(
    'preserves the session on a temporary refresh %s failure',
    async (kind) => {
      const { apiRequest, configureSessionBridge } = await import('./client');
      const clearSession = vi.fn();
      configureSessionBridge({
        getAccessToken: () => 'expired-access',
        setSession: vi.fn(),
        clearSession,
      });
      const fetch = vi.fn().mockResolvedValueOnce(response(null, 401));
      if (kind === 'network') fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
      else fetch.mockResolvedValueOnce(response(null, 503));
      vi.stubGlobal('fetch', fetch);
      await expect(apiRequest('/v1/billing/wallet')).rejects.toBeInstanceOf(Error);
      expect(tokens.clearRefreshToken).not.toHaveBeenCalled();
      expect(clearSession).not.toHaveBeenCalled();
    },
  );

  it('still clears an explicitly rejected refresh token', async () => {
    const { apiRequest, configureSessionBridge } = await import('./client');
    const clearSession = vi.fn();
    configureSessionBridge({
      getAccessToken: () => 'expired-access',
      setSession: vi.fn(),
      clearSession,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(null, 401)));
    await expect(apiRequest('/v1/billing/wallet')).rejects.toBeInstanceOf(Error);
    expect(tokens.clearRefreshToken).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it('does not return a previous account response after the login changes', async () => {
    const { apiRequest, invalidateSessionRequests } = await import('./client');
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = apiRequest('/v1/projects');
    invalidateSessionRequests();
    resolve(response({ privateImage: 'old-user' }));
    await expect(pending).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  });

  it.each([200, 401])(
    'old refresh response (%i) cannot replace or clear a new session',
    async (status) => {
      const { apiRequest, configureSessionBridge, invalidateSessionRequests } =
        await import('./client');
      const writeSession = vi.fn();
      const clearSession = vi.fn();
      configureSessionBridge({
        getAccessToken: () => 'old-access',
        setSession: writeSession,
        clearSession,
      });
      let finishRefresh!: (value: Response) => void;
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response(null, 401))
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              finishRefresh = resolve;
            }),
        );
      vi.stubGlobal('fetch', fetch);
      const pending = apiRequest('/v1/billing/wallet');
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      invalidateSessionRequests();
      finishRefresh(
        response({ accessToken: 'old-new-access', refreshToken: 'old-new-refresh' }, status),
      );
      await expect(pending).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
      expect(tokens.saveRefreshToken).not.toHaveBeenCalled();
      expect(tokens.clearRefreshToken).not.toHaveBeenCalled();
      expect(writeSession).not.toHaveBeenCalled();
      expect(clearSession).not.toHaveBeenCalled();
    },
  );

  it('shares a current-account refresh and retries only with its new token', async () => {
    const { apiRequest, configureSessionBridge } = await import('./client');
    const writeSession = vi.fn();
    configureSessionBridge({
      getAccessToken: () => 'old-access',
      setSession: writeSession,
      clearSession: vi.fn(),
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(
        response({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh' }),
      )
      .mockResolvedValueOnce(response({ available: 8 }));
    vi.stubGlobal('fetch', fetch);
    expect(await apiRequest('/v1/billing/wallet')).toEqual({ available: 8 });
    expect(tokens.saveRefreshToken).toHaveBeenCalledWith('fresh-refresh');
    expect(fetch.mock.calls[2]?.[1].headers.authorization).toBe('Bearer fresh-access');
    expect(writeSession).toHaveBeenCalledTimes(1);
  });
});
