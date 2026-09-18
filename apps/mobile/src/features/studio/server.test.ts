import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStudioSubmissionAttempts,
  resolveStudioSelection,
  startStudioGeneration,
} from './server';
import type { StudioFlow } from './studioFlow';

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
        if (revision !== mocks.revision)
          throw Object.assign(new Error('session changed'), { code: 'AUTH_SESSION_CHANGED' });
      },
    };
  },
}));
vi.mock('@/features/create/server', () => ({
  createSubmissionKey: (value?: string) => value ?? 'mobile_studio_generated_key',
  uploadSourceAsset: mocks.upload,
}));

function flow(update: Partial<StudioFlow> = {}): StudioFlow {
  return {
    mode: 'product',
    primaryUri: 'file:///product.jpg',
    primaryName: 'product.jpg',
    secondaryUri: null,
    secondaryName: null,
    categoryId: 'handbag',
    sceneId: 'white-studio',
    presetId: null,
    quality: 'STANDARD',
    aspectRatio: '4:5',
    rightsConfirmed: true,
    userNotes: '',
    ...update,
  };
}

const callsAt = (path: string) =>
  mocks.api.mock.calls.filter(([calledPath]) => calledPath === path);
const paths = () => mocks.api.mock.calls.map(([path]) => path as string);
const parsedBody = (path: string, index = 0) =>
  JSON.parse(callsAt(path)[index]![1].body as string) as Record<string, unknown>;

beforeEach(() => {
  mocks.revision += 1;
  clearStudioSubmissionAttempts();
  mocks.api.mockReset();
  mocks.upload.mockReset();
  mocks.upload.mockImplementation(async ({ sourceUri }: { sourceUri: string }) => {
    const assetId = sourceUri.includes('garment') ? 'asset-garment' : 'asset-primary';
    return {
      assetId,
      asset: { id: assetId, status: 'READY', mimeType: 'image/jpeg', sizeBytes: 10 },
      mimeType: 'image/jpeg',
      sizeBytes: 10,
    };
  });
  mocks.api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/v1/generations/quote')
      return { creditCost: 8, availableCredits: 20, canGenerate: true, breakdown: [] };
    if (path === '/v1/projects') {
      const body = JSON.parse(init?.body as string);
      return {
        project: {
          id: 'project-studio',
          title: body.title,
          mode: body.mode,
          status: 'DRAFT',
          sourceAssetId: body.sourceAssetId,
          sceneTemplateId: null,
          stylePresetId: null,
          featuredPersonId: null,
          composition: null,
          aspectRatio: body.aspectRatio,
        },
      };
    }
    if (path === '/v1/generations' || path === '/v1/generations/preview')
      return {
        generationId: 'generation-studio',
        projectId: 'project-studio',
        status: 'QUEUED',
        creditReservationId: 'reservation-studio',
        reservedCredits: 8,
        estimatedQueueSeconds: 1,
        statusUrl: '/v1/generations/generation-studio',
      };
    throw new Error(`Unexpected test path: ${path}`);
  });
});

