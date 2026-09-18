import { apiRequest, captureSessionRequestScope } from '@/api/client';
import {
  createSubmissionKey,
  uploadSourceAsset,
  type GenerationQuote,
  type ServerProject,
  type ServerProjectMode,
  type StartedGeneration,
  type UploadedSourceAsset,
} from '@/features/create/server';
import type { StudioFlow } from './studioFlow';

export type StudioServerSelection =
  | {
      kind: 'PRODUCT_STUDIO';
      categoryId: string;
      sceneId: string;
    }
  | {
      kind: 'VIRTUAL_TRY_ON';
      sceneId: string;
    }
  | {
      kind: 'NAIL_PREVIEW';
      presetId: string;
    };

export type StudioSubmissionStage =
  | 'CHECKING'
  | 'READING_PRIMARY'
  | 'UPLOADING_PRIMARY'
  | 'READING_SECONDARY'
  | 'UPLOADING_SECONDARY'
  | 'CREATING'
  | 'QUEUEING'
  | 'QUEUED';

export const studioSubmissionLabels: Record<StudioSubmissionStage, string> = {
  CHECKING: 'Seçimler ve kredi kontrol ediliyor',
  READING_PRIMARY: 'Ana görsel hazırlanıyor',
  UPLOADING_PRIMARY: 'Ana görsel güvenle yükleniyor',
  READING_SECONDARY: 'Kıyafet görseli hazırlanıyor',
  UPLOADING_SECONDARY: 'Kıyafet görseli güvenle yükleniyor',
  CREATING: 'Stüdyo projesi hazırlanıyor',
  QUEUEING: 'Üretim başlatılıyor',
  QUEUED: 'Üretim sıraya alındı',
};

export type StudioQuote = GenerationQuote & {
  modelLane?: 'FAST' | 'PREMIUM';
};

export type StartedStudioGeneration = {
  selection: StudioServerSelection;
  quote: StudioQuote;
  primaryUpload: UploadedSourceAsset;
  secondaryUpload: UploadedSourceAsset | null;
  project: ServerProject;
  generation: StartedGeneration;
  idempotencyKey: string;
};

const modeMap: Record<StudioFlow['mode'], ServerProjectMode> = {
  product: 'PRODUCT_STUDIO',
  fashion: 'VIRTUAL_TRY_ON',
  nails: 'NAIL_PREVIEW',
};

function invalid(message: string): never {
  throw new Error(message);
}

export function resolveStudioSelection(flow: StudioFlow): StudioServerSelection {
  if (flow.userNotes.trim().length > 500) invalid('Ek not en fazla 500 karakter olabilir.');
  if (flow.mode === 'product') {
    if (!flow.categoryId) invalid('Önce ürün kategorisini seçmelisin.');
    if (!flow.sceneId) invalid('Önce ürün sahnesini seçmelisin.');
    return { kind: 'PRODUCT_STUDIO', categoryId: flow.categoryId, sceneId: flow.sceneId };
  }
  if (flow.mode === 'fashion') {
    if (!flow.sceneId) invalid('Önce kıyafet sahnesini seçmelisin.');
    return { kind: 'VIRTUAL_TRY_ON', sceneId: flow.sceneId };
  }
  if (!flow.presetId) invalid('Önce manikür görünümünü seçmelisin.');
  return { kind: 'NAIL_PREVIEW', presetId: flow.presetId };
}

function quotePayload(flow: StudioFlow, studio: StudioServerSelection) {
  return {
    mode: modeMap[flow.mode],
    quality: flow.quality,
    numberOfImages: 1,
    studio,
  };
}

export async function quoteStudioFlow(flow: StudioFlow): Promise<StudioQuote> {
  const studio = resolveStudioSelection(flow);
  return apiRequest<StudioQuote>('/v1/generations/quote', {
    method: 'POST',
    body: JSON.stringify(quotePayload(flow, studio)),
  });
}

type SubmissionAttempt = {
  fingerprint: string;
  quote?: StudioQuote;
  primaryUpload?: UploadedSourceAsset;
  secondaryUpload?: UploadedSourceAsset;
  project?: ServerProject;
  generationRequested?: boolean;
  result?: StartedStudioGeneration;
  pending?: Promise<StartedStudioGeneration>;
};

const attempts = new Map<string, SubmissionAttempt>();

export function clearStudioSubmissionAttempts(): void {
  attempts.clear();
}

