import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportGeneratedImage } from './native-share';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  download: vi.fn(),
  share: vi.fn(),
  available: vi.fn(),
  permission: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  assertCurrent: vi.fn(),
  bytes: vi.fn(),
  exists: false,
}));
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  FileMode: { ReadOnly: 'r' },
  File: class {
    uri = 'file:///cache/generated.jpg';
    size = 3;
    get exists() {
      return mocks.exists;
    }
    open() {
      return { readBytes: mocks.bytes, close: vi.fn() };
    }
    delete = mocks.remove;
    static downloadFileAsync = mocks.download;
  },
}));
vi.mock('expo-media-library', () => ({
  Asset: { create: mocks.save },
  requestPermissionsAsync: mocks.permission,
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: mocks.available, shareAsync: mocks.share }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('@/api/client', () => ({
  apiBaseUrl: 'https://api.example',
  apiRequest: mocks.request,
  captureSessionRequestScope: () => ({ assertCurrent: mocks.assertCurrent }),
}));
vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: { getState: () => ({ accessToken: 'private-token' }) },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.exists = false;
  mocks.available.mockResolvedValue(true);
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.bytes.mockReturnValue(new Uint8Array([255, 216, 255]));
  mocks.download.mockImplementation(async () => {
    mocks.exists = true;
  });
  mocks.assertCurrent.mockImplementation(() => undefined);
  mocks.request.mockResolvedValue({
    status: 'COMPLETED',
    outputs: [
      {
        id: 'output',
        selected: true,
        variantIndex: 0,
        asset: {
          id: 'asset',
          status: 'READY',
          mimeType: 'image/jpeg',
          accessUrl: 'https://private.example/signed',
        },
      },
    ],
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('native image export', () => {
  it('fetches actual output and shares an image file, not just text or a public URL', async () => {
    await exportGeneratedImage('generation', 'output', 'Instagram');
    expect(mocks.request).toHaveBeenCalledWith('/v1/generations/generation');
    expect(mocks.download).toHaveBeenCalledWith(
      'https://private.example/signed',
      expect.anything(),
      expect.objectContaining({ headers: undefined }),
    );
    expect(mocks.share).toHaveBeenCalledWith(
      'file:///cache/generated.jpg',
      expect.objectContaining({ mimeType: 'image/jpeg' }),
    );
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it('requests add-only photo permission only for saving', async () => {
    await exportGeneratedImage('generation', undefined, 'save');
    expect(mocks.permission).toHaveBeenCalledWith(true, ['photo']);
    expect(mocks.save).toHaveBeenCalledWith('file:///cache/generated.jpg');
    expect(mocks.share).not.toHaveBeenCalled();
  });
  it('does not download or save on permission refusal', async () => {
    mocks.permission.mockResolvedValue({ granted: false });
    await expect(exportGeneratedImage('g', undefined, 'save')).rejects.toThrow('izni');
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('cleans partial downloads and never shares on a download error', async () => {
    mocks.download.mockImplementation(async () => {
      mocks.exists = true;
      throw new Error('network');
    });
    await expect(exportGeneratedImage('g', undefined, 'other')).rejects.toThrow('network');
    expect(mocks.share).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it('refuses an invalid downloaded image', async () => {
    mocks.bytes.mockReturnValue(new TextEncoder().encode('error'));
    await expect(exportGeneratedImage('g', undefined, 'Facebook')).rejects.toThrow('geçerli');
    expect(mocks.share).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it('refuses sharing after account changes during download', async () => {
    mocks.download.mockImplementation(async () => {
      mocks.exists = true;
      mocks.assertCurrent.mockImplementation(() => {
        throw new Error('Oturum değişti');
      });
    });
    await expect(exportGeneratedImage('g', undefined, 'X / Twitter')).rejects.toThrow('Oturum');
    expect(mocks.share).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
