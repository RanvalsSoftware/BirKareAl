import { Router } from 'express';
import { assertBeautyAccess, assertBeautySource, assertBeautyStyle } from './beauty-selection.js';
import { assertTrendSelection, assertTrendSource } from './trend-selection.js';
import { accountIdempotencyKey, findAccountIdempotency } from './idempotency.js';
import {
  CancelGenerationSchema,
  CreateGenerationSchema,
  CreatePreviewGenerationSchema,
  GenerationMessageSchema,
  GenerationParamsSchema,
  GenerationRevisionSchema,
  QuoteGenerationSchema,
  SelectOutputSchema,
} from '@birkare/contracts';
import { buildStudioPrompt, getStudioSelection, type ResolvedStudioPlan } from '@birkare/ai';
import {
  badRequest,
  calculateCreditQuote,
  calculateStudioCreditQuote,
  conflict,
  createId,
  forbidden,
  hashStable,
  notFound,
  premiumBeautySelections,
  unavailable,
} from '@birkare/shared';
import type {
  AssetRecord,
  GenerationInputRole,
  GenerationRecipe,
  GenerationRecord,
  LegacyGenerationRecipe,
  ProjectRecord,
  StudioGenerationRecipe,
} from '@birkare/database';
import type { CatalogFeaturedPerson } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { generationRateLimit } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';
import { assertProGenerationAccess } from '../billing/pro-access.js';

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const getIdempotencyKey = (value: string | undefined): string => {
  if (!value || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw badRequest(
      'IDEMPOTENCY_KEY_REQUIRED',
      'Bu işlem için geçerli bir Idempotency-Key başlığı gereklidir.',
    );
  }
  return value;
};

async function ownedGeneration(
  deps: ApiDependencies,
  userId: string,
  generationId: string,
): Promise<GenerationRecord> {
  const generation = await deps.repository.getGenerationById(generationId);
  if (!generation || generation.deletedAt)
    throw notFound('GENERATION_NOT_FOUND', 'Üretim bulunamadı.');
  if (generation.userId !== userId)
    throw forbidden('GENERATION_NOT_OWNED', 'Bu üretime erişim yetkiniz yok.');
  return generation;
}

async function ownedProject(
  deps: ApiDependencies,
  userId: string,
  projectId: string,
): Promise<ProjectRecord> {
  const project = await deps.repository.getProjectById(projectId);
  if (!project || project.deletedAt) throw notFound('PROJECT_NOT_FOUND', 'Proje bulunamadı.');
  if (project.userId !== userId)
    throw forbidden('PROJECT_NOT_OWNED', 'Bu projeye erişim yetkiniz yok.');
  return project;
}

function assertReadyStudioSource(
  asset: AssetRecord | null,
  userId: string,
): asserts asset is AssetRecord {
  if (
    !asset ||
    asset.ownerId !== userId ||
    asset.status !== 'READY' ||
    asset.deletedAt ||
    asset.type !== 'USER_SOURCE'
  ) {
    throw forbidden('GENERATION_SOURCE_INVALID', 'Kaynak görseliniz üretim için hazır değil.');
  }
}

async function studioGenerationInputs(
  deps: ApiDependencies,
  input: {
    userId: string;
    project: ProjectRecord;
    mode: ProjectRecord['mode'];
    sourceAssetId: string;
    secondarySourceAssetId?: string;
  },
): Promise<{
  source: AssetRecord;
  inputs: Array<{ assetId: string; role: GenerationInputRole; sortOrder: number }>;
}> {
  const source = await deps.repository.getAssetById(input.sourceAssetId);
  assertReadyStudioSource(source, input.userId);
  if (input.project.sourceAssetId && input.project.sourceAssetId !== source.id) {
    throw forbidden(
      'GENERATION_PROJECT_SOURCE_MISMATCH',
      'Bu kaynak görsel seçilen projeye ait değil.',
    );
  }
  if (input.mode === 'PRODUCT_STUDIO') {
    return { source, inputs: [{ assetId: source.id, role: 'PRODUCT', sortOrder: 0 }] };
  }
  if (input.mode === 'NAIL_PREVIEW') {
    return { source, inputs: [{ assetId: source.id, role: 'HAND', sortOrder: 0 }] };
  }
  if (input.mode !== 'VIRTUAL_TRY_ON' || !input.secondarySourceAssetId) {
    throw badRequest('STUDIO_INPUTS_INVALID', 'Stüdyo kaynak görselleri eksik veya geçersiz.');
  }
  if (input.secondarySourceAssetId === source.id) {
    throw badRequest(
      'TRY_ON_INPUTS_MUST_DIFFER',
      'Kişi ve kıyafet için iki farklı kaynak görsel yükleyin.',
    );
  }
  const garment = await deps.repository.getAssetById(input.secondarySourceAssetId);
  assertReadyStudioSource(garment, input.userId);
  return {
    source,
    inputs: [
      { assetId: source.id, role: 'PRIMARY_PERSON', sortOrder: 0 },
      { assetId: garment.id, role: 'GARMENT', sortOrder: 1 },
    ],
  };
}

type CharacterAuthorization =
  | { mode: 'FICTIONAL'; person: CatalogFeaturedPerson }
  | { mode: 'LICENSED_REFERENCE'; person: CatalogFeaturedPerson; referenceAssetId: string };