describe('studio server selection', () => {
  it('sends only public product IDs, never prompt, model or price', () => {
    expect(resolveStudioSelection(flow())).toEqual({
      kind: 'PRODUCT_STUDIO',
      categoryId: 'handbag',
      sceneId: 'white-studio',
    });
  });

  it('keeps fashion and nail selections in their own discriminated modes', () => {
    expect(
      resolveStudioSelection(
        flow({ mode: 'fashion', categoryId: null, sceneId: 'fashion-golden-hour' }),
      ),
    ).toEqual({ kind: 'VIRTUAL_TRY_ON', sceneId: 'fashion-golden-hour' });
    expect(
      resolveStudioSelection(
        flow({ mode: 'nails', categoryId: null, sceneId: null, presetId: 'nail-french' }),
      ),
    ).toEqual({ kind: 'NAIL_PREVIEW', presetId: 'nail-french' });
  });

  it('rejects missing choices and unbounded notes before upload', () => {
    expect(() => resolveStudioSelection(flow({ categoryId: null }))).toThrow('kategorisini');
    expect(() => resolveStudioSelection(flow({ sceneId: null }))).toThrow('sahnesini');
    expect(() => resolveStudioSelection(flow({ userNotes: 'a'.repeat(501) }))).toThrow(
      '500 karakter',
    );
  });

  it('uploads person then garment and submits only the typed virtual try-on selection', async () => {
    const selectedFlow = flow({
      mode: 'fashion',
      categoryId: null,
      sceneId: 'fashion-golden-hour',
      secondaryUri: 'file:///garment.png',
      secondaryName: 'garment.png',
      userNotes: 'Dökümü doğal tut.',
    });

    await startStudioGeneration(selectedFlow, { idempotencyKey: 'studio_fashion_01' });

    expect(mocks.upload.mock.calls.map(([source]) => source)).toEqual([
      { sourceUri: 'file:///product.jpg', sourceName: 'product.jpg' },
      { sourceUri: 'file:///garment.png', sourceName: 'garment.png' },
    ]);
    expect(paths()).toEqual(['/v1/generations/quote', '/v1/projects', '/v1/generations']);
    expect(parsedBody('/v1/generations/quote')).toEqual({
      mode: 'VIRTUAL_TRY_ON',
      quality: 'STANDARD',
      numberOfImages: 1,
      studio: { kind: 'VIRTUAL_TRY_ON', sceneId: 'fashion-golden-hour' },
    });
    expect(parsedBody('/v1/projects')).toMatchObject({
      mode: 'VIRTUAL_TRY_ON',
      sourceAssetId: 'asset-primary',
    });
    const generation = parsedBody('/v1/generations');
    expect(generation).toMatchObject({
      projectId: 'project-studio',
      sourceAssetId: 'asset-primary',
      secondarySourceAssetId: 'asset-garment',
      mode: 'VIRTUAL_TRY_ON',
      studio: { kind: 'VIRTUAL_TRY_ON', sceneId: 'fashion-golden-hour' },
      quality: 'STANDARD',
      userNotes: 'Dökümü doğal tut.',
      disclosureAccepted: true,
    });
    for (const serverOwnedField of ['taskType', 'prompt', 'model', 'creditCost', 'price'])
      expect(generation).not.toHaveProperty(serverOwnedField);
    expect(callsAt('/v1/generations')[0]![1].headers).toEqual({
      'Idempotency-Key': 'studio_fashion_01',
    });
  });

  it.each([
    ['PREVIEW', '/v1/generations/preview'],
    ['STANDARD', '/v1/generations'],
    ['HD', '/v1/generations'],
  ] as const)('routes %s jobs to the correct generation endpoint', async (quality, endpoint) => {
    await startStudioGeneration(flow({ quality }), {
      idempotencyKey: `studio_${quality.toLowerCase()}_01`,
    });
    expect(callsAt(endpoint)).toHaveLength(1);
    const otherEndpoint =
      endpoint === '/v1/generations' ? '/v1/generations/preview' : '/v1/generations';
    expect(callsAt(otherEndpoint)).toHaveLength(0);
    expect(parsedBody(endpoint)).toMatchObject({ quality });
  });

  it('replays a lost preview response with the same key without re-uploading or creating twice', async () => {
    const original = mocks.api.getMockImplementation()!;
    let previewCalls = 0;
    mocks.api.mockImplementation((path, init) => {
      if (path === '/v1/generations/preview' && ++previewCalls === 1)
        throw new Error('Response lost after acceptance');
      return original(path, init);
    });
    const selectedFlow = flow({ quality: 'PREVIEW' });
    const key = 'studio_preview_retry_01';

    await expect(startStudioGeneration(selectedFlow, { idempotencyKey: key })).rejects.toThrow(
      'Response lost',
    );
    const result = await startStudioGeneration(selectedFlow, { idempotencyKey: key });

    expect(result.generation.generationId).toBe('generation-studio');
    expect(callsAt('/v1/generations/preview')).toHaveLength(2);
    expect(callsAt('/v1/generations/preview')[0]![1]).toEqual(
      callsAt('/v1/generations/preview')[1]![1],
    );
    expect(callsAt('/v1/generations/quote')).toHaveLength(1);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(callsAt('/v1/projects')).toHaveLength(1);
  });

  it('never reuses a previous account checkpoint for the same submission key', async () => {
    const key = 'studio_account_scope_01';
    const first = await startStudioGeneration(flow(), { idempotencyKey: key });
    mocks.revision += 1;
    const second = await startStudioGeneration(flow(), { idempotencyKey: key });

    expect(second).not.toBe(first);
    expect(callsAt('/v1/generations/quote')).toHaveLength(2);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(callsAt('/v1/projects')).toHaveLength(2);
    expect(callsAt('/v1/generations')).toHaveLength(2);
  });
});
