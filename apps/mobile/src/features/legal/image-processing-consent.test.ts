import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  apiRequest: vi.fn(),
}));

vi.mock('expo-secure-store', () => mocks);
vi.mock('@/api/client', () => ({ apiRequest: mocks.apiRequest }));

describe('onboarding image-processing consent handoff', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('records a pending pre-auth grant on the server before upload and clears the handoff', async () => {
    mocks.getItemAsync.mockResolvedValue('true');
    mocks.apiRequest.mockResolvedValue({ granted: true });
    const { ensureImageProcessingConsent } = await import('./image-processing-consent');

    await expect(ensureImageProcessingConsent()).resolves.toEqual({ granted: true });
    expect(mocks.apiRequest).toHaveBeenCalledWith('/v1/me/consents/image-processing', {
      method: 'POST',
      body: JSON.stringify({ accepted: true }),
    });
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith(
      'birkare.image-processing-consent.pending.v1',
    );
  });

  it('uses the backend grant state when there is no pending onboarding choice', async () => {
    mocks.getItemAsync.mockResolvedValue(null);
    mocks.apiRequest.mockResolvedValue({ granted: false });
    const { ensureImageProcessingConsent } = await import('./image-processing-consent');

    await expect(ensureImageProcessingConsent()).resolves.toEqual({ granted: false });
    expect(mocks.apiRequest).toHaveBeenCalledWith('/v1/me/consents/image-processing');
    expect(mocks.deleteItemAsync).not.toHaveBeenCalled();
  });
});
