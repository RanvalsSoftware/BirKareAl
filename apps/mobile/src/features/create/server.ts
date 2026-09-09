import { apiBaseUrl, apiRequest, captureSessionRequestScope } from '@/api/client';
import { sourceImageAsJpeg } from './source-image-normalizer';
import type { BeautySettings, GenderTransformation } from '@/features/beauty/settings';
import { getTrendPreset, type TrendPresetId } from '../trends/presets';

import type {
  AspectRatio,
  Composition,
  CreateFlow,
  CreateMode,
  GenerationQuality,
} from './createFlow';

/** Mirrors the API contract; the server remains the authoritative 15 MB guard. */
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
const SOURCE_READ_TIMEOUT_MS = 30_000;

type ServerProjectMode =
  'BACKGROUND_REPLACE' | 'FULL_SCENE' | 'FAN_MOMENT' | 'AI_FILTER' | 'PRO_PORTRAIT';
type ServerGenerationQuality = 'PREVIEW' | 'STANDARD' | 'HD';
type ServerComposition = 'SELFIE' | 'CLOSE' | 'MEDIUM' | 'WIDE';

type ServerAsset = {
  id: string;
  status: string;
  mimeType: string;
  sizeBytes: number;
  originalName?: string;
};

export type ServerProject = {
  id: string;
  title: string | null;
  mode: ServerProjectMode;
  status: string;
  sourceAssetId: string | null;
  sceneTemplateId: string | null;
  stylePresetId: string | null;
  featuredPersonId: string | null;
  composition: ServerComposition | null;
  aspectRatio: AspectRatio;
};

export type GenerationQuote = {
  creditCost: number;
  breakdown: { label: string; credits: number }[];
  availableCredits: number;
  canGenerate: boolean;
};

export type CreateFlowServerSelection = {
  beauty?: BeautySettings;
  transformation?: GenderTransformation;
  trendPreset?: TrendPresetId;
  title: string;
  mode: ServerProjectMode;
  quality: ServerGenerationQuality;
  composition: ServerComposition;
  aspectRatio: AspectRatio;
  numberOfImages: number;
  filterIntensity: number;
  sceneTemplateId: string | null;
  stylePresetId: string | null;
  featuredPersonId: string | null;
  preserveFace: boolean;
  preserveClothes: boolean;
  customInstruction?: string;
};

export type QuoteCreateFlowResult = {
  selection: CreateFlowServerSelection;
  quote: GenerationQuote;
};

export type UploadedSourceAsset = {
  assetId: string;
  asset: ServerAsset;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
};

export type StartedGeneration = {
  generationId: string;
  projectId: string;
  status: string;
  creditReservationId: string;
  reservedCredits: number;
  estimatedQueueSeconds: number;
  statusUrl: string;
};

export type StartCreateGenerationResult = {
  selection: CreateFlowServerSelection;
  upload: UploadedSourceAsset;
  project: ServerProject;
  quote: GenerationQuote;
  generation: StartedGeneration;
  idempotencyKey: string;
};

export type StartCreateGenerationOptions = {
  /** Reuse this key only when retrying the same completed flow submission. */
  idempotencyKey?: string;
  onProgress?: (stage: SubmissionStage) => void;
};

export type SubmissionStage =
  'CHECKING' | 'READING' | 'UPLOADING' | 'CREATING' | 'QUEUEING' | 'QUEUED';

export const submissionStageLabels: Record<SubmissionStage, string> = {
  CHECKING: 'Kredi ve seçimler kontrol ediliyor',
  READING: 'Fotoğraf hazırlanıyor',
  UPLOADING: 'Fotoğraf güvenle yükleniyor',
  CREATING: 'Projen hazırlanıyor',
  QUEUEING: 'Üretim başlatılıyor',
  QUEUED: 'Üretim sıraya alındı',
};

export type CreateFlowServerErrorCode =
  | 'SOURCE_REQUIRED'
  | 'SOURCE_RIGHTS_REQUIRED'
  | 'SOURCE_UNREADABLE'
  | 'SOURCE_EMPTY'
  | 'SOURCE_TOO_LARGE'
  | 'SOURCE_MIME_UNSUPPORTED'
  | 'UPLOAD_RESPONSE_INVALID'
  | 'UPLOAD_URL_INVALID'
  | 'UPLOAD_FAILED'
  | 'FLOW_INVALID'
  | 'IDEMPOTENCY_KEY_INVALID'
  | 'INSUFFICIENT_CREDITS';

