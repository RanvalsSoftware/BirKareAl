import type { BirKareConfig } from '@birkare/config';
import type {
  BirKareRepository,
  CatalogSnapshot,
  GenerationInputRole,
  GenerationRecord,
  ProjectRecord,
} from '@birkare/database';
import type { StorageProvider } from '@birkare/storage';
import {
  ASPECT_RATIO_TO_SIZE,
  ApiError,
  FASHION_SCENE_IDS,
  GENERATION_STAGES,
  NAIL_PRESET_IDS,
  NAIL_TASK_IDS,
  PRODUCT_CATEGORY_IDS,
  PRODUCT_SCENE_IDS,
  PRODUCT_TASK_IDS,
  TERMINAL_GENERATION_STATUSES,
  TRY_ON_TASK_IDS,
  calculateStudioCreditQuote,
  evaluateProductPolicy,
} from '@birkare/shared';
import { buildGenerationPrompt, GENERATION_PROMPT_VERSION } from './prompt-builder.js';
import { safeModerationCategories } from './provider-errors.js';
import { resolveGenerationSelection } from './presets.js';
import type {
  ImageGenerationInput,
  ImageGenerationProvider,
  ImageReference,
  ModerationProvider,
} from './types.js';

type LogLike = {
  info: (payload: unknown, message?: string) => void;
  warn: (payload: unknown, message?: string) => void;
  error: (payload: unknown, message?: string) => void;
};

export type GenerationRunnerDependencies = {
  repository: BirKareRepository;
  storage: StorageProvider;
  imageProvider: ImageGenerationProvider;
  moderationProvider: ModerationProvider;
  config: Pick<BirKareConfig, 'OPENAI_IMAGE_MODEL'>;
  logger: LogLike;
};

export type RunGenerationInput = { generationId: string; requestId: string };

const qualityForProvider = (quality: GenerationRecord['quality']): 'low' | 'medium' | 'high' =>
  quality === 'PREVIEW' ? 'low' : quality === 'HD' ? 'high' : 'medium';

const sizeForProvider = (generation: GenerationRecord): ImageGenerationInput['size'] => {
  if (generation.quality === 'HD' && generation.aspectRatio === '4:5') return '1536x1920';
  return ASPECT_RATIO_TO_SIZE[generation.aspectRatio];
};

