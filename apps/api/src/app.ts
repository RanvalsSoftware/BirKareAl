import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import { errorEnvelope, forbidden, successEnvelope } from '@birkare/shared';
import { createAssetsRouter } from './modules/assets/assets.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createBillingRouter } from './modules/billing/billing.routes.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { createGenerationsRouter } from './modules/generations/generations.routes.js';
import { createProjectsRouter } from './modules/projects/projects.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';
import { createSupportRouter } from './modules/support/support.routes.js';
import { createErrorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import type { ApiDependencies } from './services/dependencies.js';

export function createApp(deps: ApiDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', deps.config.TRUST_PROXY);

  app.use(requestIdMiddleware);
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => {
      deps.logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'HTTP request tamamlandı.',
      );
    });
    next();
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || deps.config.CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(
          forbidden('CORS_ORIGIN_DENIED', 'Bu kaynaktan gelen isteğe izin verilmiyor.'),
        );
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      // The shared mobile client sends X-Platform on every request. It must be
      // explicitly allowed for Expo Web preflight requests as well as native.
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'Idempotency-Key',
        'X-Platform',
        'X-Request-Id',
      ],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(
    express.json({
      limit: '1mb',
      strict: true,
      verify(req, _res, body) {
        const request = req as Request;
        if (request.originalUrl.split('?')[0] === '/v1/billing/revenuecat/webhook') {
          request.rawBody = Buffer.from(body);
        }
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res
      .status(200)
      .json(
        successEnvelope(
          { status: 'ok', service: 'birkare-api', brand: deps.config.APP_NAME },
          _req.requestId,
        ),
      );
  });
  app.get('/ready', async (_req, res) => {
    const [repository, authSecurityStore, generationQueue] = await Promise.all([
      deps.repository.readiness(),
      deps.emailSecurityService.ready(),
      deps.generationQueue.ready(),
    ]);
    const ready = repository.ready && authSecurityStore && generationQueue;
    const status = ready ? 200 : 503;
    if (ready)
      res
        .status(status)
        .json(
          successEnvelope(
            { status: 'ready', repository: deps.repository.kind },
            _req.requestId,
          ),
        );
    else
      res
        .status(status)
        .json(
          errorEnvelope(
            { code: 'NOT_READY', message: 'Servis henüz hazır değil.' },
            _req.requestId,
          ),
        );
  });

  app.get('/v1', (req, res) => {
    res
      .status(200)
      .json(
        successEnvelope({ name: deps.config.APP_NAME, version: 'v1', status: 'ok' }, req.requestId),
      );
  });
  app.use('/v1/auth', createAuthRouter(deps));
  app.use('/v1/catalog', createCatalogRouter(deps));
  // Billing owns a public RevenueCat webhook protected by its own secret.
  // Mount it before the broad /v1 asset router, whose auth middleware applies
  // to every request that reaches it rather than only to matched asset paths.
  app.use('/v1/billing', createBillingRouter(deps));
  app.use('/v1', createAssetsRouter(deps));
  app.use('/v1/projects', createProjectsRouter(deps));
  app.use('/v1/generations', createGenerationsRouter(deps));
  app.use('/v1/me', createUsersRouter(deps));
  app.use('/v1/support', createSupportRouter(deps));

  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(deps.logger, deps.config.NODE_ENV === 'production'));
  return app;
}