type GenerationSelectionInput = {
  sceneTemplateId?: string | null;
  stylePresetId?: string | null;
  featuredPersonId?: string | null;
  characterMode?: 'FICTIONAL' | 'LICENSED_REFERENCE';
};

function resolveCatalogSelection(
  project: ProjectRecord,
  input: GenerationSelectionInput,
): GenerationSelectionInput {
  // `null` deliberately clears a previous project choice; only `undefined`
  // means “keep the saved value”. This prevents a stale featured person or
  // filter from silently leaking into a new preview.
  return {
    sceneTemplateId:
      input.sceneTemplateId === undefined ? project.sceneTemplateId : input.sceneTemplateId,
    stylePresetId: input.stylePresetId === undefined ? project.stylePresetId : input.stylePresetId,
    featuredPersonId:
      input.featuredPersonId === undefined ? project.featuredPersonId : input.featuredPersonId,
    characterMode: input.characterMode,
  };
}

async function assertCatalogRights(
  deps: ApiDependencies,
  input: GenerationSelectionInput,
): Promise<CharacterAuthorization | null> {
  const catalog = await deps.repository.getCatalog();
  if (
    input.sceneTemplateId &&
    !catalog.scenes.some((item) => item.id === input.sceneTemplateId && item.enabled)
  )
    throw notFound('CATALOG_SCENE_NOT_FOUND', 'Seçilen sahne kullanılamıyor.');
  if (
    input.stylePresetId &&
    ![...catalog.styles, ...catalog.filters].some(
      (item) => item.id === input.stylePresetId && item.enabled,
    )
  )
    throw notFound('CATALOG_STYLE_NOT_FOUND', 'Seçilen stil kullanılamıyor.');
  const person = input.featuredPersonId
    ? catalog.featuredPeople.find((item) => item.id === input.featuredPersonId)
    : undefined;
  if (input.featuredPersonId && !person)
    throw notFound('CATALOG_PERSON_NOT_FOUND', 'Seçilen kişi bulunamadı.');
  if (!person) return null;
  if (!person.enabled || !person.isSelectable || !person.generationEnabled) {
    throw forbidden('RIGHTS_NOT_ALLOWED', 'Bu kişi veya kullanım türü şu anda seçilemiyor.');
  }
  if (person.kind === 'FICTIONAL_CHARACTER' && person.rightsStatus === 'FICTIONAL') {
    if (input.characterMode && input.characterMode !== 'FICTIONAL') {
      throw forbidden(
        'CHARACTER_MODE_MISMATCH',
        'Kurgusal karakter için lisanslı referans modu kullanılamaz.',
      );
    }
    return { mode: 'FICTIONAL', person };
  }
  if (person.kind === 'LICENSED_PERSON' && person.rightsStatus === 'LICENSED') {
    if (input.characterMode && input.characterMode !== 'LICENSED_REFERENCE') {
      throw forbidden(
        'CHARACTER_MODE_MISMATCH',
        'Lisanslı karakter için doğru referans modu seçilmelidir.',
      );
    }
    if (!person.referenceAssetId) {
      throw forbidden(
        'LICENSED_REFERENCE_UNAVAILABLE',
        'Lisanslı karakter referansı şu anda kullanılamıyor.',
      );
    }
    return { mode: 'LICENSED_REFERENCE', person, referenceAssetId: person.referenceAssetId };
  }
  throw forbidden('RIGHTS_NOT_ALLOWED', 'Bu kişi veya kullanım türü şu anda seçilemiyor.');
}

function legacyComposition(composition: string): LegacyGenerationRecipe['composition'] {
  switch (composition) {
    case 'SELFIE':
      return {
        shotType: 'CLOSE_SELFIE',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'SHALLOW',
      };
    case 'CLOSE':
      return {
        shotType: 'PORTRAIT',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'SHALLOW',
      };
    case 'MEDIUM':
      return {
        shotType: 'HALF_BODY',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      };
    case 'WIDE':
      return {
        shotType: 'FULL_BODY',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'DEEP',
      };
    default:
      return {
        shotType: 'PORTRAIT',
        cameraAngle: 'EYE_LEVEL',
        subjectPosition: 'CENTER',
        backgroundDepth: 'BALANCED',
      };
  }
}

function createGenerationRecipe(
  input: {
    composition: string;
    compositionDetails?: LegacyGenerationRecipe['composition'];
    filterIntensity: number;
    beauty?: LegacyGenerationRecipe['beauty'];
    transformation?: LegacyGenerationRecipe['transformation'];
    trendPreset?: LegacyGenerationRecipe['trendPreset'];
    toolPreset?: LegacyGenerationRecipe['toolPreset'];
  },
  character: CharacterAuthorization | null,
  selection: GenerationSelectionInput,
): LegacyGenerationRecipe {
  return {
    version: 1,
    // Project selections are mutable. Capture the validated values on the job
    // itself so a later edit cannot alter an already queued OpenAI request.
    selection: {
      sceneTemplateId: selection.sceneTemplateId ?? null,
      stylePresetId: selection.stylePresetId ?? null,
      featuredPersonId: selection.featuredPersonId ?? null,
    },
    filterIntensity: input.filterIntensity,
    ...(input.beauty ? { beauty: input.beauty } : {}),
    ...(input.transformation ? { transformation: input.transformation } : {}),
    ...(input.trendPreset ? { trendPreset: input.trendPreset } : {}),
    ...(input.toolPreset ? { toolPreset: input.toolPreset } : {}),
    composition: input.compositionDetails ?? legacyComposition(input.composition),
    character: character
      ? character.mode === 'LICENSED_REFERENCE'
        ? { mode: 'LICENSED_REFERENCE', referenceAssetId: character.referenceAssetId }
        : { mode: 'FICTIONAL' }
      : null,
  };
}