/** A display-safe client error. It deliberately never includes a local URI or signed URL. */
export class CreateFlowServerError extends Error {
  readonly code: CreateFlowServerErrorCode;

  constructor(code: CreateFlowServerErrorCode, message: string) {
    super(message);
    this.name = 'CreateFlowServerError';
    this.code = code;
  }
}

const SERVER_IDS = {
  scene: {
    stadium: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d101',
    award: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d102',
    redCarpet: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d103',
    city: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d105',
    cosmic: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d106',
    waterfront: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d107',
    coastal: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d108',
    studio: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d109',
    neon: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d110',
    alpine: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d111',
  },
  style: {
    drip: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    pop: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
    hdr: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d103',
    bokeh: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d104',
    cinematic: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d105',
    vintage: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d106',
    blackWhite: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d107',
    cyberpunk: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d108',
    watercolor: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d109',
    sketch: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d110',
    cartoon: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d111',
    natural: 'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    studio: 'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
  },
  person: {
    sport: 'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    culture: 'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
  },
} as const;

const LOCAL_SCENE_TO_SERVER: Record<string, string> = {
  'scene-stadium-lights': SERVER_IDS.scene.stadium,
  'scene-award-night': SERVER_IDS.scene.award,
  'scene-city-glow': SERVER_IDS.scene.waterfront,
  'scene-coastal-day': SERVER_IDS.scene.coastal,
  'scene-studio-ink': SERVER_IDS.scene.studio,
  'scene-neon-future': SERVER_IDS.scene.neon,
  'scene-alpine-lake': SERVER_IDS.scene.alpine,
  'scene-sunset-terrace': SERVER_IDS.scene.city,
};

const LOCAL_STYLE_TO_SERVER: Record<string, string> = {
  'filter-drift': SERVER_IDS.style.drip,
  'filter-pop': SERVER_IDS.style.pop,
  'filter-hdr': SERVER_IDS.style.hdr,
  'filter-bokeh': SERVER_IDS.style.bokeh,
  'filter-natural': SERVER_IDS.style.natural,
  'filter-cinematic': SERVER_IDS.style.cinematic,
  'filter-vintage': SERVER_IDS.style.vintage,
  'filter-mono': SERVER_IDS.style.blackWhite,
  'filter-studio': SERVER_IDS.style.studio,
  'filter-cyberpunk': SERVER_IDS.style.cyberpunk,
  'filter-watercolor': SERVER_IDS.style.watercolor,
  'filter-sketch': SERVER_IDS.style.sketch,
  'filter-cartoon': SERVER_IDS.style.cartoon,
};

const LOCAL_PERSON_TO_SERVER: Record<string, string> = {
  'persona-aras': SERVER_IDS.person.sport,
  'persona-nova': SERVER_IDS.person.culture,
  'persona-kaya': SERVER_IDS.person.culture,
  'persona-luma': SERVER_IDS.person.culture,
  'persona-ela': SERVER_IDS.person.culture,
};

const SERVER_SCENE_IDS = new Set(Object.values(SERVER_IDS.scene));
const SERVER_STYLE_IDS = new Set(Object.values(SERVER_IDS.style));
const SERVER_PERSON_IDS = new Set(Object.values(SERVER_IDS.person));

const MODE_MAP: Record<CreateMode, ServerProjectMode> = {
  scene: 'FULL_SCENE',
  character: 'FAN_MOMENT',
  filter: 'AI_FILTER',
  portrait: 'PRO_PORTRAIT',
  background: 'BACKGROUND_REPLACE',
};

const QUALITY_MAP: Record<GenerationQuality, ServerGenerationQuality> = {
  Önizleme: 'PREVIEW',
  Standart: 'STANDARD',
  HD: 'HD',
};

const COMPOSITION_MAP: Record<Composition, ServerComposition> = {
  Selfie: 'SELFIE',
  Yakın: 'CLOSE',
  Orta: 'MEDIUM',
  Uzak: 'WIDE',
};

const TITLE_BY_MODE: Record<CreateMode, string> = {
  scene: 'Yeni sahne',
  character: 'Kurgusal karakter sahnesi',
  filter: 'AI filtre',
  portrait: 'Profesyonel portre',
  background: 'Arka plan değiştir',
};

