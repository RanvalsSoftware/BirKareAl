import { tr as translateCopy } from '@/i18n/engine';
import { apiRequest, captureSessionRequestScope } from '@/api/client';
import {
  createSubmissionKey,
  uploadSourceAsset,
  type GenerationQuote,
  type ServerProject,
  type StartedGeneration,
  type UploadedSourceAsset,
} from '@/features/create/server';
import type { ProductStudioFlow } from './productFlow';

export type ProductStudioServerSelection = {
  kind: 'PRODUCT_STUDIO';
  categoryId: string;
  sceneId: string;
};

export type StudioSubmissionStage =
  'CHECKING' | 'READING_PRIMARY' | 'UPLOADING_PRIMARY' | 'CREATING' | 'QUEUEING' | 'QUEUED';

export const studioSubmissionLabels: Record<StudioSubmissionStage, string> = {
  get CHECKING() {
    return translateCopy('Seçimler ve kredi kontrol ediliyor');
  },
  get READING_PRIMARY() {
    return translateCopy('Ana görsel hazırlanıyor');
  },
  get UPLOADING_PRIMARY() {
    return translateCopy('Ana görsel güvenle yükleniyor');
  },
  get CREATING() {
    return translateCopy('Stüdyo projesi hazırlanıyor');
  },
  get QUEUEING() {
    return translateCopy('Üretim başlatılıyor');
  },
  get QUEUED() {
    return translateCopy('Üretim sıraya alındı');
  },
};

export type StudioQuote = GenerationQuote & {
  modelLane?: 'FAST' | 'PREMIUM';
};

export type StartedProductStudioGeneration = {
  selection: ProductStudioServerSelection;
  quote: StudioQuote;
  primaryUpload: UploadedSourceAsset;
  project: ServerProject;
  generation: StartedGeneration;
  idempotencyKey: string;
};

function invalid(message: string): never {
  throw new Error(message);
}

export function resolveProductStudioSelection(
  flow: ProductStudioFlow,
): ProductStudioServerSelection {
  if (flow.userNotes.trim().length > 500)
    invalid(translateCopy('Ek not en fazla 500 karakter olabilir.'));
  if (!flow.categoryId) invalid(translateCopy('Önce ürün kategorisini seçmelisin.'));
  if (!flow.sceneId) invalid(translateCopy('Önce ürün sahnesini seçmelisin.'));
  return { kind: 'PRODUCT_STUDIO', categoryId: flow.categoryId, sceneId: flow.sceneId };
}

function quotePayload(flow: ProductStudioFlow, studio: ProductStudioServerSelection) {
  return {
    mode: 'PRODUCT_STUDIO' as const,
    quality: flow.quality,
    numberOfImages: flow.numberOfImages,
    studio,
  };
}

export async function quoteProductStudioFlow(flow: ProductStudioFlow): Promise<StudioQuote> {
  const studio = resolveProductStudioSelection(flow);
  return apiRequest<StudioQuote>('/v1/generations/quote', {
    method: 'POST',
    body: JSON.stringify(quotePayload(flow, studio)),
  });
}

type SubmissionAttempt = {
  fingerprint: string;
  quote?: StudioQuote;
  primaryUpload?: UploadedSourceAsset;
  project?: ServerProject;
  generationRequested?: boolean;
  result?: StartedProductStudioGeneration;
  pending?: Promise<StartedProductStudioGeneration>;
};

const attempts = new Map<string, SubmissionAttempt>();

export function clearProductStudioSubmissionAttempts(): void {
  attempts.clear();
}

export async function startProductStudioGeneration(
  flow: ProductStudioFlow,
  options: {
    idempotencyKey?: string;
    onProgress?: (stage: StudioSubmissionStage) => void;
  } = {},
): Promise<StartedProductStudioGeneration> {
  if (!flow.primaryUri) invalid(translateCopy('Önce ana görseli seçmelisin.'));
  if (!flow.rightsConfirmed)
    invalid(
      translateCopy('Devam etmek için yüklediğin görselleri kullanma hakkını onaylamalısın.'),
    );
  if (!flow.productTitle.trim()) invalid(translateCopy('Ürün adını yaz.'));
  if (flow.productTitle.trim().length > 120)
    invalid(translateCopy('Ürün adı en fazla 120 karakter olabilir.'));
  if (flow.quality === 'PREVIEW' && flow.numberOfImages > 2)
    invalid(translateCopy('Önizleme üretiminde en fazla 2 alternatif seçebilirsin.'));

  const requestScope = captureSessionRequestScope();
  const studio = resolveProductStudioSelection(flow);
  const key = createSubmissionKey(options.idempotencyKey);
  const attemptKey = `${requestScope.revision}:${key}`;
  const fingerprint = JSON.stringify([
    flow.primaryUri,
    flow.primaryName,
    studio,
    flow.productTitle.trim(),
    flow.commerceGoal,
    flow.quality,
    flow.aspectRatio,
    flow.numberOfImages,
    flow.userNotes.trim(),
  ]);
  let attempt = attempts.get(attemptKey);
  if (attempt && attempt.fingerprint !== fingerprint)
    invalid(translateCopy('Seçimler değişti. Üretimi yeni işlem anahtarıyla tekrar başlat.'));
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

  const perform = async (): Promise<StartedProductStudioGeneration> => {
    requestScope.assertCurrent();
    options.onProgress?.('CHECKING');
    if (!current.generationRequested)
      current.quote = await apiRequest<StudioQuote>('/v1/generations/quote', {
        method: 'POST',
        body: JSON.stringify(quotePayload(flow, studio)),
      });
    requestScope.assertCurrent();
    if (!current.quote?.canGenerate)
      invalid(translateCopy('Bu üretim için yeterli kredin bulunmuyor.'));

    current.primaryUpload ??= await uploadSourceAsset(
      { sourceUri: flow.primaryUri, sourceName: flow.primaryName },
      requestScope.assertCurrent,
      (stage) =>
        options.onProgress?.(stage === 'READING' ? 'READING_PRIMARY' : 'UPLOADING_PRIMARY'),
    );
    requestScope.assertCurrent();

    options.onProgress?.('CREATING');
    if (!current.project) {
      const response = await apiRequest<{ project: ServerProject }>('/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: flow.productTitle.trim(),
          mode: 'PRODUCT_STUDIO',
          sourceAssetId: current.primaryUpload.assetId,
          aspectRatio: flow.aspectRatio,
        }),
      });
      if (!response.project?.id)
        invalid(translateCopy('Stüdyo projesi oluşturulamadı. Lütfen tekrar dene.'));
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
        mode: 'PRODUCT_STUDIO',
        studio,
        composition: 'MEDIUM',
        aspectRatio: flow.aspectRatio,
        quality: flow.quality,
        numberOfImages: flow.numberOfImages,
        preserveFace: false,
        preserveClothes: true,
        ...(flow.userNotes.trim() ? { userNotes: flow.userNotes.trim() } : {}),
        disclosureAccepted: true,
      }),
    });
    requestScope.assertCurrent();
    if (!generation.generationId || generation.projectId !== current.project.id)
      invalid(translateCopy('Üretim yanıtı doğrulanamadı. Aynı işlemi yeniden deneyebilirsin.'));

    const result: StartedProductStudioGeneration = {
      selection: studio,
      quote: current.quote,
      primaryUpload: current.primaryUpload,
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
