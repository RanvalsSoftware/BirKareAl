import { Router } from 'express';
import { CatalogSearchQuerySchema, SlugParamsSchema } from '@birkare/contracts';
import { listStudioCatalog } from '@birkare/ai';
import { notFound } from '@birkare/shared';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

const enabled = <T extends { enabled: boolean }>(items: T[]) =>
  items.filter((item) => item.enabled);

export function createCatalogRouter(deps: ApiDependencies): Router {
  const router = Router();

  router.get(
    '/studio',
    asyncHandler(async (req, res) => {
      sendSuccess(res, req.requestId, listStudioCatalog());
    }),
  );

  router.get(
    '/home',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      sendSuccess(res, req.requestId, {
        brand: { name: deps.config.APP_NAME, slug: deps.config.APP_SLUG },
        hero: { title: 'BirKare AI', subtitle: 'Hayalindeki kareyi BirKare AI ile oluştur.' },
        sections: [
          {
            key: 'popular-scenes',
            title: 'Popüler Sahneler',
            items: enabled(catalog.scenes).slice(0, 6),
          },
          {
            key: 'popular-filters',
            title: 'Popüler Filtreler',
            items: enabled(catalog.filters).slice(0, 6),
          },
          {
            key: 'featured-people',
            title: 'Kurgusal Karakterler',
            items: enabled(catalog.featuredPeople).slice(0, 6),
          },
        ],
      });
    }),
  );

  router.get(
    '/search',
    validate(CatalogSearchQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const query = req.query as unknown as { q: string; limit: number };
      const q = query.q.toLocaleLowerCase('tr-TR');
      const catalog = await deps.repository.getCatalog();
      const matches = [
        ...catalog.scenes,
        ...catalog.filters,
        ...catalog.styles,
        ...catalog.featuredPeople,
      ]
        .filter(
          (item) =>
            item.enabled &&
            [item.name, item.category, ...(item.tags ?? [])].some((value) =>
              value.toLocaleLowerCase('tr-TR').includes(q),
            ),
        )
        .slice(0, query.limit);
      sendSuccess(res, req.requestId, { items: matches });
    }),
  );

  router.get(
    '/scenes',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      sendSuccess(res, req.requestId, { items: enabled(catalog.scenes) });
    }),
  );
  router.get(
    '/scenes/:slug',
    validate(SlugParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      const item = enabled(catalog.scenes).find((scene) => scene.slug === req.params.slug);
      if (!item) throw notFound('CATALOG_SCENE_NOT_FOUND', 'Sahne bulunamadı.');
      sendSuccess(res, req.requestId, item);
    }),
  );

  router.get(
    '/filters',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      sendSuccess(res, req.requestId, { items: enabled(catalog.filters) });
    }),
  );
  router.get(
    '/filters/:slug',
    validate(SlugParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      const item = enabled(catalog.filters).find((filter) => filter.slug === req.params.slug);
      if (!item) throw notFound('CATALOG_FILTER_NOT_FOUND', 'Filtre bulunamadı.');
      sendSuccess(res, req.requestId, item);
    }),
  );

  router.get(
    '/styles',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      sendSuccess(res, req.requestId, { items: enabled(catalog.styles) });
    }),
  );
  router.get(
    '/featured-people',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      // Fixtures intentionally contain only fictional, rights-safe examples. Real
      // public-figure records need a valid license record before being enabled.
      sendSuccess(res, req.requestId, {
        items: enabled(catalog.featuredPeople).filter(
          (person) => person.isSearchable && person.isSelectable && person.generationEnabled,
        ),
      });
    }),
  );
  router.get(
    '/featured-people/:slug',
    validate(SlugParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      const item = enabled(catalog.featuredPeople).find(
        (person) => person.slug === req.params.slug && person.isSearchable,
      );
      if (!item) throw notFound('CATALOG_PERSON_NOT_FOUND', 'Kişi bulunamadı.');
      sendSuccess(res, req.requestId, item);
    }),
  );
  router.get(
    '/categories',
    asyncHandler(async (req, res) => {
      const catalog = await deps.repository.getCatalog();
      const names = new Set(
        [...catalog.scenes, ...catalog.filters, ...catalog.styles, ...catalog.featuredPeople]
          .filter((item) => item.enabled)
          .map((item) => item.category),
      );
      sendSuccess(res, req.requestId, { items: [...names].map((name) => ({ name })) });
    }),
  );

  return router;
}