function flowError(code: CreateFlowServerErrorCode, message: string): never {
  throw new CreateFlowServerError(code, message);
}

function mappedCatalogId(
  localId: string | null,
  localMappings: Record<string, string>,
  allowedIds: ReadonlySet<string>,
  fallback: string | null,
): string | null {
  if (!localId) return fallback;
  if (allowedIds.has(localId)) return localId;
  return Object.hasOwn(localMappings, localId) ? localMappings[localId] : fallback;
}

function assertFlowIsValid(flow: CreateFlow) {
  if (
    flow.trendPreset &&
    (!getTrendPreset(flow.trendPreset) ||
      flow.mode !== 'filter' ||
      flow.beauty ||
      flow.transformation ||
      !flow.preserveFace ||
      flow.preserveClothes ||
      flow.sourceKind === 'fictional' ||
      flow.sourceCharacterId ||
      flow.styleId !== 'filter-natural' ||
      flow.sceneId ||
      flow.personId)
  ) {
    flowError('FLOW_INVALID', 'Akımlar için kendi fotoğrafını ve geçerli bir akım seçmelisin.');
  }
  if (
    !Number.isInteger(flow.numberOfImages) ||
    flow.numberOfImages < 1 ||
    flow.numberOfImages > 4
  ) {
    flowError('FLOW_INVALID', 'Görsel sayısı 1 ile 4 arasında olmalıdır.');
  }
  if (flow.customInstruction.trim().length > 1000) {
    flowError('FLOW_INVALID', 'Özel talimat en fazla 1000 karakter olabilir.');
  }
  if (
    !Number.isInteger(flow.filterIntensity) ||
    flow.filterIntensity < 0 ||
    flow.filterIntensity > 100
  ) {
    flowError('FLOW_INVALID', 'Filtre yoğunluğu 0 ile 100 arasında tam sayı olmalıdır.');
  }
}

/**
 * Converts the locally curated Turkish UI values to the API values. Unknown or
 * stale local catalog IDs never reach the API: each has a supported fallback.
 */
export function resolveCreateFlow(flow: CreateFlow): CreateFlowServerSelection {
  assertFlowIsValid(flow);

  const mode =
    flow.mode === 'character' && (flow.sourceKind === 'fictional' || flow.sourceCharacterId)
      ? 'FULL_SCENE'
      : MODE_MAP[flow.mode];
  const quality = QUALITY_MAP[flow.quality];
  const composition = COMPOSITION_MAP[flow.composition];
  if (!mode || !quality || !composition) {
    flowError('FLOW_INVALID', 'Seçili üretim ayarları desteklenmiyor.');
  }

  const selectedScene = mappedCatalogId(
    flow.sceneId,
    LOCAL_SCENE_TO_SERVER,
    SERVER_SCENE_IDS,
    null,
  );
  const selectedStyle = mappedCatalogId(
    flow.styleId,
    LOCAL_STYLE_TO_SERVER,
    SERVER_STYLE_IDS,
    null,
  );
  const selectedPerson = mappedCatalogId(
    flow.personId,
    LOCAL_PERSON_TO_SERVER,
    SERVER_PERSON_IDS,
    null,
  );

  let sceneTemplateId = selectedScene;
  let stylePresetId = selectedStyle;
  let featuredPersonId = selectedPerson;

  if (mode === 'FULL_SCENE') {
    sceneTemplateId ??= SERVER_IDS.scene.stadium;
    // A scene transforms the primary source; legacy companion picks must not leak into it.
    featuredPersonId = null;
  }
  if (mode === 'FAN_MOMENT') {
    sceneTemplateId ??= SERVER_IDS.scene.stadium;
    featuredPersonId ??= SERVER_IDS.person.sport;
  }
  if (mode === 'AI_FILTER') {
    sceneTemplateId = null;
    featuredPersonId = null;
    stylePresetId ??= SERVER_IDS.style.natural;
  }
  if (mode === 'PRO_PORTRAIT') {
    sceneTemplateId = null;
    featuredPersonId = null;
    // A professional portrait defaults to studio lighting, but an explicitly
    // selected filter (for example black-white or warm studio) must survive.
    stylePresetId ??= SERVER_IDS.style.studio;
  }
  if (mode === 'BACKGROUND_REPLACE') {
    // A selected filter can accompany a background replacement. Keep it so
    // the worker applies both the requested setting and visual treatment.
    featuredPersonId = null;
  }

  const customInstruction = flow.customInstruction.trim();
  return {
    title: flow.beauty
      ? 'Güzellik Stüdyosu'
      : flow.transformation
        ? 'Cinsiyet değiştirme'
        : flow.trendPreset
          ? getTrendPreset(flow.trendPreset)!.name
          : TITLE_BY_MODE[flow.mode],
    mode,
    quality,
    composition,
    aspectRatio: flow.aspectRatio,
    numberOfImages: flow.numberOfImages,
    filterIntensity: flow.filterIntensity,
    sceneTemplateId,
    stylePresetId,
    featuredPersonId,
    preserveFace: flow.preserveFace,
    preserveClothes: flow.preserveClothes,
    ...(flow.beauty ? { beauty: flow.beauty } : {}),
    ...(flow.transformation ? { transformation: flow.transformation } : {}),
    ...(flow.trendPreset ? { trendPreset: flow.trendPreset } : {}),
    ...(customInstruction ? { customInstruction } : {}),
  };
}

