import { Router } from 'express';
import { safeModerationCategories, tryGetStudioSelection } from '@birkare/ai';
import {
  CreateProjectSchema,
  GenerateProjectListingSchema,
  ProjectListQuerySchema,
  ProjectParamsSchema,
  UpdateProjectSchema,
  type GenerateProjectListingInput,
} from '@birkare/contracts';
import type { GenerationRecord, ProjectRecord } from '@birkare/database';
import {
  ApiError,
  conflict,
  forbidden,
  notFound,
  unavailable,
  type ProjectListing,
} from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { listingRateLimit } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, getRequestContext, sendSuccess } from '../../services/http.js';
import { communicationLanguage } from '../../services/request-language.js';

async function ownedProject(deps: ApiDependencies, userId: string, projectId: string) {
  const project = await deps.repository.getProjectById(projectId);
  if (!project || project.deletedAt) throw notFound('PROJECT_NOT_FOUND', 'Proje bulunamadı.');
  if (project.userId !== userId)
    throw forbidden('PROJECT_NOT_OWNED', 'Bu projeye erişim yetkiniz yok.');
  return project;
}

async function validateSelections(
  deps: ApiDependencies,
  input: {
    sceneTemplateId?: string | null;
    stylePresetId?: string | null;
    featuredPersonId?: string | null;
  },
) {
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
  if (
    input.featuredPersonId &&
    !catalog.featuredPeople.some(
      (item) =>
        item.id === input.featuredPersonId &&
        item.enabled &&
        item.isSelectable &&
        item.generationEnabled &&
        item.kind === 'FICTIONAL_CHARACTER' &&
        item.rightsStatus === 'FICTIONAL',
    )
  ) {
    throw forbidden('RIGHTS_NOT_ALLOWED', 'Bu kişi veya kullanım türü şu anda seçilemiyor.');
  }
}

/**
 * Text-only context for the listing writer. Category, scene and commerce goal
 * come from the latest server-resolved studio recipe, never from the client.
 */
function listingProduct(project: ProjectRecord, title: string, latest?: GenerationRecord) {
  const studio = latest?.recipe?.version === 2 ? latest.recipe.studio : null;
  // Labels come from the current catalog; a since-disabled selection keeps its ids.
  const plan = studio ? tryGetStudioSelection(studio) : null;
  const categoryId = studio?.kind === 'PRODUCT_STUDIO' ? studio.categoryId : null;
  return {
    title,
    mode: project.mode,
    categoryId,
    category: plan?.kind === 'PRODUCT_STUDIO' ? plan.categoryLabel : categoryId,
    scene:
      plan?.selectionLabel ??
      (studio ? (studio.kind === 'NAIL_PREVIEW' ? studio.presetId : studio.sceneId) : null),
    commerceGoal: studio?.taskType ?? null,
    userNote: latest?.userInstruction?.trim() || null,
  };
}

/**
 * Project screens receive the stored generation, minus what only the server
 * needs: the compiled model prompt and the provider's request/usage metadata.
 */
function clientGeneration(generation: GenerationRecord) {
  const {
    compiledPrompt: _compiledPrompt,
    providerRequestId: _providerRequestId,
    providerUsage: _providerUsage,
    ...visible
  } = generation;
  // Images of a refunded (cancelled/failed/blocked) job are not deliverable.
  return { ...visible, outputs: generation.status === 'COMPLETED' ? generation.outputs : [] };
}

