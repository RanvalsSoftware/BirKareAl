import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
  invalidate: vi.fn(),
  loadGoogle: vi.fn(),
  signOutGoogle: vi.fn(),
}));
vi.mock('@/api/client', () => ({
  apiRequest: mocks.request,
  configureSessionBridge: vi.fn(),
  invalidateSessionRequests: mocks.invalidate,
}));
vi.mock('./token-store', () => ({
  getRefreshToken: mocks.read,
  saveRefreshToken: mocks.save,
  clearRefreshToken: mocks.clear,
}));
vi.mock('./google-sign-in', () => {
  mocks.loadGoogle();
  return { signOutOfNativeGoogleIfAvailable: mocks.signOutGoogle };
});

const user = {
  id: 'test-user',
  email: 'test@example.test',
  firstName: null,
  lastName: null,
  emailVerified: true,
  role: 'USER' as const,
};
describe('auth launch lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.save.mockResolvedValue(undefined);
    mocks.clear.mockResolvedValue(undefined);
    mocks.signOutGoogle.mockResolvedValue(undefined);
  });

  it('does not load Google button UI when the auth store is imported', async () => {
    const { useAuthStore } = await import('./auth-store');
    expect(useAuthStore.getState().state).toBe('booting');
    expect(mocks.loadGoogle).not.toHaveBeenCalled();
    mocks.read.mockResolvedValue(null);
    await useAuthStore.getState().signOut();
    expect(mocks.loadGoogle).toHaveBeenCalledOnce();
    expect(mocks.signOutGoogle).toHaveBeenCalledOnce();
  });

  it('leaves booting even if SecureStore read and cleanup both fail', async () => {
    const { useAuthStore } = await import('./auth-store');
    mocks.read.mockRejectedValue(new Error('keychain inaccessible'));
    mocks.clear.mockRejectedValue(new Error('keychain inaccessible'));
    await expect(useAuthStore.getState().bootstrap()).resolves.toBeUndefined();
    expect(useAuthStore.getState()).toMatchObject({
      state: 'anonymous',
      accessToken: null,
      user: null,
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('shares duplicate bootstrap calls instead of replaying the same refresh token', async () => {
    const { useAuthStore } = await import('./auth-store');
    mocks.read.mockResolvedValue('refresh');
    mocks.request.mockResolvedValue({ accessToken: 'access', refreshToken: 'next-refresh', user });
    await Promise.all([useAuthStore.getState().bootstrap(), useAuthStore.getState().bootstrap()]);
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.read).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({ state: 'authenticated', user });
    await useAuthStore.getState().bootstrap();
    expect(mocks.request).toHaveBeenCalledOnce();
  });

  it('leaves booting when refresh fails even if deleting the invalid token fails too', async () => {
    const { useAuthStore } = await import('./auth-store');
    mocks.read.mockResolvedValue('refresh');
    mocks.request.mockRejectedValue(Object.assign(new Error('refresh rejected'), { status: 401 }));
    mocks.clear.mockRejectedValue(new Error('keychain inaccessible'));
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().state).toBe('anonymous');
    expect(mocks.clear).toHaveBeenCalledOnce();
  });

  it('preserves the saved refresh token when a cold deep link opens during an outage', async () => {
    const { useAuthStore } = await import('./auth-store');
    mocks.read.mockResolvedValue('refresh');
    mocks.request.mockRejectedValue(
      Object.assign(new Error('temporarily unavailable'), { status: 503 }),
    );
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().state).toBe('anonymous');
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