/**
 * Persist only execution-critical, server-resolved studio fields. Presentation
 * metadata stays in the catalog response and can never influence a queued job.
 */
function createStudioGenerationRecipe(plan: ResolvedStudioPlan): StudioGenerationRecipe {
  const studio =
    plan.kind === 'PRODUCT_STUDIO'
      ? {
          kind: plan.kind,
          categoryId: plan.categoryId,
          sceneId: plan.sceneId,
          taskType: plan.taskType,
        }
      : plan.kind === 'VIRTUAL_TRY_ON'
        ? { kind: plan.kind, sceneId: plan.sceneId, taskType: plan.taskType }
        : { kind: plan.kind, presetId: plan.presetId, taskType: plan.taskType };
  return {
    version: 2,
    studio,
    catalogVersion: plan.catalogVersion,
    promptVersion: plan.promptVersion,
    pricingVersion: plan.pricingVersion,
    modelLane: plan.modelLane,
    baseCredits: plan.baseCredits,
    hdExtraCredits: plan.hdExtraCredits,
  };
}

function resolveStudioSelection(input: unknown): ResolvedStudioPlan {
  try {
    return getStudioSelection(input);
  } catch {
    throw badRequest(
      'STUDIO_SELECTION_UNAVAILABLE',
      'Seçilen ürün kategorisi, sahne veya görünüm şu anda kullanılamıyor.',
    );
  }
}

/** Backfill the immutable choice snapshot when revising a legacy generation. */
function withSelectionSnapshot(
  recipe: LegacyGenerationRecipe,
  selection: GenerationSelectionInput,
): LegacyGenerationRecipe {
  if (recipe.selection) return recipe;
  return {
    ...recipe,
    selection: {
      sceneTemplateId: selection.sceneTemplateId ?? null,
      stylePresetId: selection.stylePresetId ?? null,
      featuredPersonId: selection.featuredPersonId ?? null,
    },
  };
}

async function presentation(deps: ApiDependencies, generation: GenerationRecord) {
  const outputs = await Promise.all(
    generation.outputs.map(async (output) => {
      const asset = await deps.repository.getAssetById(output.assetId);
      return {
        ...output,
        asset: asset
          ? {
              id: asset.id,
              mimeType: asset.mimeType,
              status: asset.status,
              accessUrl:
                asset.status === 'READY'
                  ? asset.storageProvider === 'local'
                    ? `/v1/assets/${asset.id}/content`
                    : await deps.storage.createDownloadUrl({
                        key: asset.storageKey,
                        expiresInSeconds: 300,
                      })
                  : null,
            }
          : null,
      };
    }),
  );
  return {
    id: generation.id,
    projectId: generation.projectId,
    status: generation.status,
    stage: generation.stage,
    progress: generation.progress,
    message:
      generation.status === 'COMPLETED'
        ? 'Görseliniz hazır.'
        : (generation.failureMessage ?? 'Görseliniz hazırlanıyor.'),
    quality: generation.quality,
    aspectRatio: generation.aspectRatio,
    outputs,
    credit: {
      reserved: generation.reservedCredits,
      charged: generation.chargedCredits,
      refunded: generation.refundedCredits,
    },
    failure: generation.failureCode
      ? { code: generation.failureCode, message: generation.failureMessage }
      : null,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
    completedAt: generation.completedAt,
  };
}

type ModelLaneInput = {
  mode: ProjectRecord['mode'];
  quality: 'PREVIEW' | 'STANDARD' | 'HD';
  hasBeauty?: boolean;
  hasTransformation?: boolean;
  hasFeaturedPerson?: boolean;
  hasTrend?: boolean;
};

/**
 * Model choice is derived only from the server-validated request snapshot.
 * Preview always stays on Flare. Standard/HD full-scene and trend transforms
 * use the precision lane because they rebuild substantial surroundings while
 * preserving a real person's identity and source-supported anatomy.
 */
function usesPremiumImageModel(input: ModelLaneInput): boolean {
  if (input.quality === 'PREVIEW') return false;
  return (
    input.mode === 'FULL_SCENE' ||
    input.mode === 'PRO_PORTRAIT' ||
    Boolean(input.hasTrend) ||
    Boolean(input.hasBeauty) ||
    Boolean(input.hasTransformation) ||
    Boolean(input.hasFeaturedPerson)
  );
}

function configuredImageModel(deps: ApiDependencies, premiumModel: boolean): string {
  return premiumModel
    ? deps.config.OPENAI_IMAGE_PREMIUM_MODEL || deps.config.OPENAI_IMAGE_MODEL
    : deps.config.OPENAI_IMAGE_MODEL;
}