function hasExpectedMagicBytes(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg')
    return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png')
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp')
    return (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  return false;
}

function isSupportedSourceMimeType(mimeType: string): mimeType is ImageReference['mimeType'] {
  return mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp';
}

type ApprovedCharacterReference = {
  referenceAssetId: string;
};

type ActiveCatalogSelection = {
  featuredPerson: CatalogSnapshot['featuredPeople'][number] | null;
};

const requiredInputRoles = (generation: GenerationRecord): GenerationInputRole[] => {
  if (generation.recipe?.version !== 2) return ['PRIMARY_USER'];
  switch (generation.recipe.studio.kind) {
    case 'PRODUCT_STUDIO':
      return ['PRODUCT'];
    case 'VIRTUAL_TRY_ON':
      return ['PRIMARY_PERSON', 'GARMENT'];
    case 'NAIL_PREVIEW':
      return ['HAND'];
  }
};

const providerRole = (role: GenerationInputRole): ImageReference['role'] => {
  switch (role) {
    case 'PRIMARY_USER':
      return 'USER';
    case 'PRIMARY_PERSON':
      return 'PRIMARY_PERSON';
    case 'PRODUCT':
      return 'PRODUCT';
    case 'GARMENT':
      return 'GARMENT';
    case 'HAND':
      return 'HAND';
  }
};

/**
 * A v2 recipe plus its compiled prompt is an immutable execution authorization.
 * Validate the snapshot itself without re-resolving mutable current registry
 * data, so an already queued job remains deterministic after a catalog deploy.
 */
function assertStudioRecipeSnapshot(generation: GenerationRecord, project: ProjectRecord): void {
  if (generation.recipe?.version !== 2) return;
  const recipe = generation.recipe;
  if (project.mode !== recipe.studio.kind) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_RECIPE_MODE_INVALID',
      message: 'Stüdyo üretim tarifi proje modu ile eşleşmiyor.',
    });
  }
  const safeVersion = (value: unknown) =>
    typeof value === 'string' && /^[A-Za-z0-9._-]{1,96}$/.test(value);
  if (
    !safeVersion(recipe.catalogVersion) ||
    !safeVersion(recipe.promptVersion) ||
    !safeVersion(recipe.pricingVersion)
  ) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_RECIPE_VERSION_INVALID',
      message: 'Stüdyo üretim tarifinin sürüm bilgisi doğrulanamadı.',
    });
  }
  const includes = (values: readonly string[], value: unknown) =>
    typeof value === 'string' && values.includes(value);
  const validSelection =
    recipe.studio.kind === 'PRODUCT_STUDIO'
      ? includes(PRODUCT_CATEGORY_IDS, recipe.studio.categoryId) &&
        includes(PRODUCT_SCENE_IDS, recipe.studio.sceneId) &&
        includes(PRODUCT_TASK_IDS, recipe.studio.taskType)
      : recipe.studio.kind === 'VIRTUAL_TRY_ON'
        ? includes(FASHION_SCENE_IDS, recipe.studio.sceneId) &&
          includes(TRY_ON_TASK_IDS, recipe.studio.taskType)
        : recipe.studio.kind === 'NAIL_PREVIEW'
          ? includes(NAIL_PRESET_IDS, recipe.studio.presetId) &&
            includes(NAIL_TASK_IDS, recipe.studio.taskType)
          : false;
  if (!validSelection) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_RECIPE_SELECTION_INVALID',
      message: 'Stüdyo sahnesi veya preset seçimi doğrulanamadı.',
    });
  }
  if (
    !['FAST', 'PREMIUM'].includes(recipe.modelLane) ||
    !Number.isInteger(recipe.baseCredits) ||
    recipe.baseCredits < 1 ||
    recipe.baseCredits > 50 ||
    !Number.isInteger(recipe.hdExtraCredits) ||
    recipe.hdExtraCredits < 0 ||
    recipe.hdExtraCredits > 20
  ) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_RECIPE_SNAPSHOT_INVALID',
      message: 'Stüdyo üretim tarifinin sunucu kaydı doğrulanamadı.',
    });
  }
  const expectedCredits = calculateStudioCreditQuote({
    quality: generation.quality,
    numberOfImages: generation.requestedImageCount,
    baseCredits: recipe.baseCredits,
    hdExtraCredits: recipe.hdExtraCredits,
    label: 'Stüdyo üretimi',
  }).creditCost;
  if (generation.reservedCredits !== expectedCredits) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_RECIPE_CREDIT_MISMATCH',
      message: 'Stüdyo üretiminin kredi rezervasyonu doğrulanamadı.',
    });
  }
  if (
    generation.promptVersion !== recipe.promptVersion ||
    !generation.compiledPrompt ||
    generation.compiledPrompt.length > 100_000
  ) {
    throw new ApiError({
      statusCode: 422,
      code: 'STUDIO_PROMPT_SNAPSHOT_INVALID',
      message: 'Stüdyo üretiminin değişmez prompt kaydı doğrulanamadı.',
    });
  }
}

/**
 * Re-check every queued catalog choice. The API validates selections at submit
 * time, but an administrator can disable a scene or filter before the worker
 * reaches OpenAI. Failing closed is preferable to silently substituting a
 * different visual treatment.
 */