function quotePayload(selection: CreateFlowServerSelection) {
  return {
    mode: selection.mode,
    quality: selection.quality,
    numberOfImages: selection.numberOfImages,
    sceneTemplateId: selection.sceneTemplateId,
    featuredPersonId: selection.featuredPersonId,
    stylePresetId: selection.stylePresetId,
    ...(selection.beauty ? { beauty: selection.beauty } : {}),
    ...(selection.transformation ? { transformation: selection.transformation } : {}),
    ...(selection.trendPreset ? { trendPreset: selection.trendPreset } : {}),
  };
}

async function quoteResolvedCreateFlow(
  selection: CreateFlowServerSelection,
): Promise<GenerationQuote> {
  return apiRequest<GenerationQuote>('/v1/generations/quote', {
    method: 'POST',
    body: JSON.stringify(quotePayload(selection)),
  });
}

/** Gets the current credit quote without uploading the source image. */
export async function quoteCreateFlow(flow: CreateFlow): Promise<QuoteCreateFlowResult> {
  const selection = resolveCreateFlow(flow);
  return { selection, quote: await quoteResolvedCreateFlow(selection) };
}

type SourceMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** File names and local fetch MIME headers are unreliable, especially after iOS converts HEIC. */
function imageMimeFromBytes(buffer: ArrayBuffer): SourceMimeType | 'image/heic' | null {
  const bytes = new Uint8Array(buffer);
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  )
    return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (ascii(4, 4) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii(8, 40)))
    return 'image/heic';
  return null;
}

function assertSourceSize(size: number) {
  if (!size)
    flowError('SOURCE_EMPTY', 'Seçili fotoğraf boş görünüyor. Lütfen başka bir fotoğraf seç.');
  if (size > MAX_SOURCE_IMAGE_BYTES)
    flowError('SOURCE_TOO_LARGE', 'Fotoğraf en fazla 15 MB olabilir. Daha küçük bir dosya seç.');
}

async function sourceBytes(uri: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_READ_TIMEOUT_MS);
  try {
    const response = await fetch(uri, { signal: controller.signal });
    if (!response.ok && response.status !== 0) throw new Error('SOURCE_RESPONSE_FAILED');
    const declaredSize = Number(response.headers.get('content-length'));
    if (declaredSize > MAX_SOURCE_IMAGE_BYTES) {
      controller.abort();
      assertSourceSize(declaredSize);
    }
    // Never round-trip bytes through RN Blob/FileReader. SDK 57 replaces a
    // request's explicit content-type with Blob.type (often empty for file://).
    // ArrayBuffer preserves our verified MIME and works with both RN and Expo fetch.
    const reader = response.body?.getReader?.();
    if (!reader) {
      const buffer = await response.arrayBuffer();
      assertSourceSize(buffer.byteLength);
      return buffer;
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_SOURCE_IMAGE_BYTES) {
          controller.abort();
          void reader.cancel().catch(() => undefined);
          assertSourceSize(size);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    assertSourceSize(size);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  } catch (error) {
    if (error instanceof CreateFlowServerError) throw error;
    flowError('SOURCE_UNREADABLE', 'Seçili fotoğraf okunamadı. Lütfen fotoğrafı yeniden seç.');
  } finally {
    clearTimeout(timeout);
  }
}

