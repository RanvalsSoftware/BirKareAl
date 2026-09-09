import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
}));
vi.mock('expo-secure-store', () => secure);

describe('secure token write ordering', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });
  it('keeps a newer login last even while the previous token is still writing', async () => {
    const { saveRefreshToken, getRefreshToken } = await import('./token-store');
    let finishOld!: () => void;
    secure.setItemAsync
      .mockImplementationOnce(
        () =>
          new Promise<void>((done) => {
            finishOld = done;
          }),
      )
      .mockResolvedValueOnce(undefined);
    secure.getItemAsync.mockResolvedValue('new-token');
    const oldSave = saveRefreshToken('old-token');
    const newSave = saveRefreshToken('new-token');
    const read = getRefreshToken();
    await vi.waitFor(() => expect(secure.setItemAsync).toHaveBeenCalledTimes(1));
    expect(secure.getItemAsync).not.toHaveBeenCalled();
    finishOld();
    await Promise.all([oldSave, newSave]);
    expect(secure.setItemAsync.mock.calls.map((call) => call[1])).toEqual([
      'old-token',
      'new-token',
    ]);
    expect(await read).toBe('new-token');
  });
  it('executes sign-out deletion after a pending save', async () => {
    const { saveRefreshToken, clearRefreshToken } = await import('./token-store');
    secure.setItemAsync.mockResolvedValue(undefined);
    secure.deleteItemAsync.mockResolvedValue(undefined);
    await Promise.all([saveRefreshToken('token'), clearRefreshToken()]);
    expect(secure.setItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
      secure.deleteItemAsync.mock.invocationCallOrder[0]!,
    );
  });
});