export async function startStudioGeneration(
  flow: StudioFlow,
  options: {
    idempotencyKey?: string;
    onProgress?: (stage: StudioSubmissionStage) => void;
  } = {},
): Promise<StartedStudioGeneration> {
  if (!flow.primaryUri)
    invalid(
      flow.mode === 'nails' ? 'Önce el fotoğrafını seçmelisin.' : 'Önce ana görseli seçmelisin.',
    );
  if (flow.mode === 'fashion' && !flow.secondaryUri)
    invalid('Kıyafet denemesi için kıyafet fotoğrafını da seçmelisin.');
  if (!flow.rightsConfirmed)
    invalid('Devam etmek için yüklediğin görselleri kullanma hakkını onaylamalısın.');

  const requestScope = captureSessionRequestScope();
  const studio = resolveStudioSelection(flow);
  const mode = modeMap[flow.mode];
  const key = createSubmissionKey(options.idempotencyKey);
  const attemptKey = `${requestScope.revision}:${key}`;
  const fingerprint = JSON.stringify([
    flow.primaryUri,
    flow.primaryName,
    flow.secondaryUri,
    flow.secondaryName,
    mode,
    studio,
    flow.quality,
    flow.aspectRatio,
    flow.userNotes.trim(),
  ]);
  let attempt = attempts.get(attemptKey);
  if (attempt && attempt.fingerprint !== fingerprint)
    invalid('Seçimler değişti. Üretimi yeni işlem anahtarıyla tekrar başlat.');
  if (!attempt) {
    if (attempts.size >= 12) {
      const removable = [...attempts].find(([, item]) => !item.pending && item.result);
      if (removable) attempts.delete(removable[0]);
    }
    attempt = { fingerprint };
    attempts.set(attemptKey, attempt);
  }
  if (attempt.result) return attempt.result;
  if (attempt.pending) return attempt.pending;
  const current = attempt;

  const perform = async (): Promise<StartedStudioGeneration> => {
    requestScope.assertCurrent();
    options.onProgress?.('CHECKING');
    if (!current.generationRequested)
      current.quote = await apiRequest<StudioQuote>('/v1/generations/quote', {
        method: 'POST',
        body: JSON.stringify(quotePayload(flow, studio)),
      });
    requestScope.assertCurrent();
    if (!current.quote?.canGenerate) invalid('Bu üretim için yeterli kredin bulunmuyor.');

    current.primaryUpload ??= await uploadSourceAsset(
      { sourceUri: flow.primaryUri, sourceName: flow.primaryName },
      requestScope.assertCurrent,
      (stage) =>
        options.onProgress?.(stage === 'READING' ? 'READING_PRIMARY' : 'UPLOADING_PRIMARY'),
    );
    requestScope.assertCurrent();

    if (flow.mode === 'fashion' && flow.secondaryUri) {
      current.secondaryUpload ??= await uploadSourceAsset(
        { sourceUri: flow.secondaryUri, sourceName: flow.secondaryName },
        requestScope.assertCurrent,
        (stage) =>
          options.onProgress?.(stage === 'READING' ? 'READING_SECONDARY' : 'UPLOADING_SECONDARY'),
      );
      requestScope.assertCurrent();
    }

    options.onProgress?.('CREATING');
    if (!current.project) {
      const response = await apiRequest<{ project: ServerProject }>('/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title:
            flow.mode === 'product'
              ? 'Ürün çekimi'
              : flow.mode === 'fashion'
                ? 'Kıyafet deneme'
                : 'Tırnak önizleme',
          mode,
          sourceAssetId: current.primaryUpload.assetId,
          aspectRatio: flow.aspectRatio,
        }),
      });
      if (!response.project?.id) invalid('Stüdyo projesi oluşturulamadı. Lütfen tekrar dene.');
      current.project = response.project;
    }
    requestScope.assertCurrent();

    options.onProgress?.('QUEUEING');
    current.generationRequested = true;
    const generationEndpoint =
      flow.quality === 'PREVIEW' ? '/v1/generations/preview' : '/v1/generations';
    const generation = await apiRequest<StartedGeneration>(generationEndpoint, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        projectId: current.project.id,
        sourceAssetId: current.primaryUpload.assetId,
        ...(current.secondaryUpload
          ? { secondarySourceAssetId: current.secondaryUpload.assetId }
          : {}),
        mode,
        studio,
        composition: 'MEDIUM',
        aspectRatio: flow.aspectRatio,
        quality: flow.quality,
        numberOfImages: 1,
        preserveFace: flow.mode === 'fashion',
        preserveClothes: flow.mode === 'fashion' || flow.mode === 'product',
        ...(flow.userNotes.trim() ? { userNotes: flow.userNotes.trim() } : {}),
        disclosureAccepted: true,
      }),
    });
    requestScope.assertCurrent();
    if (!generation.generationId || generation.projectId !== current.project.id)
      invalid('Üretim yanıtı doğrulanamadı. Aynı işlemi yeniden deneyebilirsin.');

    const result: StartedStudioGeneration = {
      selection: studio,
      quote: current.quote!,
      primaryUpload: current.primaryUpload,
      secondaryUpload: current.secondaryUpload ?? null,
      project: current.project,
      generation,
      idempotencyKey: key,
    };
    current.result = result;
    options.onProgress?.('QUEUED');
    return result;
  };

  current.pending = perform();
  try {
    return await current.pending;
  } finally {
    current.pending = undefined;
  }
}