function resolveActiveCatalogSelection(input: {
  generation: GenerationRecord;
  project: ProjectRecord;
  catalog: CatalogSnapshot;
}): ActiveCatalogSelection {
  // Studio IDs are resolved from the versioned server registry and snapshotted
  // in recipe v2; they must never fall back to mutable portrait catalog slots.
  if (input.generation.recipe?.version === 2) return { featuredPerson: null };
  const selection = resolveGenerationSelection(input.generation.recipe, input.project);
  const scene = selection.sceneTemplateId
    ? input.catalog.scenes.find((item) => item.id === selection.sceneTemplateId)
    : null;
  const style = selection.stylePresetId
    ? [...input.catalog.styles, ...input.catalog.filters].find(
        (item) => item.id === selection.stylePresetId,
      )
    : null;
  const featuredPerson = selection.featuredPersonId
    ? (input.catalog.featuredPeople.find((person) => person.id === selection.featuredPersonId) ??
      null)
    : null;

  if (selection.sceneTemplateId && (!scene || !scene.enabled)) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_SCENE_UNAVAILABLE',
      message: 'Seçilen sahne artık üretim için kullanılamıyor.',
    });
  }
  if (selection.stylePresetId && (!style || !style.enabled)) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_STYLE_UNAVAILABLE',
      message: 'Seçilen filtre artık üretim için kullanılamıyor.',
    });
  }
  if (selection.featuredPersonId && !featuredPerson) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_PERSON_UNAVAILABLE',
      message: 'Seçilen karakter artık üretim için kullanılamıyor.',
    });
  }
  if (
    ['FULL_SCENE', 'BACKGROUND_REPLACE', 'FAN_MOMENT'].includes(input.project.mode) &&
    !selection.sceneTemplateId
  ) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_SCENE_REQUIRED',
      message: 'Bu üretim için seçilen sahne bulunamadı.',
    });
  }
  if (['AI_FILTER', 'PRO_PORTRAIT'].includes(input.project.mode) && !selection.stylePresetId) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_STYLE_REQUIRED',
      message: 'Bu üretim için seçilen filtre bulunamadı.',
    });
  }
  if (input.project.mode === 'FAN_MOMENT' && !selection.featuredPersonId) {
    throw new ApiError({
      statusCode: 422,
      code: 'CATALOG_PERSON_REQUIRED',
      message: 'Bu üretim için seçilen karakter bulunamadı.',
    });
  }

  return { featuredPerson };
}

/**
 * Re-check character rights in the worker. API validation alone is not enough:
 * a queued job may run after an administrator has disabled a catalog item.
 */
function resolveApprovedCharacterReference(input: {
  generation: GenerationRecord;
  featuredPerson: CatalogSnapshot['featuredPeople'][number] | null;
}): ApprovedCharacterReference | null {
  const selectedPerson = input.featuredPerson;
  const requestedCharacter =
    input.generation.recipe?.version === 1 ? input.generation.recipe.character : null;
  if (!selectedPerson) {
    if (requestedCharacter) {
      throw new ApiError({
        statusCode: 422,
        code: 'CHARACTER_REFERENCE_INVALID',
        message: 'Seçilen karakter artık kullanılamıyor.',
      });
    }
    return null;
  }
  if (
    !selectedPerson.enabled ||
    !selectedPerson.isSelectable ||
    !selectedPerson.generationEnabled
  ) {
    throw new ApiError({
      statusCode: 403,
      code: 'RIGHTS_NOT_ALLOWED',
      message: 'Seçilen karakter artık üretim için onaylı değil.',
    });
  }
  if (
    selectedPerson.kind === 'FICTIONAL_CHARACTER' &&
    selectedPerson.rightsStatus === 'FICTIONAL'
  ) {
    if (requestedCharacter?.mode === 'LICENSED_REFERENCE') {
      throw new ApiError({
        statusCode: 422,
        code: 'CHARACTER_MODE_MISMATCH',
        message: 'Kurgusal karakter için lisanslı referans kullanılamaz.',
      });
    }
    return null;
  }
  if (selectedPerson.kind === 'LICENSED_PERSON' && selectedPerson.rightsStatus === 'LICENSED') {
    if (
      requestedCharacter?.mode !== 'LICENSED_REFERENCE' ||
      !selectedPerson.referenceAssetId ||
      requestedCharacter.referenceAssetId !== selectedPerson.referenceAssetId
    ) {
      throw new ApiError({
        statusCode: 422,
        code: 'LICENSED_REFERENCE_INVALID',
        message: 'Lisanslı karakter referansı doğrulanamadı.',
      });
    }
    return { referenceAssetId: selectedPerson.referenceAssetId };
  }
  throw new ApiError({
    statusCode: 403,
    code: 'RIGHTS_NOT_ALLOWED',
    message: 'Seçilen karakter üretim için onaylı değil.',
  });
}

