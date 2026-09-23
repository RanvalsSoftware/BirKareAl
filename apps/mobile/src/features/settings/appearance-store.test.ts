import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  api: vi.fn(),
  auth: { state: 'authenticated', user: { id: 'account-a' } },
  authListeners: new Set<() => void>(),
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('@/api/client', () => ({ apiRequest: mocks.api }));
vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: {
    getState: () => mocks.auth,
    subscribe: (listener: () => void) => {
      mocks.authListeners.add(listener);
      return () => mocks.authListeners.delete(listener);
    },
  },
}));

beforeEach(() => {
  vi.resetModules();
  mocks.read.mockReset().mockResolvedValue(null);
  mocks.write.mockReset().mockResolvedValue(undefined);
  mocks.api.mockReset().mockResolvedValue({ preferences: {} });
  mocks.auth.state = 'authenticated';
  mocks.auth.user = { id: 'account-a' };
  mocks.authListeners.clear();
});

async function state() {
  return (await import('./appearance-store')).useAppearanceStore;
}

describe('appearance preference persistence', () => {
  it('hydrates saved appearance preferences', async () => {
    mocks.read.mockResolvedValue(JSON.stringify({ glassEffects: false, reducedMotion: true }));
    const store = await state();
    await store.getState().hydrate();
    expect(store.getState()).toMatchObject({
      glassEffects: false,
      reducedMotion: true,
      hydrated: true,
    });
  });

  it('does not block opening the app when saved preferences are invalid', async () => {
    mocks.read.mockResolvedValue('{broken');
    const store = await state();
    await expect(store.getState().hydrate()).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({
      glassEffects: true,
      reducedMotion: false,
      hydrated: true,
    });
  });

  it('writes only the changed appearance preference and keeps the server in dark mode', async () => {
    const store = await state();
    await store.getState().setGlassEffects(false);
    expect(mocks.api).toHaveBeenCalledWith('/v1/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ glassEffects: false, theme: 'dark' }),
      signal: expect.any(AbortSignal),
    });
    expect(store.getState().glassEffects).toBe(false);
    expect(JSON.parse(mocks.write.mock.calls.at(-1)![1])).toMatchObject({
      glassEffects: false,
      reducedMotion: false,
    });
  });

  it('never displays a successful setting when the server rejected it', async () => {
    mocks.api.mockRejectedValue(new Error('offline'));
    const store = await state();
    await expect(store.getState().setReducedMotion(true)).rejects.toThrow('offline');
    expect(store.getState().reducedMotion).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('can save an anonymous device preference without calling the protected API', async () => {
    mocks.auth.state = 'anonymous';
    const store = await state();
    await store.getState().setReducedMotion(true);
    expect(mocks.api).not.toHaveBeenCalled();
    expect(store.getState().reducedMotion).toBe(true);
  });

  it('does not let an older local read replace newer authenticated preferences', async () => {
    let finishRead!: (value: string) => void;
    mocks.read.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finishRead = resolve;
        }),
    );
    const store = await state();
    const hydration = store.getState().hydrate();
    store.getState().syncFromServer({ glassEffects: false, reducedMotion: true });
    finishRead(JSON.stringify({ glassEffects: true, reducedMotion: false }));
    await hydration;
    expect(store.getState()).toMatchObject({ glassEffects: false, reducedMotion: true });
  });

  it('keeps both choices when two independent preferences are changed concurrently', async () => {
    const store = await state();
    await Promise.all([
      store.getState().setGlassEffects(false),
      store.getState().setReducedMotion(true),
    ]);
    expect(store.getState()).toMatchObject({ glassEffects: false, reducedMotion: true });
    expect(JSON.parse(mocks.write.mock.calls.at(-1)![1])).toMatchObject({
      glassEffects: false,
      reducedMotion: true,
    });
  });

  it('ignores a server response that predates a newer user choice', async () => {
    const store = await state();
    const revisionAtRequestStart = store.getState().revision;
    await store.getState().setGlassEffects(false);
    expect(store.getState().syncFromServer({ glassEffects: true }, revisionAtRequestStart)).toBe(
      false,
    );
    expect(store.getState().glassEffects).toBe(false);
  });

  it('guards stale server responses while a new preference is still saving', async () => {
    let finishRequest!: () => void;
    mocks.api.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = resolve;
        }),
    );
    const store = await state();
    const requestRevision = store.getState().revision;
    const changing = store.getState().setReducedMotion(true);
    await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(1));
    expect(store.getState().syncFromServer({ reducedMotion: false }, requestRevision)).toBe(false);
    finishRequest();
    await changing;
    expect(store.getState().reducedMotion).toBe(true);
  });

  it('does not treat initial local hydration as a mutation that blocks server settings', async () => {
    const store = await state();
    const requestRevision = store.getState().revision;
    await store.getState().hydrate();
    expect(store.getState().syncFromServer({ reducedMotion: true }, requestRevision)).toBe(true);
    expect(store.getState().reducedMotion).toBe(true);
  });

  it('discards both in-flight and queued changes after the account changes', async () => {
    let finishRequest!: () => void;
    mocks.api.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = resolve;
        }),
    );
    const store = await state();
    const inFlight = store.getState().setGlassEffects(false);
    const queued = store.getState().setReducedMotion(true);
    const completed = Promise.allSettled([inFlight, queued]);
    await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(1));
    mocks.auth.user = { id: 'account-b' };
    mocks.authListeners.forEach((listener) => listener());
    expect((mocks.api.mock.calls[0][1].signal as AbortSignal).aborted).toBe(true);
    finishRequest();
    expect((await completed).every((result) => result.status === 'rejected')).toBe(true);
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.authListeners.size).toBe(0);
    expect(store.getState()).toMatchObject({ glassEffects: true, reducedMotion: false });
  });

  it('keeps the confirmed server setting if device storage fails and explains the partial failure', async () => {
    mocks.write.mockRejectedValue(new Error('keychain unavailable'));
    const store = await state();
    await expect(store.getState().setGlassEffects(false)).rejects.toThrow('hesabına kaydedildi');
    expect(store.getState().glassEffects).toBe(false);
  });

  it('allows the next change after a failed update without leaving the queue blocked', async () => {
    mocks.api.mockRejectedValueOnce(new Error('offline'));
    const store = await state();
    await expect(store.getState().setGlassEffects(false)).rejects.toThrow('offline');
    await store.getState().setReducedMotion(true);
    expect(store.getState()).toMatchObject({ glassEffects: true, reducedMotion: true });
  });
});
