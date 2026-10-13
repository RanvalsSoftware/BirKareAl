import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({ File: class {}, Paths: {} }));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));
vi.mock('expo-media-library', () => ({ Asset: {}, requestPermissionsAsync: vi.fn() }));
vi.mock('expo-sharing', () => ({}));
vi.mock('react-native', () => ({ Image: {} }));
vi.mock('@/api/client', () => ({ apiBaseUrl: '', apiRequest: vi.fn() }));
vi.mock('@/features/auth/auth-store', () => ({ useAuthStore: { getState: () => ({}) } }));
vi.mock('@/i18n/engine', () => ({ tr: (text: string) => text }));

import { centeredCrop, keptShare } from './format-pack';

describe('centeredCrop', () => {
  it('keeps the full height when the target is narrower', () => {
    expect(centeredCrop({ width: 1536, height: 1024 }, { width: 1080, height: 1350 })).toEqual({
      originX: 359,
      originY: 0,
      width: 819,
      height: 1024,
    });
  });

  it('keeps the full width when the target is wider', () => {
    expect(centeredCrop({ width: 1024, height: 1280 }, { width: 1920, height: 1080 })).toEqual({
      originX: 0,
      originY: 352,
      width: 1024,
      height: 576,
    });
  });

  it('returns the whole image for a matching shape', () => {
    expect(centeredCrop({ width: 1024, height: 1024 }, { width: 1080, height: 1080 })).toEqual({
      originX: 0,
      originY: 0,
      width: 1024,
      height: 1024,
    });
  });
});

describe('keptShare', () => {
  it('reports how much of the picture survives the crop', () => {
    expect(keptShare({ width: 1024, height: 1024 }, { width: 1080, height: 1080 })).toBe(1);
    expect(keptShare({ width: 1024, height: 1280 }, { width: 1920, height: 1080 })).toBeCloseTo(
      0.45,
      2,
    );
  });
});
