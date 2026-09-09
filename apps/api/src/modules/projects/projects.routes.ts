import { Router } from 'express';
import {
  CreateProjectSchema,
  ProjectListQuerySchema,
  ProjectParamsSchema,
  UpdateProjectSchema,
} from '@birkare/contracts';
import { forbidden, notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

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
      sendSuccess(res, req.requestId, { project, generations });
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

  router.get(
    '/:projectId/generations',
    validate(ProjectParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const project = await ownedProject(deps, req.auth!.userId, req.params.projectId as string);
      sendSuccess(res, req.requestId, {
        items: await deps.repository.listProjectGenerations(project.id),
      });
    }),
  );

  return router;
}