async function reserveCreateAndEnqueue(
  deps: ApiDependencies,
  input: {
    userId: string;
    requestId: string;
    project: ProjectRecord;
    sourceAssetId: string;
    quality: 'PREVIEW' | 'STANDARD' | 'HD';
    numberOfImages: number;
    aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
    preserveFace: boolean;
    preserveClothes: boolean;
    recipe: GenerationRecipe;
    inputs?: Array<{ assetId: string; role: GenerationInputRole; sortOrder: number }>;
    instruction?: string;
    parentGenerationId?: string | null;
    idempotencyKey?: string;
  },
) {
  const pricedSelection =
    input.recipe.version === 1 ? (input.recipe.selection ?? input.project) : null;
  if (input.recipe.version === 1) {
    // Verify protected catalogue choices against RevenueCat on the server. A
    // mobile entitlement flag is useful for UI only and is never trusted here.
    await assertProGenerationAccess({
      repository: deps.repository,
      revenueCatService: deps.revenueCatService,
      userId: input.userId,
      project: input.project,
      recipe: input.recipe,
      selection: pricedSelection!,
    });
  }
  const premiumModel =
    input.recipe.version === 2
      ? input.quality !== 'PREVIEW' && input.recipe.modelLane === 'PREMIUM'
      : usesPremiumImageModel({
          mode: input.project.mode,
          quality: input.quality,
          hasBeauty: Boolean(input.recipe.beauty),
          hasTransformation: Boolean(input.recipe.transformation),
          hasFeaturedPerson: Boolean(pricedSelection!.featuredPersonId),
          hasTrend: Boolean(input.recipe.trendPreset),
        });
  const model = configuredImageModel(deps, premiumModel);
  const quote =
    input.recipe.version === 2
      ? calculateStudioCreditQuote({
          quality: input.quality,
          numberOfImages: input.numberOfImages,
          baseCredits: input.recipe.baseCredits,
          hdExtraCredits: input.recipe.hdExtraCredits,
          label:
            input.recipe.studio.kind === 'PRODUCT_STUDIO'
              ? 'Ürün çekimi'
              : input.recipe.studio.kind === 'VIRTUAL_TRY_ON'
                ? 'Kıyafet denemesi'
                : 'Tırnak görünümü',
        })
      : calculateCreditQuote({
          mode: input.project.mode,
          quality: input.quality,
          numberOfImages: input.numberOfImages,
          premiumModel,
          hasFilter:
            Boolean(pricedSelection!.stylePresetId) &&
            !input.recipe.beauty &&
            !input.recipe.transformation &&
            !input.recipe.trendPreset,
          hasTrend: Boolean(input.recipe.trendPreset),
          beautyTier: input.recipe.beauty
            ? premiumBeautySelections(input.recipe.beauty).length
              ? 'PREMIUM'
              : 'STANDARD'
            : undefined,
          hasFeaturedPerson: Boolean(pricedSelection!.featuredPersonId),
          hasSceneTemplate: Boolean(pricedSelection!.sceneTemplateId),
        });
  const compiledPrompt =
    input.recipe.version === 2
      ? buildStudioPrompt({
          recipe: input.recipe.studio,
          promptVersion: input.recipe.promptVersion,
          aspectRatio: input.aspectRatio,
          quality: input.quality,
          userInstruction: input.instruction,
        })
      : null;
  const generationId = createId();
  const reservation = await deps.repository.reserveCredits({
    userId: input.userId,
    generationId,
    amount: quote.creditCost,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    const generation = await deps.repository.createGeneration({
      id: generationId,
      userId: input.userId,
      projectId: input.project.id,
      sourceAssetId: input.sourceAssetId,
      parentGenerationId: input.parentGenerationId ?? null,
      quality: input.quality,
      requestedImageCount: input.numberOfImages,
      aspectRatio: input.aspectRatio,
      preserveFace: input.preserveFace,
      preserveClothes: input.preserveClothes,
      recipe: input.recipe,
      userInstruction: input.instruction ?? null,
      compiledPrompt,
      promptVersion: input.recipe.version === 2 ? input.recipe.promptVersion : null,
      provider: deps.config.AI_PROVIDER.toUpperCase(),
      model,
      reservedCredits: quote.creditCost,
      inputs: input.inputs,
    });
    await deps.generationQueue.enqueue({
      generationId,
      userId: input.userId,
      requestId: input.requestId,
      attempt: 0,
    });
    return { generation, quote, reservationId: reservation.reservationId };
  } catch (error) {
    await deps.repository.releaseCredits({
      userId: input.userId,
      generationId,
      amount: quote.creditCost,
      reason: 'Generation kuyruğa alınamadı.',
    });
    throw error;
  }
}

export function createGenerationsRouter(deps: ApiDependencies): Router {
  const router = Router();
  router.use(requireAuth(deps.tokenService, deps.repository));

  router.post(
    '/quote',
    validate(QuoteGenerationSchema),
    asyncHandler(async (req, res) => {
      if (req.body.studio) {
        const plan = resolveStudioSelection(req.body.studio);
        const quote = calculateStudioCreditQuote({
          quality: req.body.quality,
          numberOfImages: req.body.numberOfImages,
          baseCredits: plan.baseCredits,
          hdExtraCredits: plan.hdExtraCredits,
          label: plan.selectionLabel,
        });
        const wallet = await deps.repository.getWallet(req.auth!.userId);
        sendSuccess(res, req.requestId, {
          ...quote,
          modelLane: req.body.quality === 'PREVIEW' ? 'FAST' : plan.modelLane,
          availableCredits: wallet.available,
          canGenerate: wallet.available >= quote.creditCost,
        });
        return;
      }
      await assertCatalogRights(deps, req.body);
      assertBeautyAccess(req.body);
      assertBeautyStyle(req.body, req.body.stylePresetId, await deps.repository.getCatalog());
      assertTrendSelection(req.body, req.body.stylePresetId, await deps.repository.getCatalog());
      const premiumModel = usesPremiumImageModel({
        mode: req.body.mode,
        quality: req.body.quality,
        hasBeauty: Boolean(req.body.beauty),
        hasTransformation: Boolean(req.body.transformation),
        hasFeaturedPerson: Boolean(req.body.featuredPersonId),
        hasTrend: Boolean(req.body.trendPreset),
      });
      const quote = calculateCreditQuote({
        mode: req.body.mode,
        quality: req.body.quality,
        numberOfImages: req.body.numberOfImages,
        premiumModel,
        hasFilter:
          Boolean(req.body.stylePresetId) &&
          !req.body.beauty &&
          !req.body.transformation &&
          !req.body.trendPreset,
        hasTrend: Boolean(req.body.trendPreset),
        beautyTier: req.body.beauty
          ? premiumBeautySelections(req.body.beauty).length
            ? 'PREMIUM'
            : 'STANDARD'
          : undefined,
        hasFeaturedPerson: Boolean(req.body.featuredPersonId),
        hasSceneTemplate: Boolean(req.body.sceneTemplateId),
      });
      const wallet = await deps.repository.getWallet(req.auth!.userId);
      sendSuccess(res, req.requestId, {
        ...quote,
        modelLane: premiumModel ? 'PREMIUM' : 'FAST',
        availableCredits: wallet.available,
        canGenerate: wallet.available >= quote.creditCost,
      });
    }),
  );

  router.post(
    '/',
    generationRateLimit,
    validate(CreateGenerationSchema),
    asyncHandler(async (req, res) => {
      if (deps.config.DISABLE_ALL_GENERATION)
        throw unavailable(
          'GENERATION_DISABLED',
          'Görsel üretimi şu anda geçici olarak kullanılamıyor.',
        );
      const clientKey = getIdempotencyKey(req.header('idempotency-key'));
      const key = accountIdempotencyKey(req.auth!.userId, clientKey);
      const requestHash = hashStable(stableStringify(req.body));
      const previous = await findAccountIdempotency(
        deps.repository,
        'POST:/v1/generations',
        req.auth!.userId,
        clientKey,
      );
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw conflict(
            'IDEMPOTENCY_KEY_REUSED',
            'Bu Idempotency-Key farklı bir istekle zaten kullanıldı.',
          );
        sendSuccess(res, req.requestId, previous.responseBody, previous.responseCode ?? 202);
        return;
      }

      let project = await ownedProject(deps, req.auth!.userId, req.body.projectId);
      if (project.mode !== req.body.mode)
        throw conflict(
          'GENERATION_PROJECT_MODE_MISMATCH',
          'Üretim modu projenin modu ile eşleşmiyor.',
        );
      if (req.body.studio) {
        const plan = resolveStudioSelection(req.body.studio);
        const studioSources = await studioGenerationInputs(deps, {
          userId: req.auth!.userId,
          project,
          mode: req.body.mode,
          sourceAssetId: req.body.sourceAssetId,
          secondarySourceAssetId: req.body.secondarySourceAssetId,
        });
        const recipe = createStudioGenerationRecipe(plan);
        project = await deps.repository.updateProject(project.id, {
          sceneTemplateId: null,
          stylePresetId: null,
          featuredPersonId: null,
          composition: req.body.composition,
          aspectRatio: req.body.aspectRatio,
          status: 'ACTIVE',
        });
        const result = await reserveCreateAndEnqueue(deps, {
          userId: req.auth!.userId,
          requestId: req.requestId,
          project,
          sourceAssetId: studioSources.source.id,
          quality: req.body.quality,
          numberOfImages: req.body.numberOfImages,
          aspectRatio: req.body.aspectRatio,
          preserveFace: true,
          preserveClothes: true,
          recipe,
          inputs: studioSources.inputs,
          instruction: req.body.userNotes ?? req.body.customInstruction,
          idempotencyKey: key,
        });
        const data = {
          generationId: result.generation.id,
          projectId: project.id,
          status: result.generation.status,
          creditReservationId: result.reservationId,
          reservedCredits: result.quote.creditCost,
          estimatedQueueSeconds: deps.config.QUEUE_DRIVER === 'memory' ? 1 : 35,
          statusUrl: `/v1/generations/${result.generation.id}`,
        };
        await deps.repository.putIdempotency({
          userId: req.auth!.userId,
          route: 'POST:/v1/generations',
          key,
          requestHash,
          responseCode: 202,
          responseBody: data,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        sendSuccess(res, req.requestId, data, 202);
        return;
      }
      const source = await deps.repository.getAssetById(req.body.sourceAssetId);
      if (!source || source.ownerId !== req.auth!.userId || source.status !== 'READY')
        throw forbidden('GENERATION_SOURCE_INVALID', 'Kaynak görseliniz üretim için hazır değil.');
      const selection = resolveCatalogSelection(project, req.body);
      assertTrendSelection(
        { ...req.body, ...selection },
        selection.stylePresetId,
        await deps.repository.getCatalog(),
      );
      assertTrendSource(req.body, source, project);
      assertBeautyAccess({ ...req.body, ...selection });
      assertBeautySource(
        req.body,
        source,
        project,
        selection.stylePresetId,
        await deps.repository.getCatalog(),
      );
      const character = await assertCatalogRights(deps, selection);
      const recipe = createGenerationRecipe(req.body, character, selection);
      project = await deps.repository.updateProject(project.id, {
        sceneTemplateId: selection.sceneTemplateId ?? null,
        stylePresetId: selection.stylePresetId ?? null,
        featuredPersonId: selection.featuredPersonId ?? null,
        composition: req.body.composition,
        aspectRatio: req.body.aspectRatio,
        status: 'ACTIVE',
      });
      const result = await reserveCreateAndEnqueue(deps, {
        userId: req.auth!.userId,
        requestId: req.requestId,
        project,
        sourceAssetId: source.id,
        quality: req.body.quality,
        numberOfImages: req.body.numberOfImages,
        aspectRatio: req.body.aspectRatio,
        preserveFace: req.body.preserveFace,
        preserveClothes: req.body.preserveClothes,
        recipe,
        instruction: req.body.customInstruction,
        idempotencyKey: key,
      });
      const data = {
        generationId: result.generation.id,
        projectId: project.id,
        status: result.generation.status,
        creditReservationId: result.reservationId,
        reservedCredits: result.quote.creditCost,
        estimatedQueueSeconds: deps.config.QUEUE_DRIVER === 'memory' ? 1 : 35,
        statusUrl: `/v1/generations/${result.generation.id}`,
      };
      await deps.repository.putIdempotency({
        userId: req.auth!.userId,
        route: 'POST:/v1/generations',
        key,
        requestHash,
        responseCode: 202,
        responseBody: data,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      sendSuccess(res, req.requestId, data, 202);
    }),
  );

  /**
   * Explicit, asynchronous preview submission. UI card/slider changes remain
   * local; this route is called once when the user taps “Önizlemeyi oluştur”.
   */
  router.post(
    '/preview',
    generationRateLimit,
    validate(CreatePreviewGenerationSchema),
    asyncHandler(async (req, res) => {
      if (deps.config.DISABLE_ALL_GENERATION)
        throw unavailable(
          'GENERATION_DISABLED',
          'Görsel üretimi şu anda geçici olarak kullanılamıyor.',
        );
      const clientKey = getIdempotencyKey(req.header('idempotency-key'));
      const route = 'POST:/v1/generations/preview';
      const key = accountIdempotencyKey(req.auth!.userId, clientKey, route);
      const requestHash = hashStable(stableStringify(req.body));
      const previous = await findAccountIdempotency(
        deps.repository,
        route,
        req.auth!.userId,
        clientKey,
      );
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw conflict(
            'IDEMPOTENCY_KEY_REUSED',
            'Bu Idempotency-Key farklı bir istekle zaten kullanıldı.',
          );
        sendSuccess(res, req.requestId, previous.responseBody, previous.responseCode ?? 202);
        return;
      }

      let project = await ownedProject(deps, req.auth!.userId, req.body.projectId);
      if (project.mode !== req.body.mode)
        throw conflict(
          'GENERATION_PROJECT_MODE_MISMATCH',
          'Önizleme modu projenin modu ile eşleşmiyor.',
        );
      if (req.body.studio) {
        const plan = resolveStudioSelection(req.body.studio);
        const studioSources = await studioGenerationInputs(deps, {
          userId: req.auth!.userId,
          project,
          mode: req.body.mode,
          sourceAssetId: req.body.sourceAssetId,
          secondarySourceAssetId: req.body.secondarySourceAssetId,
        });
        const recipe = createStudioGenerationRecipe(plan);
        project = await deps.repository.updateProject(project.id, {
          sceneTemplateId: null,
          stylePresetId: null,
          featuredPersonId: null,
          composition: req.body.composition,
          aspectRatio: req.body.aspectRatio,
          status: 'ACTIVE',
        });
        const result = await reserveCreateAndEnqueue(deps, {
          userId: req.auth!.userId,
          requestId: req.requestId,
          project,
          sourceAssetId: studioSources.source.id,
          quality: 'PREVIEW',
          numberOfImages: req.body.numberOfImages,
          aspectRatio: req.body.aspectRatio,
          preserveFace: true,
          preserveClothes: true,
          recipe,
          inputs: studioSources.inputs,
          instruction: req.body.userNotes ?? req.body.customInstruction,
          idempotencyKey: key,
        });
        const data = {
          generationId: result.generation.id,
          projectId: project.id,
          status: result.generation.status,
          preview: true,
          creditReservationId: result.reservationId,
          reservedCredits: result.quote.creditCost,
          estimatedQueueSeconds: deps.config.QUEUE_DRIVER === 'memory' ? 1 : 35,
          statusUrl: `/v1/generations/${result.generation.id}`,
        };
        await deps.repository.putIdempotency({
          userId: req.auth!.userId,
          route,
          key,
          requestHash,
          responseCode: 202,
          responseBody: data,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        sendSuccess(res, req.requestId, data, 202);
        return;
      }
      const source = await deps.repository.getAssetById(req.body.sourceAssetId);
      if (!source || source.ownerId !== req.auth!.userId || source.status !== 'READY')
        throw forbidden(
          'GENERATION_SOURCE_INVALID',
          'Kaynak görseliniz önizleme için hazır değil.',
        );
      const selection = resolveCatalogSelection(project, req.body);
      assertTrendSelection(
        { ...req.body, ...selection },
        selection.stylePresetId,
        await deps.repository.getCatalog(),
      );
      assertTrendSource(req.body, source, project);
      assertBeautyAccess({ ...req.body, ...selection });
      assertBeautySource(
        req.body,
        source,
        project,
        selection.stylePresetId,
        await deps.repository.getCatalog(),
      );
      const character = await assertCatalogRights(deps, selection);
      const recipe = createGenerationRecipe(req.body, character, selection);
      project = await deps.repository.updateProject(project.id, {
        sceneTemplateId: selection.sceneTemplateId ?? null,
        stylePresetId: selection.stylePresetId ?? null,
        featuredPersonId: selection.featuredPersonId ?? null,
        composition: req.body.composition,
        aspectRatio: req.body.aspectRatio,
        status: 'ACTIVE',
      });
      const result = await reserveCreateAndEnqueue(deps, {
        userId: req.auth!.userId,
        requestId: req.requestId,
        project,
        sourceAssetId: source.id,
        quality: 'PREVIEW',
        numberOfImages: req.body.numberOfImages,
        aspectRatio: req.body.aspectRatio,
        preserveFace: req.body.preserveFace,
        preserveClothes: req.body.preserveClothes,
        recipe,
        instruction: req.body.customInstruction,
        idempotencyKey: key,
      });
      const data = {
        generationId: result.generation.id,
        projectId: project.id,
        status: result.generation.status,
        preview: true,
        creditReservationId: result.reservationId,
        reservedCredits: result.quote.creditCost,
        estimatedQueueSeconds: deps.config.QUEUE_DRIVER === 'memory' ? 1 : 35,
        statusUrl: `/v1/generations/${result.generation.id}`,
      };
      await deps.repository.putIdempotency({
        userId: req.auth!.userId,
        route,
        key,
        requestHash,
        responseCode: 202,
        responseBody: data,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      sendSuccess(res, req.requestId, data, 202);
    }),
  );

  router.get(
    '/:generationId',
    validate(GenerationParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const generation = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      sendSuccess(res, req.requestId, await presentation(deps, generation));
    }),
  );

  router.post(
    '/:generationId/cancel',
    validate(GenerationParamsSchema, 'params'),
    validate(CancelGenerationSchema),
    asyncHandler(async (req, res) => {
      const generation = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      if (['COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED'].includes(generation.status))
        throw conflict('GENERATION_NOT_CANCELLABLE', 'Bu üretim artık iptal edilemez.');
      await deps.repository.releaseCredits({
        userId: generation.userId,
        generationId: generation.id,
        amount: generation.reservedCredits,
        reason: req.body.reason ?? 'Kullanıcı iptal etti.',
      });
      const updated = await deps.repository.updateGeneration(generation.id, {
        status: 'CANCELLED',
        stage: 'CANCELLED',
        progress: 100,
        refundedCredits: generation.reservedCredits,
        completedAt: new Date(),
      });
      sendSuccess(res, req.requestId, await presentation(deps, updated));
    }),
  );

  router.post(
    '/:generationId/select-output',
    validate(GenerationParamsSchema, 'params'),
    validate(SelectOutputSchema),
    asyncHandler(async (req, res) => {
      const generation = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      if (generation.status !== 'COMPLETED')
        throw conflict(
          'GENERATION_NOT_COMPLETED',
          'Yalnızca tamamlanmış bir üretimden çıktı seçebilirsiniz.',
        );
      await deps.repository.selectGenerationOutput(generation.id, req.body.outputId);
      sendSuccess(res, req.requestId, { selected: true, outputId: req.body.outputId });
    }),
  );

  router.post(
    '/:generationId/revisions',
    generationRateLimit,
    validate(GenerationParamsSchema, 'params'),
    validate(GenerationRevisionSchema),
    asyncHandler(async (req, res) => {
      if (deps.config.DISABLE_ALL_GENERATION)
        throw unavailable(
          'GENERATION_DISABLED',
          'Görsel üretimi şu anda geçici olarak kullanılamıyor.',
        );
      const parent = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      if (parent.status !== 'COMPLETED')
        throw conflict(
          'GENERATION_NOT_COMPLETED',
          'Revizyon için önce tamamlanmış bir sonuç seçin.',
        );
      const output = parent.outputs.find((item) => item.id === req.body.sourceOutputId);
      if (!output) throw notFound('GENERATION_OUTPUT_NOT_FOUND', 'Revizyon kaynağı bulunamadı.');
      const project = await ownedProject(deps, req.auth!.userId, parent.projectId);
      if (parent.recipe?.version === 2) {
        if (project.mode !== parent.recipe.studio.kind) {
          throw conflict(
            'GENERATION_PROJECT_MODE_MISMATCH',
            'Stüdyo üretim tarifi projenin modu ile eşleşmiyor.',
          );
        }
        const primaryRole =
          parent.recipe.studio.kind === 'PRODUCT_STUDIO'
            ? 'PRODUCT'
            : parent.recipe.studio.kind === 'NAIL_PREVIEW'
              ? 'HAND'
              : 'PRIMARY_PERSON';
        const primaryInput = parent.inputs.find((item) => item.role === primaryRole);
        const garmentInput = parent.inputs.find((item) => item.role === 'GARMENT');
        if (!primaryInput || (parent.recipe.studio.kind === 'VIRTUAL_TRY_ON' && !garmentInput)) {
          throw conflict(
            'GENERATION_INPUT_ROLES_INVALID',
            'Özgün stüdyo kaynakları artık kullanılamıyor.',
          );
        }
        const studioSources = await studioGenerationInputs(deps, {
          userId: req.auth!.userId,
          project,
          mode: project.mode,
          sourceAssetId: primaryInput.assetId,
          secondarySourceAssetId: garmentInput?.assetId,
        });
        const result = await reserveCreateAndEnqueue(deps, {
          userId: req.auth!.userId,
          requestId: req.requestId,
          project,
          sourceAssetId: studioSources.source.id,
          quality: req.body.quality,
          numberOfImages: 1,
          aspectRatio: parent.aspectRatio,
          preserveFace: true,
          preserveClothes: true,
          recipe: parent.recipe,
          inputs: studioSources.inputs,
          instruction: req.body.instruction,
          parentGenerationId: parent.id,
        });
        sendSuccess(
          res,
          req.requestId,
          {
            generationId: result.generation.id,
            parentGenerationId: parent.id,
            status: result.generation.status,
            reservedCredits: result.quote.creditCost,
          },
          202,
        );
        return;
      }
      const recipe: LegacyGenerationRecipe =
        parent.recipe?.version === 1
          ? withSelectionSnapshot(parent.recipe, project)
          : createGenerationRecipe(
              { composition: project.composition ?? 'SELFIE', filterIntensity: 60 },
              await assertCatalogRights(deps, project),
              project,
            );
      assertBeautyAccess({
        mode: project.mode,
        beauty: recipe.beauty,
        transformation: recipe.transformation,
      });
      assertTrendSelection(
        { ...recipe, ...recipe.selection, mode: project.mode },
        recipe.selection?.stylePresetId,
        await deps.repository.getCatalog(),
      );
      // Identity-sensitive and bounded edit tools are always recomputed from the original upload.
      // Never recursively edit a generated output for beauty, trends, relighting, portrait,
      // background replacement or canvas expansion because each generation would compound drift.
      const requiresOriginalSource =
        Boolean(recipe.beauty) ||
        Boolean(recipe.transformation) ||
        Boolean(recipe.trendPreset) ||
        Boolean(recipe.toolPreset);
      const revisionSourceId = requiresOriginalSource ? parent.sourceAssetId : output.assetId;
      if (requiresOriginalSource) {
        const source = await deps.repository.getAssetById(revisionSourceId);
        if (
          !source ||
          source.ownerId !== req.auth!.userId ||
          source.status !== 'READY' ||
          source.deletedAt
        )
          throw forbidden(
            'GENERATION_SOURCE_INVALID',
            'Özgün kaynak fotoğraf artık kullanılamıyor.',
          );
        assertTrendSource(recipe, source, project);
        assertBeautySource(
          recipe,
          source,
          project,
          recipe.selection?.stylePresetId,
          await deps.repository.getCatalog(),
        );
      }
      const result = await reserveCreateAndEnqueue(deps, {
        userId: req.auth!.userId,
        requestId: req.requestId,
        project,
        sourceAssetId: revisionSourceId,
        quality: req.body.quality,
        numberOfImages: 1,
        aspectRatio: parent.aspectRatio,
        preserveFace: parent.preserveFace,
        preserveClothes: parent.preserveClothes,
        recipe,
        instruction: req.body.instruction,
        parentGenerationId: parent.id,
      });
      sendSuccess(
        res,
        req.requestId,
        {
          generationId: result.generation.id,
          parentGenerationId: parent.id,
          status: result.generation.status,
          reservedCredits: result.quote.creditCost,
        },
        202,
      );
    }),
  );

  router.get(
    '/:generationId/messages',
    validate(GenerationParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const generation = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      sendSuccess(res, req.requestId, {
        items: await deps.repository.listGenerationMessages(generation.id),
      });
    }),
  );
  router.post(
    '/:generationId/messages',
    validate(GenerationParamsSchema, 'params'),
    validate(GenerationMessageSchema),
    asyncHandler(async (req, res) => {
      const generation = await ownedGeneration(
        deps,
        req.auth!.userId,
        req.params.generationId as string,
      );
      const message = await deps.repository.addGenerationMessage({
        generationId: generation.id,
        role: 'USER',
        content: req.body.content,
      });
      sendSuccess(res, req.requestId, { message }, 201);
    }),
  );

  return router;
}