async function setStage(
  repository: BirKareRepository,
  generationId: string,
  status: keyof typeof GENERATION_STAGES,
): Promise<void> {
  const stage = GENERATION_STAGES[status];
  const persistenceStage: Record<keyof typeof GENERATION_STAGES, string> = {
    VALIDATING: 'VALIDATING',
    MODERATING_INPUT: 'INPUT_MODERATION',
    QUEUED: 'QUEUE_WAIT',
    PREPARING: 'PREPARING_ASSETS',
    GENERATING: 'OPENAI_IMAGE_GENERATION',
    POST_PROCESSING: 'POST_PROCESSING',
    MODERATING_OUTPUT: 'OUTPUT_MODERATION',
  };
  await repository.updateGeneration(generationId, {
    status,
    stage: persistenceStage[status],
    progress: stage.progress,
  });
}

async function safeRelease(
  repository: BirKareRepository,
  generation: GenerationRecord,
  reason: string,
): Promise<void> {
  if (
    generation.reservedCredits <= 0 ||
    generation.chargedCredits > 0 ||
    generation.refundedCredits > 0
  )
    return;
  await repository.releaseCredits({
    userId: generation.userId,
    generationId: generation.id,
    amount: generation.reservedCredits,
    reason,
  });
}

/** A terminal decision is persisted before credit settlement, so a queue retry
 * can finish the refund without submitting the image to the provider again. */
async function settleFailedGeneration(
  repository: BirKareRepository,
  generation: GenerationRecord,
): Promise<void> {
  if (!['FAILED', 'BLOCKED', 'CANCELLED'].includes(generation.status)) return;
  if (
    generation.reservedCredits <= 0 ||
    generation.chargedCredits > 0 ||
    generation.refundedCredits > 0
  )
    return;
  await safeRelease(repository, generation, generation.failureCode ?? generation.status);
  await repository.updateGeneration(generation.id, {
    refundedCredits: generation.reservedCredits,
    failureMessage: generation.failureMessage?.replace(
      'Ayrılan kredinin iadesi tamamlanıyor.',
      'Ayrılan krediniz iade edildi.',
    ),
  });
}