function extensionForMimeType(mimeType: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function safeFileName(
  sourceName: string | null,
  sourceUri: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): string {
  const uriName = sourceUri.split(/[?#]/, 1)[0]?.split('/').pop();
  const rawName = sourceName?.trim() || uriName || 'kaynak-gorsel';
  const stem = rawName
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 170);
  const extension = extensionForMimeType(mimeType);
  return `${stem || 'kaynak-gorsel'}.${extension}`;
}

async function readSourceImage(flow: CreateFlow): Promise<{
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}> {
  if (!flow.sourceUri) {
    flowError('SOURCE_REQUIRED', 'Önce bir kaynak fotoğraf seçmelisin.');
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await sourceBytes(flow.sourceUri);
  } catch (error) {
    // Android bundled assets / content URIs may be renderable but not fetchable.
    // Decode to an app-cache copy only for these local sources, never a failed remote URL.
    if (
      !(error instanceof CreateFlowServerError) ||
      error.code !== 'SOURCE_UNREADABLE' ||
      !/^(file|content|ph|assets-library|asset):/i.test(flow.sourceUri)
    )
      throw error;
    try {
      bytes = await sourceBytes(await sourceImageAsJpeg(flow.sourceUri));
    } catch {
      throw error;
    }
  }
  let mimeType = imageMimeFromBytes(bytes);
  if (mimeType === 'image/heic') {
    try {
      bytes = await sourceBytes(await sourceImageAsJpeg(flow.sourceUri));
    } catch (error) {
      if (error instanceof CreateFlowServerError) throw error;
      flowError(
        'SOURCE_MIME_UNSUPPORTED',
        'HEIC fotoğraf dönüştürülemedi. JPEG veya PNG olarak yeniden seç.',
      );
    }
    mimeType = imageMimeFromBytes(bytes);
  }
  if (!mimeType || mimeType === 'image/heic')
    flowError(
      'SOURCE_MIME_UNSUPPORTED',
      'Fotoğraf dosyası doğrulanamadı. JPEG, PNG, WebP veya HEIC bir fotoğraf seç.',
    );
  return { bytes, mimeType, fileName: safeFileName(flow.sourceName, flow.sourceUri, mimeType) };
}

type InitiatedUpload = {
  assetId: string;
  uploadUrl: string;
  method?: string;
  headers?: Record<string, string>;
};

function uploadTarget(uploadUrl: string): {
  isApiUpload: boolean;
  path?: string;
  absoluteUrl?: string;
} {
  let target: URL;
  let api: URL;
  try {
    target = new URL(uploadUrl, apiBaseUrl);
    api = new URL(apiBaseUrl);
  } catch {
    flowError('UPLOAD_URL_INVALID', 'Yükleme bağlantısı doğrulanamadı. Lütfen tekrar dene.');
  }
  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
    flowError('UPLOAD_URL_INVALID', 'Yükleme bağlantısı doğrulanamadı. Lütfen tekrar dene.');
  }

  if (target.origin === api.origin) {
    if (!target.pathname.startsWith('/v1/uploads/')) {
      flowError('UPLOAD_URL_INVALID', 'Yükleme bağlantısı doğrulanamadı. Lütfen tekrar dene.');
    }
    return { isApiUpload: true, path: `${target.pathname}${target.search}` };
  }
  return { isApiUpload: false, absoluteUrl: target.toString() };
}

async function putSourceImage(input: {
  initiated: InitiatedUpload;
  bytes: ArrayBuffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}) {
  const method = input.initiated.method?.toUpperCase() ?? 'PUT';
  if (!input.initiated.assetId || !input.initiated.uploadUrl || method !== 'PUT') {
    flowError('UPLOAD_RESPONSE_INVALID', 'Yükleme başlatılamadı. Lütfen tekrar dene.');
  }

  const target = uploadTarget(input.initiated.uploadUrl);
  if (target.isApiUpload && target.path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const result = await apiRequest<{ assetId: string; uploaded: boolean }>(target.path, {
        method: 'PUT',
        headers: { 'content-type': input.mimeType },
        body: input.bytes,
        signal: controller.signal,
      });
      if (!result.uploaded || result.assetId !== input.initiated.assetId) {
        flowError(
          'UPLOAD_RESPONSE_INVALID',
          'Fotoğraf yüklemesi doğrulanamadı. Lütfen tekrar dene.',
        );
      }
    } finally {
      clearTimeout(timeout);
    }
    return;
  }

  const headers = new Headers(input.initiated.headers ?? {});
  const signedMime = headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (signedMime && signedMime !== input.mimeType) {
    flowError('UPLOAD_RESPONSE_INVALID', 'Yükleme türü doğrulanamadı. Lütfen tekrar dene.');
  }
  headers.set('content-type', input.mimeType);
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    response = await fetch(target.absoluteUrl!, {
      method: 'PUT',
      headers,
      body: input.bytes,
      signal: controller.signal,
    });
  } catch {
    flowError('UPLOAD_FAILED', 'Fotoğraf yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    flowError('UPLOAD_FAILED', 'Fotoğraf yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  }
}