export function createProjectsRouter(deps: ApiDependencies): Router {
  const router = Router();
  router.use(requireAuth(deps.tokenService, deps.repository));

  router.post(
    '/',
    validate(CreateProjectSchema),
    asyncHandler(async (req, res) => {
      if (req.body.sourceAssetId) {
        const asset = await deps.repository.getAssetById(req.body.sourceAssetId);
        if (!asset || asset.ownerId !== req.auth!.userId || asset.status !== 'READY')
          throw forbidden('PROJECT_SOURCE_INVALID', 'Kaynak görseliniz hazır değil.');
      }
      await validateSelections(deps, req.body);
      const project = await deps.repository.createProject({
        userId: req.auth!.userId,
        ...req.body,
        sourceAssetId: req.body.sourceAssetId ?? null,
        sceneTemplateId: req.body.sceneTemplateId ?? null,
        stylePresetId: req.body.stylePresetId ?? null,
        featuredPersonId: req.body.featuredPersonId ?? null,
        composition: req.body.composition ?? null,
      });
      sendSuccess(res, req.requestId, { project }, 201);
    }),
  );

  router.get(
    '/',
    validate(ProjectListQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const query = req.query as unknown as { cursor?: string; limit: number; favorite?: boolean };
      const page = await deps.repository.listProjects(req.auth!.userId, {
        cursor: query.cursor,
        limit: query.limit,
        favoriteOnly: query.favorite,
      });
      sendSuccess(res, req.requestId, page);
    }),
  );

  router.get(
    '/:projectId',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const project = await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      const generations = await deps.repository.listProjectGenerations(project.id);
      sendSuccess(res, req.requestId, {
        project,
        generations: generations.map(clientGeneration),
      });
    }),
  );

  router.patch(
    '/:projectId',
    validate(ProjectParamsSchema, 'params'),
    validate(UpdateProjectSchema),
    asyncHandler(async (req, res) => {
      await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      await validateSelections(deps, req.body);
      const project = await deps.repository.updateProject(req.params.projectId as string, req.body);
      sendSuccess(res, req.requestId, { project });
    }),
  );

  router.delete(
    '/:projectId',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      await deps.repository.updateProject(req.params.projectId as string, {
        status: 'DELETION_PENDING',
        deletedAt: new Date(),
      });
      sendSuccess(res, req.requestId, { deleted: true });
    }),
  );

  router.post(
    '/:projectId/favorite',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      const project = await deps.repository.updateProject(req.params.projectId as string, {
        isFavorite: true,
      });
      sendSuccess(res, req.requestId, { project });
    }),
  );
  router.delete(
    '/:projectId/favorite',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      const project = await deps.repository.updateProject(req.params.projectId as string, {
        isFavorite: false,
      });
      sendSuccess(res, req.requestId, { project });
    }),
  );

  router.post(
    '/:projectId/listing',
    listingRateLimit,
    validate(ProjectParamsSchema, 'params'),
    validate(GenerateProjectListingSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as GenerateProjectListingInput;
      const project = await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      const title = project.title?.trim();
      if (!title)
        throw conflict(
          'PROJECT_TITLE_REQUIRED',
          'Ürün metni yazabilmek için önce projeye bir başlık ekleyin.',
        );
      if (deps.listingCopyProvider.name === 'disabled')
        throw unavailable(
          'LISTING_DISABLED',
          'Ürün metni yazımı şu anda geçici olarak kullanılamıyor.',
        );
      const language =
        body.language ??
        getRequestContext(req).preferredLocale ??
        communicationLanguage((await deps.repository.getUserById(req.auth!.userId))?.locale) ??
        'tr';
      const tone = body.tone ?? 'neutral';
      const [latest] = await deps.repository.listProjectGenerations(project.id);
      const product = listingProduct(project, title, latest);

      // Seller text is checked before it reaches the text model. No image is sent.
      const moderation = await deps.moderationProvider.moderateText({
        text: [product.title, product.userNote].filter(Boolean).join('\n'),
        requestId: req.requestId,
      });
      if (moderation.flagged)
        throw new ApiError({
          statusCode: 422,
          code: 'MODERATION_BLOCKED',
          message:
            'Proje başlığı veya notu güvenlik kontrolünden geçemedi. Metni gözden geçirip tekrar deneyebilirsin.',
          details: {
            moderationStage: 'input',
            moderationCategories: safeModerationCategories(moderation.categories),
          },
        });

      const copy = await deps.listingCopyProvider.write({
        requestId: req.requestId,
        language,
        tone,
        product,
      });
      const listing: ProjectListing = {
        title: copy.title,
        description: copy.description,
        highlights: copy.highlights,
        hashtags: copy.hashtags,
        language,
        tone,
        generatedAt: new Date().toISOString(),
      };
      await deps.repository.updateProject(project.id, { listing });
      sendSuccess(res, req.requestId, { listing });
    }),
  );

  router.get(
    '/:projectId/generations',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const project = await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      sendSuccess(res, req.requestId, {
        items: (await deps.repository.listProjectGenerations(project.id)).map(clientGeneration),
      });
    }),
  );

  return router;
}