/** Idempotent worker orchestration. Queue payloads contain only IDs, never raw images or prompts. */
export async function runGeneration(
  input: RunGenerationInput,
  dependencies: GenerationRunnerDependencies,
): Promise<void> {
  const { repository, storage, imageProvider, moderationProvider, config, logger } = dependencies;
  let generation = await repository.getGenerationById(input.generationId);
  if (!generation) {
    logger.warn(
      { generationId: input.generationId, requestId: input.requestId },
      'Worker için generation bulunamadı.',
    );
    return;
  }
  if (TERMINAL_GENERATION_STATUSES.has(generation.status)) {
    await settleFailedGeneration(repository, generation);
    return;
  }

  try {
    // A database outage may prevent saving the terminal decision after the paid
    // request. Never interpret queue redelivery of that attempt as permission
    // to submit the same photo for another paid render.
    if (generation.startedAt) {
      throw new ApiError({
        statusCode: 503,
        code: 'GENERATION_INTERRUPTED',
        message: 'Önceki üretimin sonucu doğrulanamadı. Tekrar ücretli üretim başlatılmadı.',
        expose: true,
      });
    }
    const project = await repository.getProjectById(generation.projectId);
    if (!project || project.userId !== generation.userId) {
      throw new ApiError({
        statusCode: 422,
        code: 'GENERATION_INVALID_SOURCE',
        message: 'Kaynak fotoğraf üretim için hazır değil.',
      });
    }
    assertStudioRecipeSnapshot(generation, project);

    const persistedInputs = generation.inputs?.length
      ? [...generation.inputs].sort((left, right) => left.sortOrder - right.sortOrder)
      : [
          {
            assetId: generation.sourceAssetId,
            role: 'PRIMARY_USER' as const,
            sortOrder: 0,
          },
        ];
    const expectedRoles = requiredInputRoles(generation);
    if (
      persistedInputs.length !== expectedRoles.length ||
      new Set(persistedInputs.map((item) => item.assetId)).size !== persistedInputs.length ||
      expectedRoles.some(
        (role, index) =>
          persistedInputs[index]?.role !== role ||
          persistedInputs[index]?.sortOrder !== index ||
          persistedInputs.filter((item) => item.role === role).length !== 1,
      )
    ) {
      throw new ApiError({
        statusCode: 422,
        code: 'GENERATION_INPUT_ROLES_INVALID',
        message: 'Üretim için gereken kaynak görseller doğrulanamadı.',
      });
    }
    const currentGeneration = generation;
    const preparedInputs = await Promise.all(
      persistedInputs.map(async (item) => {
        const asset = await repository.getAssetById(item.assetId);
        if (
          !asset ||
          asset.ownerId !== currentGeneration.userId ||
          asset.status !== 'READY' ||
          asset.deletedAt ||
          (currentGeneration.recipe?.version === 2 && asset.type !== 'USER_SOURCE') ||
          !isSupportedSourceMimeType(asset.mimeType)
        ) {
          throw new ApiError({
            statusCode: 422,
            code: 'GENERATION_INVALID_SOURCE',
            message: 'Kaynak fotoğraf üretim için hazır değil.',
          });
        }
        const bytes = await storage.getObject(asset.storageKey);
        if (!hasExpectedMagicBytes(bytes, asset.mimeType)) {
          await repository.updateAsset(asset.id, { status: 'REJECTED' });
          throw new ApiError({
            statusCode: 422,
            code: 'ASSET_INVALID_IMAGE',
            message: 'Yüklenen dosya geçerli bir görsel değil.',
          });
        }
        return {
          asset,
          reference: { buffer: bytes, mimeType: asset.mimeType, role: providerRole(item.role) },
        };
      }),
    );
    const sourceAsset = preparedInputs[0]!.asset;

    await setStage(repository, generation.id, 'VALIDATING');
    const localPolicy = evaluateProductPolicy(generation.userInstruction ?? '');
    if (localPolicy.decision === 'DENY' || localPolicy.decision === 'REQUIRE_HUMAN_REVIEW') {
      await safeRelease(
        repository,
        generation,
        localPolicy.reason ?? 'Güvenlik politikası nedeniyle işlem durduruldu.',
      );
      await repository.updateGeneration(generation.id, {
        status: 'BLOCKED',
        stage: 'POLICY_CHECK',
        progress: 100,
        failureCode:
          localPolicy.decision === 'DENY' ? 'MODERATION_BLOCKED' : 'MODERATION_REVIEW_REQUIRED',
        failureMessage: 'Bu talep BirKare AI güvenlik kurallarına uygun değil.',
        refundedCredits: generation.reservedCredits,
        completedAt: new Date(),
      });
      return;
    }
    generation = (await repository.getGenerationById(generation.id))!;
    if (!generation || TERMINAL_GENERATION_STATUSES.has(generation.status)) return;
    await setStage(repository, generation.id, 'MODERATING_INPUT');
    const moderation = await moderationProvider.moderateText({
      text: generation.userInstruction ?? '',
      requestId: input.requestId,
      sourceImages: preparedInputs.map((item) => item.reference),
    });
    // Input moderation is a network wait. Respect a cancellation received
    // during it before overwriting the status or calling the paid renderer.
    generation = (await repository.getGenerationById(generation.id))!;
    if (!generation || TERMINAL_GENERATION_STATUSES.has(generation.status)) return;
    if (moderation.flagged) {
      await safeRelease(repository, generation, moderation.reason ?? 'Moderasyon engeli');
      await repository.updateGeneration(generation.id, {
        status: 'BLOCKED',
        stage: 'INPUT_MODERATION',
        progress: 100,
        failureCode: 'INPUT_MODERATION_BLOCKED',
        failureMessage:
          'Fotoğraf veya talep ön güvenlik kontrolünden geçemedi. AI üretimi başlatılmadı. Fotoğrafını ve düzenleme seçimini gözden geçirebilirsin.',
        refundedCredits: generation.reservedCredits,
        completedAt: new Date(),
      });
      logger.warn(
        {
          generationId: generation.id,
          requestId: input.requestId,
          code: 'INPUT_MODERATION_BLOCKED',
          moderationStage: 'input',
          moderationCategories: safeModerationCategories(moderation.categories),
        },
        'Üretim ön güvenlik kontrolünde durduruldu.',
      );
      return;
    }

    await setStage(repository, generation.id, 'PREPARING');

    generation = (await repository.getGenerationById(generation.id))!;
    if (generation.status === 'CANCELLED') {
      await safeRelease(repository, generation, 'Kullanıcı üretimi iptal etti.');
      return;
    }

    const catalog = await repository.getCatalog();
    const activeSelection = resolveActiveCatalogSelection({ generation, project, catalog });
    const featuredPerson = activeSelection.featuredPerson;
    const approvedReference = resolveApprovedCharacterReference({ generation, featuredPerson });
    const sourceImages: ImageReference[] = preparedInputs.map((item) => item.reference);
    if (approvedReference) {
      const referenceAsset = await repository.getAssetById(approvedReference.referenceAssetId);
      if (
        !referenceAsset ||
        referenceAsset.status !== 'READY' ||
        referenceAsset.deletedAt ||
        referenceAsset.type !== 'APPROVED_REFERENCE' ||
        !isSupportedSourceMimeType(referenceAsset.mimeType)
      ) {
        throw new ApiError({
          statusCode: 422,
          code: 'LICENSED_REFERENCE_INVALID',
          message: 'Lisanslı karakter referansı artık kullanılamıyor.',
        });
      }
      const referenceBytes = await storage.getObject(referenceAsset.storageKey);
      if (!hasExpectedMagicBytes(referenceBytes, referenceAsset.mimeType)) {
        throw new ApiError({
          statusCode: 422,
          code: 'LICENSED_REFERENCE_INVALID',
          message: 'Lisanslı karakter referansı doğrulanamadı.',
        });
      }
      sourceImages.push({
        buffer: referenceBytes,
        mimeType: referenceAsset.mimeType,
        role: 'PERSON',
      });
    }
    const prompt =
      generation.recipe?.version === 2
        ? generation.compiledPrompt!
        : buildGenerationPrompt({ generation, project, catalog });
    await repository.updateGeneration(generation.id, {
      compiledPrompt: prompt,
      promptVersion:
        generation.recipe?.version === 2
          ? generation.recipe.promptVersion
          : GENERATION_PROMPT_VERSION,
      provider: imageProvider.name.toUpperCase(),
      model: generation.model,
      status: 'GENERATING',
      stage: 'OPENAI_IMAGE_GENERATION',
      progress: GENERATION_STAGES.GENERATING.progress,
      startedAt: new Date(),
    });

    const response = await imageProvider.generate({
      requestId: input.requestId,
      model: generation.model,
      prompt,
      sourceImages,
      quality: qualityForProvider(generation.quality),
      size: sizeForProvider(generation),
      numberOfImages: generation.requestedImageCount,
    });

    generation = (await repository.getGenerationById(generation.id))!;
    if (generation.status === 'CANCELLED') {
      await safeRelease(repository, generation, 'Kullanıcı üretimi iptal etti.');
      return;
    }

    await setStage(repository, generation.id, 'POST_PROCESSING');
    for (const [index, image] of response.images.entries()) {
      if (
        image.bytes.length === 0 ||
        image.bytes.length > 30 * 1024 * 1024 ||
        !hasExpectedMagicBytes(image.bytes, image.mimeType)
      ) {
        throw new ApiError({
          statusCode: 502,
          code: 'PROVIDER_INVALID_OUTPUT',
          message: 'Görsel sağlayıcısı geçersiz çıktı döndürdü.',
        });
      }
      const extension =
        image.mimeType === 'image/webp' ? 'webp' : image.mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const key = `users/${generation.userId}/generations/${generation.id}/preview-${index + 1}.${extension}`;
      const asset = await repository.createAsset({
        ownerId: generation.userId,
        type: generation.quality === 'HD' ? 'GENERATION_FINAL' : 'GENERATION_PREVIEW',
        storageProvider: sourceAsset.storageProvider,
        storageKey: key,
        originalName: null,
        mimeType: image.mimeType,
        sizeBytes: image.bytes.length,
        sha256: null,
      });
      await storage.putObject({
        key,
        body: image.bytes,
        contentType: image.mimeType,
        metadata: { 'x-birkare-ai': 'generated' },
      });
      await repository.updateAsset(asset.id, { status: 'READY' });
      await repository.addGenerationOutput({
        generationId: generation.id,
        assetId: asset.id,
        variantIndex: index,
        selected: index === 0,
        watermarkApplied:
          localPolicy.watermarkRequired || Boolean(featuredPerson?.requiresWatermark),
        disclosureType: 'AI_GENERATED',
      });
    }

    await setStage(repository, generation.id, 'MODERATING_OUTPUT');
    await repository.captureCredits({
      userId: generation.userId,
      generationId: generation.id,
      amount: generation.reservedCredits,
    });
    await repository.updateGeneration(generation.id, {
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      providerRequestId: response.providerRequestId ?? null,
      providerUsage: response.usage ?? null,
      chargedCredits: generation.reservedCredits,
      completedAt: new Date(),
    });
    logger.info(
      {
        generationId: generation.id,
        requestId: input.requestId,
        outputCount: response.images.length,
      },
      'Generation tamamlandı.',
    );
  } catch (error) {
    const latest = await repository.getGenerationById(input.generationId);
    if (!latest || TERMINAL_GENERATION_STATUSES.has(latest.status)) return;
    const code = error instanceof ApiError ? error.code : 'GENERATION_PROVIDER_FAILURE';
    const userMessage =
      error instanceof ApiError && error.expose
        ? error.message
        : 'Görseliniz hazırlanırken bir sorun oluştu. Krediniz iade edildi.';
    const providerReference = error instanceof ApiError ? error.details?.providerRequestId : null;
    const safeProviderReference =
      typeof providerReference === 'string' && /^[a-zA-Z0-9_.:-]{1,160}$/.test(providerReference)
        ? providerReference
        : null;
    try {
      const failedGeneration = await repository.updateGeneration(latest.id, {
        status: code === 'MODERATION_BLOCKED' ? 'BLOCKED' : 'FAILED',
        stage:
          code === 'MODERATION_BLOCKED'
            ? error instanceof ApiError && error.details?.moderationStage === 'output'
              ? 'OUTPUT_MODERATION'
              : error instanceof ApiError && error.details?.moderationStage === 'input'
                ? 'INPUT_MODERATION'
                : 'MODERATION_PROVIDER'
            : 'FAILED',
        progress: 100,
        failureCode: code,
        // Keep the diagnostic reference on failed jobs as well as successful jobs.
        // Support can investigate without relying on ephemeral logs or attaching the photo.
        providerRequestId: safeProviderReference ?? latest.providerRequestId,
        failureMessage: userMessage.replace(
          /(?:ayrılan )?krediniz iade edildi\./gi,
          'Ayrılan kredinin iadesi tamamlanıyor.',
        ),
        failedAt: new Date(),
      });
      await settleFailedGeneration(repository, failedGeneration);
    } catch {
      logger.error(
        { generationId: input.generationId, requestId: input.requestId, code },
        'Generation başarısızlığı finalize edilemedi.',
      );
      // BullMQ must observe a failure and retry only persistence/refund work;
      // swallowing this error falsely acknowledges an unfinished job.
      throw new ApiError({
        statusCode: 503,
        code: 'GENERATION_FINALIZATION_FAILURE',
        message: 'Üretimin sonuç kaydı veya kredi iadesi tamamlanamadı.',
        expose: false,
      });
    }
    logger.error(
      {
        generationId: input.generationId,
        requestId: input.requestId,
        code,
        // Only the allowlisted provider metadata is retained, never raw SDK
        // errors, authorization headers, request bodies or user prompts.
        ...(error instanceof ApiError ? { provider: error.details } : {}),
      },
      'Generation worker hatası.',
    );
  }
}
