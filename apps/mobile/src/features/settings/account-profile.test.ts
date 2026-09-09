import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/features/auth/auth-store';
import { profileNameSchema, updateAccountProfile } from './account-profile';

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  commit: vi.fn(),
  auth: { state: 'authenticated', user: { id: 'account-a' } },
}));
vi.mock('@/api/client', () => ({ apiRequest: mocks.api }));
vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: { getState: () => mocks.auth, setState: mocks.commit },
}));

const user: AuthUser = {
  id: 'account-a',
  email: 'account@example.com',
  firstName: 'İpek',
  lastName: 'Öztürk',
  emailVerified: true,
  role: 'USER',
};

beforeEach(() => {
  mocks.api.mockReset().mockResolvedValue({ user });
  mocks.commit.mockReset();
  mocks.auth.state = 'authenticated';
  mocks.auth.user = { id: 'account-a' };
});

describe('profile name validation', () => {
  it('preserves Turkish characters and normalizes whitespace', () => {
    expect(profileNameSchema.parse({ firstName: '  İpek   Gül  ', lastName: ' Öztürk ' })).toEqual({
      firstName: 'İpek Gül',
      lastName: 'Öztürk',
    });
  });
  it('allows clearing the optional surname', () => {
    expect(profileNameSchema.parse({ firstName: 'İpek', lastName: '   ' })).toEqual({
      firstName: 'İpek',
      lastName: null,
    });
  });
  it('requires a name and enforces the same 80-character backend limit', () => {
    expect(profileNameSchema.safeParse({ firstName: ' ', lastName: '' }).success).toBe(false);
    expect(profileNameSchema.safeParse({ firstName: 'a'.repeat(81), lastName: '' }).success).toBe(
      false,
    );
    expect(
      profileNameSchema.safeParse({ firstName: 'İpek', lastName: 'a'.repeat(81) }).success,
    ).toBe(false);
    expect(profileNameSchema.safeParse({ firstName: 'a'.repeat(80), lastName: '' }).success).toBe(
      true,
    );
  });
  it('rejects control characters inside a name', () => {
    expect(profileNameSchema.safeParse({ firstName: 'Ali\nVeli', lastName: '' }).success).toBe(
      false,
    );
  });
});

describe('real profile update', () => {
  it('patches only editable names and commits the server-confirmed user', async () => {
    const result = await updateAccountProfile(
      { firstName: ' İpek ', lastName: ' Öztürk ' },
      user.id,
    );
    expect(mocks.api).toHaveBeenCalledWith('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'İpek', lastName: 'Öztürk' }),
    });
    expect(result).toEqual(user);
    expect(mocks.commit).toHaveBeenCalledWith({ user });
  });
  it('does not call the API for invalid form fields', async () => {
    await expect(updateAccountProfile({ firstName: '', lastName: '' }, user.id)).rejects.toThrow();
    expect(mocks.api).not.toHaveBeenCalled();
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it('never presents an unconfirmed save when the server rejects it', async () => {
    mocks.api.mockRejectedValue(new Error('offline'));
    await expect(
      updateAccountProfile({ firstName: 'İpek', lastName: '' }, user.id),
    ).rejects.toThrow('offline');
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it('rejects a stale form before writing into a different account', async () => {
    mocks.auth.user = { id: 'account-b' };
    await expect(
      updateAccountProfile({ firstName: 'İpek', lastName: '' }, user.id),
    ).rejects.toThrow('Hesabın değişti');
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it('does not replace the new account when the response arrives after an account switch', async () => {
    mocks.api.mockImplementation(async () => {
      mocks.auth.user = { id: 'account-b' };
      return { user };
    });
    await expect(
      updateAccountProfile({ firstName: 'İpek', lastName: '' }, user.id),
    ).rejects.toThrow('Hesabın değişti');
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it('rejects a mismatched server user and requires authentication', async () => {
    mocks.api.mockResolvedValue({ user: { ...user, id: 'account-b' } });
    await expect(
      updateAccountProfile({ firstName: 'İpek', lastName: '' }, user.id),
    ).rejects.toThrow('doğrulanamadı');
    expect(mocks.commit).not.toHaveBeenCalled();
    mocks.auth.state = 'anonymous';
    mocks.api.mockClear();
    await expect(
      updateAccountProfile({ firstName: 'İpek', lastName: '' }, user.id),
    ).rejects.toThrow('Hesabın değişti');
    expect(mocks.api).not.toHaveBeenCalled();
  });
});
