import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCreateGeneration, type SubmissionStage } from './server';
import type { CreateFlow } from './createFlow';
import { emptyBeautySettings, withBeautyIntensity } from '../beauty/settings';
import { trendCreationSelection, trendPresets } from '../trends/presets';

const mocks = vi.hoisted(() => ({ api: vi.fn(), convert: vi.fn(), revision: 0 }));
vi.mock('@/api/client', () => ({
  apiBaseUrl: 'http://localhost:4000',
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
vi.mock('./source-image-normalizer', () => ({ sourceImageAsJpeg: mocks.convert }));

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0xff, 0xd9]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const webp = new TextEncoder().encode('RIFF0000WEBPexample');
const heic = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypheic0000mif1heic')]);
let keyIndex = 0;
const newKey = () => `upload_test_attempt_${++keyIndex}`;
const sourceFlow = (update: Partial<CreateFlow> = {}): CreateFlow => ({
  mode: 'scene',
  sourceUri: 'file:///source.jpg',
  sourceName: 'source.jpg',
  sourceKind: 'photo',
  sourceCharacterId: null,
  toolId: null,
  sceneId: 'scene-stadium-lights',
  styleId: 'filter-natural',
  personId: null,
  composition: 'Orta',
  aspectRatio: '4:5',
  quality: 'Önizleme',
  numberOfImages: 1,
  filterIntensity: 60,
  preserveFace: true,
  preserveClothes: true,
  saveSource: true,
  sourceRightsConfirmed: true,
  onboardingDraftPending: false,
  customInstruction: '',
  ...update,
});

const fetchMock = vi.fn<typeof fetch>();
const imageResponse = (bytes = jpeg, contentType = '') => {
  const response = new Response(bytes, {
    headers: contentType ? { 'content-type': contentType } : {},
  });
  // Catch regressions to the problematic RN native Blob round-trip.
  response.blob = vi.fn().mockRejectedValue(new Error('Do not use Blob transport'));
  return response;
};
const paths = () => mocks.api.mock.calls.map(([path]) => path as string);
const callsAt = (path: string) => mocks.api.mock.calls.filter(([called]) => called === path);

beforeEach(() => {
  mocks.revision += 1;
  mocks.api.mockReset();
  mocks.convert.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => imageResponse());
  mocks.api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/v1/generations/quote')
      return { creditCost: 1, availableCredits: 21, canGenerate: true, breakdown: [] };
    if (path === '/v1/uploads/initiate')
      return { assetId: 'asset-1', uploadUrl: '/v1/uploads/asset-1/content', method: 'PUT' };
    if (path === '/v1/uploads/asset-1/content') {
      expect(init?.body).toBeInstanceOf(ArrayBuffer);
      return { assetId: 'asset-1', uploaded: true };
    }
    if (path === '/v1/uploads/asset-1/complete')
      return {
        asset: {
          id: 'asset-1',
          status: 'READY',
          mimeType: 'image/jpeg',
          sizeBytes: jpeg.byteLength,
        },
      };
    if (path === '/v1/projects') return { project: { id: 'project-1', sourceAssetId: 'asset-1' } };
    if (path === '/v1/generations')
      return { generationId: 'generation-1', projectId: 'project-1', status: 'QUEUED' };
    throw new Error(`Unexpected test path: ${path}`);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('binary upload and generation startup', () => {
  it.each(trendPresets)(
    'quotes and submits $name once using only the original uploaded photo',
    async (trend) => {
      await startCreateGeneration(
        sourceFlow({ ...trendCreationSelection(trend.id), filterIntensity: 25 }),
        { idempotencyKey: newKey() },
      );
      expect(callsAt('/v1/generations')).toHaveLength(1);
      expect(callsAt('/v1/uploads/initiate')).toHaveLength(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('file:///source.jpg');
      expect(JSON.parse(callsAt('/v1/generations/quote')[0]![1].body)).toMatchObject({
        trendPreset: trend.id,
        mode: 'AI_FILTER',
        sceneTemplateId: null,
        featuredPersonId: null,
      });
      expect(JSON.parse(callsAt('/v1/generations')[0]![1].body)).toMatchObject({
        trendPreset: trend.id,
        filterIntensity: 25,
        sourceAssetId: 'asset-1',
        preserveFace: true,
        preserveClothes: false,
      });
      expect(JSON.parse(callsAt('/v1/generations')[0]![1].body)).not.toHaveProperty('beauty');
      expect(JSON.parse(callsAt('/v1/generations')[0]![1].body)).not.toHaveProperty(
        'transformation',
      );
    },
  );

  it('requires a fresh submission key when the trend changes', async () => {
    const idempotencyKey = newKey();
    await startCreateGeneration(sourceFlow(trendCreationSelection('kpop_star')), {
      idempotencyKey,
    });
    await expect(
      startCreateGeneration(sourceFlow(trendCreationSelection('neon_club_night')), {
        idempotencyKey,
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_INVALID' });
    expect(callsAt('/v1/generations')).toHaveLength(1);
  });

  it('submits combined beauty settings once from the original source and includes quote validation', async () => {
    const beauty = withBeautyIntensity(
      withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35),
      'blemishRemoval',
      65,
    );
    await startCreateGeneration(sourceFlow({ mode: 'filter', sceneId: null, beauty }), {
      idempotencyKey: newKey(),
    });
    expect(callsAt('/v1/generations')).toHaveLength(1);
    expect(callsAt('/v1/uploads/initiate')).toHaveLength(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('file:///source.jpg');
    expect(JSON.parse(callsAt('/v1/generations/quote')[0]![1].body)).toMatchObject({ beauty });
    expect(JSON.parse(callsAt('/v1/generations')[0]![1].body)).toMatchObject({
      beauty,
      sourceAssetId: 'asset-1',
    });
  });
  it('sends explicit gender choice to quote and generation, never as a beauty layer', async () => {
    const transformation = { kind: 'gender-swap', presentation: 'masculine' } as const;
    await startCreateGeneration(
      sourceFlow({ mode: 'filter', sceneId: null, transformation, preserveFace: false }),
      { idempotencyKey: newKey() },
    );
    const body = JSON.parse(callsAt('/v1/generations')[0]![1].body);
    expect(body).toMatchObject({ transformation, preserveFace: false });
    expect(body.beauty).toBeUndefined();
    expect(JSON.parse(callsAt('/v1/generations/quote')[0]![1].body)).toMatchObject({
      transformation,
    });
  });
  it('does not return an old account checkpoint for the same submission key', async () => {
    const key = newKey();
    const first = await startCreateGeneration(sourceFlow(), { idempotencyKey: key });
    mocks.revision += 1;
    const second = await startCreateGeneration(sourceFlow(), { idempotencyKey: key });
    expect(second).not.toBe(first);
    expect(callsAt('/v1/generations/quote')).toHaveLength(2);
    expect(callsAt('/v1/uploads/initiate')).toHaveLength(2);
    expect(callsAt('/v1/generations')).toHaveLength(2);
  });

  it('stops before upload when a local image read outlives the original login', async () => {
    let completeRead!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeRead = resolve;
        }),
    );
    const pending = startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    mocks.revision += 1;
    completeRead(imageResponse());
    await expect(pending).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
    expect(callsAt('/v1/uploads/initiate')).toHaveLength(0);
    expect(callsAt('/v1/projects')).toHaveLength(0);
  });

  it('stops before queueing when an account changes during project creation', async () => {
    const original = mocks.api.getMockImplementation()!;
    mocks.api.mockImplementation(async (path: string, init?: RequestInit) => {
      const result = await original(path, init);
      if (path === '/v1/projects') mocks.revision += 1;
      return result;
    });
    await expect(
      startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() }),
    ).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
    expect(callsAt('/v1/generations')).toHaveLength(0);
  });

  it.each([
    ['JPEG without a content-type', jpeg, '', 'picture.jpg', 'image/jpeg'],
    ['PNG with generic local MIME', png, 'application/octet-stream', 'picture.png', 'image/png'],
    ['JPEG from a HEIC picker filename', jpeg, '', 'IMG_001.HEIC', 'image/jpeg'],
    ['PNG mislabeled as JPEG', png, 'image/jpeg', 'picture.jpg', 'image/png'],
    ['WebP', webp, 'image/webp', 'picture.webp', 'image/webp'],
  ])(
    'uploads %s bytes with the verified MIME instead of Blob.type',
    async (_, bytes, header, name, mimeType) => {
      const response = imageResponse(bytes as Uint8Array<ArrayBuffer>, header as string);
      fetchMock.mockResolvedValue(response);
      const result = await startCreateGeneration(sourceFlow({ sourceName: name as string }), {
        idempotencyKey: newKey(),
      });
      const initiate = JSON.parse(callsAt('/v1/uploads/initiate')[0]![1].body);
      const put = callsAt('/v1/uploads/asset-1/content')[0]![1];
      expect(initiate).toMatchObject({ mimeType, sizeBytes: bytes.byteLength });
      expect(put.headers).toEqual({ 'content-type': mimeType });
      expect(new Uint8Array(put.body)).toEqual(bytes);
      expect(response.blob).not.toHaveBeenCalled();
      expect(result.generation.generationId).toBe('generation-1');
      expect(mocks.convert).not.toHaveBeenCalled();
    },
  );

  it('normalizes real HEIC bytes with the existing decoder before uploading', async () => {
    mocks.convert.mockResolvedValue('file:///normalized.jpg');
    fetchMock.mockResolvedValueOnce(imageResponse(heic)).mockResolvedValueOnce(imageResponse(jpeg));
    await startCreateGeneration(sourceFlow({ sourceName: 'IMG.HEIC' }), {
      idempotencyKey: newKey(),
    });
    expect(mocks.convert).toHaveBeenCalledWith('file:///source.jpg');
    expect(JSON.parse(callsAt('/v1/uploads/initiate')[0]![1].body)).toMatchObject({
      fileName: 'IMG.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: jpeg.byteLength,
    });
  });

  it('decodes a bundled native asset when it can be rendered but not fetched directly', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Unsupported URI'))
      .mockResolvedValueOnce(imageResponse());
    mocks.convert.mockResolvedValue('file:///bundled-copy.jpg');
    await startCreateGeneration(
      sourceFlow({ sourceUri: 'asset:/fictional.png', sourceKind: 'fictional' }),
      { idempotencyKey: newKey() },
    );
    expect(mocks.convert).toHaveBeenCalledWith('asset:/fictional.png');
    expect(paths()).toContain('/v1/generations');
  });

  it.each([
    ['empty', new Uint8Array(), 'SOURCE_EMPTY'],
    [
      'not an image despite a JPEG name',
      new TextEncoder().encode('<html>not an image</html>'),
      'SOURCE_MIME_UNSUPPORTED',
    ],
    ['larger than 15 MB', new Uint8Array(15 * 1024 * 1024 + 1), 'SOURCE_TOO_LARGE'],
  ])('rejects %s before an asset or project is created', async (_, bytes, code) => {
    fetchMock.mockResolvedValue(imageResponse(bytes as Uint8Array<ArrayBuffer>));
    await expect(
      startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() }),
    ).rejects.toMatchObject({ code });
    expect(paths()).toEqual(['/v1/generations/quote']);
  });

  it('rejects a declared over-limit response without reading its body', async () => {
    const response = imageResponse();
    response.headers.set('content-length', String(16 * 1024 * 1024));
    const getReader = vi.spyOn(response.body!, 'getReader');
    fetchMock.mockResolvedValue(response);
    await expect(
      startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() }),
    ).rejects.toMatchObject({ code: 'SOURCE_TOO_LARGE' });
    expect(getReader).not.toHaveBeenCalled();
  });

  it('does not disguise failed remote reads by invoking a native image conversion', async () => {
    fetchMock.mockResolvedValue(new Response('forbidden', { status: 403 }));
    await expect(
      startCreateGeneration(sourceFlow({ sourceUri: 'https://example.test/photo.jpg' }), {
        idempotencyKey: newKey(),
      }),
    ).rejects.toMatchObject({ code: 'SOURCE_UNREADABLE' });
    expect(mocks.convert).not.toHaveBeenCalled();
    expect(paths()).not.toContain('/v1/uploads/initiate');
  });

  it('does not create or queue a project when binary upload fails', async () => {
    const implementation = mocks.api.getMockImplementation()!;
    mocks.api.mockImplementation((path, init) =>
      path.endsWith('/content')
        ? Promise.reject(new Error('Network unavailable'))
        : implementation(path, init),
    );
    await expect(startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() })).rejects.toThrow(
      'Network unavailable',
    );
    expect(paths()).not.toContain('/v1/uploads/asset-1/complete');
    expect(paths()).not.toContain('/v1/projects');
    expect(paths()).not.toContain('/v1/generations');
  });

  it('can retry a failed PUT with the same submission key without queueing twice', async () => {
    const implementation = mocks.api.getMockImplementation()!;
    let putCalls = 0;
    mocks.api.mockImplementation((path, init) => {
      if (path.endsWith('/content') && ++putCalls === 1) throw new Error('Connection interrupted');
      return implementation(path, init);
    });
    const key = newKey();
    await expect(startCreateGeneration(sourceFlow(), { idempotencyKey: key })).rejects.toThrow(
      'Connection interrupted',
    );
    await startCreateGeneration(sourceFlow(), { idempotencyKey: key });
    expect(callsAt('/v1/uploads/asset-1/content')).toHaveLength(2);
    expect(callsAt('/v1/projects')).toHaveLength(1);
    expect(callsAt('/v1/generations')).toHaveLength(1);
  });

  it('stops before creating a project when the completed asset is not READY', async () => {
    const implementation = mocks.api.getMockImplementation()!;
    mocks.api.mockImplementation((path, init) =>
      path.endsWith('/complete')
        ? { asset: { id: 'asset-1', status: 'REJECTED' } }
        : implementation(path, init),
    );
    await expect(
      startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() }),
    ).rejects.toMatchObject({ code: 'UPLOAD_RESPONSE_INVALID' });
    expect(paths()).not.toContain('/v1/projects');
  });

  it('reports a HEIC decoder failure without uploading unsupported bytes', async () => {
    fetchMock.mockResolvedValue(imageResponse(heic));
    mocks.convert.mockRejectedValue(new Error('Decoder failed'));
    await expect(
      startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() }),
    ).rejects.toMatchObject({ code: 'SOURCE_MIME_UNSUPPORTED' });
    expect(paths()).not.toContain('/v1/uploads/initiate');
  });

  it('sends raw bytes and signed storage headers without attaching app credentials', async () => {
    const implementation = mocks.api.getMockImplementation()!;
    mocks.api.mockImplementation((path, init) =>
      path === '/v1/uploads/initiate'
        ? {
            assetId: 'asset-1',
            uploadUrl: 'https://storage.example.test/source?signature=not-secret',
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg', 'x-upload-token': 'signed-test' },
          }
        : implementation(path, init),
    );
    fetchMock
      .mockResolvedValueOnce(imageResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await startCreateGeneration(sourceFlow(), { idempotencyKey: newKey() });
    const put = fetchMock.mock.calls[1]![1]!;
    expect(put.body).toBeInstanceOf(ArrayBuffer);
    const headers = new Headers(put.headers);
    expect(headers.get('content-type')).toBe('image/jpeg');
    expect(headers.get('x-upload-token')).toBe('signed-test');
    expect(headers.has('authorization')).toBe(false);
  });

  it('replays the same generation payload and key after a lost response, without re-upload or a second reservation', async () => {
    const implementation = mocks.api.getMockImplementation()!;
    let generationCalls = 0;
    mocks.api.mockImplementation((path, init) => {
      if (path === '/v1/generations' && ++generationCalls === 1)
        throw new Error('Response lost after server accepted');
      return implementation(path, init);
    });
    const key = newKey();
    await expect(startCreateGeneration(sourceFlow(), { idempotencyKey: key })).rejects.toThrow(
      'Response lost',
    );
    const result = await startCreateGeneration(sourceFlow(), { idempotencyKey: key });
    expect(result.generation.generationId).toBe('generation-1');
    expect(callsAt('/v1/generations')).toHaveLength(2);
    expect(callsAt('/v1/generations')[0]![1]).toEqual(callsAt('/v1/generations')[1]![1]);
    expect(callsAt('/v1/generations')[1]![1].headers).toEqual({ 'Idempotency-Key': key });
    expect(callsAt('/v1/generations/quote')).toHaveLength(1);
    expect(callsAt('/v1/uploads/initiate')).toHaveLength(1);
    expect(callsAt('/v1/projects')).toHaveLength(1);
  });

  it('deduplicates simultaneous clicks and only reports queued after server acceptance', async () => {
    const key = newKey();
    const stages: SubmissionStage[] = [];
    const first = startCreateGeneration(sourceFlow(), {
      idempotencyKey: key,
      onProgress: (stage) => stages.push(stage),
    });
    const second = startCreateGeneration(sourceFlow(), { idempotencyKey: key });
    expect(stages).not.toContain('QUEUED');
    await Promise.all([first, second]);
    expect(callsAt('/v1/generations')).toHaveLength(1);
    expect(stages).toEqual(['CHECKING', 'READING', 'UPLOADING', 'CREATING', 'QUEUEING', 'QUEUED']);
    await expect(
      startCreateGeneration(sourceFlow({ filterIntensity: 25 }), { idempotencyKey: key }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_INVALID' });
  });
});
