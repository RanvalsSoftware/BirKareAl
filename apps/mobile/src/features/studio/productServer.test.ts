import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProductStudioSubmissionAttempts,
  resolveProductStudioSelection,
  startProductStudioGeneration,
} from './productServer';
import type { ProductStudioFlow } from './productFlow';

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  upload: vi.fn(),
  revision: 0,
}));

vi.mock('@/api/client', () => ({
  apiRequest: mocks.api,
  captureSessionRequestScope: () => {
    const revision = mocks.revision;
    return {
      revision,
      assertCurrent: () => {
        if (revision !== mocks.revision) throw new Error('session changed');
      },
    };
  },
}));

vi.mock('@/features/create/server', () => ({
  createSubmissionKey: (value?: string) => value ?? 'product_generated_key',
  uploadSourceAsset: mocks.upload,
}));

function flow(update: Partial<ProductStudioFlow> = {}): ProductStudioFlow {
  return {
    mode: 'product',
    productTitle: 'Deri omuz çantası',
    commerceGoal: 'marketplace',
    numberOfImages: 2,
    primaryUri: 'file:///product.jpg',
    primaryName: 'product.jpg',
    categoryId: 'handbag',
    sceneId: 'white-studio',
    quality: 'STANDARD',
    aspectRatio: '4:5',
    rightsConfirmed: true,
    userNotes: '',
    ...update,
  };
}

const callsAt = (path: string) =>
  mocks.api.mock.calls.filter(([calledPath]) => calledPath === path);
const parsedBody = (path: string, index = 0) =>
  JSON.parse(callsAt(path)[index]![1].body as string) as Record<string, unknown>;

beforeEach(() => {
  mocks.revision += 1;
  clearProductStudioSubmissionAttempts();
  mocks.api.mockReset();
  mocks.upload.mockReset();
  mocks.upload.mockResolvedValue({
    assetId: 'asset-product',
    asset: { id: 'asset-product', status: 'READY', mimeType: 'image/jpeg', sizeBytes: 10 },
    mimeType: 'image/jpeg',
    sizeBytes: 10,
  });
  mocks.api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/v1/generations/quote')
      return { creditCost: 10, availableCredits: 20, canGenerate: true, breakdown: [] };
    if (path === '/v1/projects') {
      const body = JSON.parse(init?.body as string);
      return {
        project: {
          id: 'project-product',
          title: body.title,
          mode: body.mode,
          status: 'DRAFT',
          sourceAssetId: body.sourceAssetId,
          aspectRatio: body.aspectRatio,
        },
      };
    }
    if (path === '/v1/generations' || path === '/v1/generations/preview')
      return {
        generationId: 'generation-product',
        projectId: 'project-product',
        status: 'QUEUED',
        creditReservationId: 'reservation-product',
        reservedCredits: 10,
        estimatedQueueSeconds: 1,
        statusUrl: '/v1/generations/generation-product',
      };
    throw new Error(`Unexpected test path: ${path}`);
  });
});

describe('product-only studio server', () => {
  it('resolves only a typed product selection', () => {
    expect(resolveProductStudioSelection(flow())).toEqual({
      kind: 'PRODUCT_STUDIO',
      categoryId: 'handbag',
      sceneId: 'white-studio',
    });
    expect(() => resolveProductStudioSelection(flow({ categoryId: null }))).toThrow('kategorisini');
    expect(() => resolveProductStudioSelection(flow({ userNotes: 'a'.repeat(501) }))).toThrow(
      '500 karakter',
    );
  });

  it('uploads one product and sends no legacy-mode fields', async () => {
    await startProductStudioGeneration(flow({ productTitle: '  Yeni sezon vazo  ' }), {
      idempotencyKey: 'product_01',
    });

    expect(mocks.upload).toHaveBeenCalledWith(
      { sourceUri: 'file:///product.jpg', sourceName: 'product.jpg' },
      expect.any(Function),
      expect.any(Function),
    );
    expect(parsedBody('/v1/generations/quote')).toEqual({
      mode: 'PRODUCT_STUDIO',
      quality: 'STANDARD',
      numberOfImages: 2,
      studio: { kind: 'PRODUCT_STUDIO', categoryId: 'handbag', sceneId: 'white-studio' },
    });
    expect(parsedBody('/v1/projects')).toMatchObject({
      title: 'Yeni sezon vazo',
      mode: 'PRODUCT_STUDIO',
      sourceAssetId: 'asset-product',
    });
    const generation = parsedBody('/v1/generations');
    expect(generation).toMatchObject({
      mode: 'PRODUCT_STUDIO',
      sourceAssetId: 'asset-product',
      preserveFace: false,
      preserveClothes: true,
      disclosureAccepted: true,
    });
    expect(generation).not.toHaveProperty('secondarySourceAssetId');
  });

  it('rejects invalid product requests before upload', async () => {
    await expect(
      startProductStudioGeneration(flow({ quality: 'PREVIEW', numberOfImages: 4 })),
    ).rejects.toThrow('en fazla 2');
    await expect(startProductStudioGeneration(flow({ productTitle: ' ' }))).rejects.toThrow(
      'Ürün adını yaz',
    );
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