async function uploadSourceAsset(
  flow: CreateFlow,
  assertCurrentSession: () => void,
  onProgress?: StartCreateGenerationOptions['onProgress'],
): Promise<UploadedSourceAsset> {
  assertCurrentSession();
  onProgress?.('READING');
  const source = await readSourceImage(flow);
  // A local file read can outlive logout. Never send that previous account's
  // image with the next account's newly installed bearer token.
  assertCurrentSession();
  onProgress?.('UPLOADING');
  assertCurrentSession();
  const initiated = await apiRequest<InitiatedUpload>('/v1/uploads/initiate', {
    method: 'POST',
    body: JSON.stringify({
      fileName: source.fileName,
      mimeType: source.mimeType,
      sizeBytes: source.bytes.byteLength,
      purpose: 'USER_SOURCE',
    }),
  });

  assertCurrentSession();
  await putSourceImage({ initiated, bytes: source.bytes, mimeType: source.mimeType });
  assertCurrentSession();
  const completed = await apiRequest<{ asset: ServerAsset }>(
    `/v1/uploads/${encodeURIComponent(initiated.assetId)}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  assertCurrentSession();
  if (completed.asset?.id !== initiated.assetId || completed.asset.status !== 'READY') {
    flowError('UPLOAD_RESPONSE_INVALID', 'Fotoğraf yüklemesi doğrulanamadı. Lütfen tekrar dene.');
  }

  return {
    assetId: initiated.assetId,
    asset: completed.asset,
    mimeType: source.mimeType,
    sizeBytes: source.bytes.byteLength,
  };
}

export function createSubmissionKey(value?: string): string {
  if (value) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
      flowError('IDEMPOTENCY_KEY_INVALID', 'Üretim anahtarı geçersiz. Lütfen tekrar dene.');
    }
    return value;
  }
  // This is an idempotency correlation value, not an authentication secret.
  return `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

type SubmissionAttempt = {
  fingerprint: string;
  quote?: GenerationQuote;
  upload?: UploadedSourceAsset;
  project?: ServerProject;
  generationRequested?: boolean;
  result?: StartCreateGenerationResult;
  pending?: Promise<StartCreateGenerationResult>;
};

// Only this session's opaque attempt keys and completed checkpoints are retained;
// image bytes, authentication credentials, and URLs are not persisted.
const submissionAttempts = new Map<string, SubmissionAttempt>();

/** Called when leaving an authenticated account, never on first sign-in. */
export function clearSubmissionAttempts(): void {
  submissionAttempts.clear();
}

/**
 * Uploads the local source, creates its project, fetches the authoritative
 * credit quote, then queues one idempotent generation request.
 */
export async function startCreateGeneration(
  flow: CreateFlow,
  options: StartCreateGenerationOptions = {},
): Promise<StartCreateGenerationResult> {
  const requestScope = captureSessionRequestScope();
  if (!flow.sourceUri) {
    flowError('SOURCE_REQUIRED', 'Önce bir kaynak fotoğraf seçmelisin.');
  }
  if (!flow.sourceRightsConfirmed) {
    flowError(
      'SOURCE_RIGHTS_REQUIRED',
      'Devam etmek için fotoğrafı kullanma hakkına sahip olduğunu onaylamalısın.',
    );
  }

  const selection = resolveCreateFlow(flow);
  const key = createSubmissionKey(options.idempotencyKey);
  const attemptKey = `${requestScope.revision}:${key}`;
  const fingerprint = JSON.stringify([flow.sourceUri, flow.sourceName, selection]);
  let attempt = submissionAttempts.get(attemptKey);
  if (attempt && attempt.fingerprint !== fingerprint) {
    flowError(
      'IDEMPOTENCY_KEY_INVALID',
      'Seçimler değişti. Üretim için yeni bir işlem anahtarı gerekli.',
    );
  }
  if (!attempt) {
    // Keep recent safe checkpoints; never evict an ambiguous queue response.
    if (submissionAttempts.size >= 20) {
      const oldest = [...submissionAttempts].find(
        ([, value]) => !value.pending && (!value.generationRequested || value.result),
      );
      if (oldest) submissionAttempts.delete(oldest[0]);
    }
    attempt = { fingerprint };
    submissionAttempts.set(attemptKey, attempt);
  }
  if (attempt.result) return attempt.result;
  if (attempt.pending) return attempt.pending;
  const currentAttempt = attempt;
  const perform = async (): Promise<StartCreateGenerationResult> => {
    requestScope.assertCurrent();
    options.onProgress?.('CHECKING');
    requestScope.assertCurrent();
    // Quote before any upload/project write. The API still rechecks available
    // credits when reserving, so a concurrent spend cannot bypass this guard.
    // A lost queue response may have already reserved credits. Replay its exact
    // idempotent POST, even when a new quote would now say insufficient credits.
    if (!currentAttempt.generationRequested)
      currentAttempt.quote = await quoteResolvedCreateFlow(selection);
    requestScope.assertCurrent();
    const quote = currentAttempt.quote!;
    if (!quote?.canGenerate) {
      flowError('INSUFFICIENT_CREDITS', 'Bu üretim için yeterli kredin bulunmuyor.');
    }
    currentAttempt.upload ??= await uploadSourceAsset(
      flow,
      requestScope.assertCurrent,
      options.onProgress,
    );
    requestScope.assertCurrent();
    const upload = currentAttempt.upload;
    options.onProgress?.('CREATING');
    requestScope.assertCurrent();
    if (!currentAttempt.project) {
      const projectResponse = await apiRequest<{ project: ServerProject }>('/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: selection.title,
          mode: selection.mode,
          sourceAssetId: upload.assetId,
          sceneTemplateId: selection.sceneTemplateId,
          stylePresetId: selection.stylePresetId,
          featuredPersonId: selection.featuredPersonId,
          composition: selection.composition,
          aspectRatio: selection.aspectRatio,
        }),
      });
      requestScope.assertCurrent();
      if (!projectResponse.project?.id) {
        flowError('FLOW_INVALID', 'Proje oluşturma yanıtı doğrulanamadı. Lütfen tekrar dene.');
      }
      currentAttempt.project = projectResponse.project;
    }
    options.onProgress?.('QUEUEING');
    requestScope.assertCurrent();
    currentAttempt.generationRequested = true;
    const generation = await apiRequest<StartedGeneration>('/v1/generations', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        projectId: currentAttempt.project.id,
        sourceAssetId: upload.assetId,
        mode: selection.mode,
        sceneTemplateId: selection.sceneTemplateId,
        featuredPersonId: selection.featuredPersonId,
        stylePresetId: selection.stylePresetId,
        composition: selection.composition,
        filterIntensity: selection.filterIntensity,
        aspectRatio: selection.aspectRatio,
        quality: selection.quality,
        numberOfImages: selection.numberOfImages,
        preserveFace: selection.preserveFace,
        preserveClothes: selection.preserveClothes,
        ...(selection.beauty ? { beauty: selection.beauty } : {}),
        ...(selection.transformation ? { transformation: selection.transformation } : {}),
        ...(selection.trendPreset ? { trendPreset: selection.trendPreset } : {}),
        ...(selection.customInstruction ? { customInstruction: selection.customInstruction } : {}),
        // The review step presents the AI-content disclosure before this helper is called.
        disclosureAccepted: true,
      }),
    });
    requestScope.assertCurrent();
    if (!generation.generationId || generation.projectId !== currentAttempt.project.id) {
      flowError('FLOW_INVALID', 'Üretim yanıtı doğrulanamadı. Aynı işlemi yeniden deneyebilirsin.');
    }

    const result = {
      selection,
      upload,
      project: currentAttempt.project,
      quote,
      generation,
      idempotencyKey: key,
    };
    currentAttempt.result = result;
    options.onProgress?.('QUEUED');
    return result;
  };
  currentAttempt.pending = perform();
  try {
    return await currentAttempt.pending;
  } finally {
    currentAttempt.pending = undefined;
  }
}
