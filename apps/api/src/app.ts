import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request } from 'express';
import helmet from 'helmet';
import { errorEnvelope, forbidden, successEnvelope } from '@birkare/shared';
import { ACCOUNT_DELETION_RECOVERY_DAYS } from '@birkare/database';
import { EMAIL_REGISTRATION_POLICY } from './modules/auth/email-provider-policy.js';
import { AUTH_PROTOCOL_VERSION } from './services/auth-runtime.js';
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
    res.setHeader('X-BirKare-Auth-Protocol', AUTH_PROTOCOL_VERSION);
    const startedAt = performance.now();
    res.on('finish', () => {
      deps.logger.info({
        requestId: req.requestId, method: req.method, path: req.path,
        statusCode: res.statusCode, durationMs: Math.round(performance.now() - startedAt),
      }, 'HTTP request tamamlandı.');
    });
    next();
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // The public BirKare deletion page is part of the account lifecycle, not an
  // arbitrary third-party origin. Always trust exactly its configured origin
  // in addition to the general CORS allowlist so a production env omission
  // cannot break web account deletion with Safari's generic "Load failed".
  const allowedCorsOrigins = new Set(deps.config.CORS_ORIGINS);
  allowedCorsOrigins.add(new URL(deps.config.ACCOUNT_DELETION_WEB_URL).origin);

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins.has(origin)) return callback(null, true);
      return callback(forbidden('CORS_ORIGIN_DENIED', 'Bu kaynaktan gelen isteğe izin verilmiyor.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Platform', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-BirKare-Auth-Protocol'],
    maxAge: 600,
  }));
  app.use(express.json({
    limit: '1mb', strict: true,
    verify(req, _res, body) {
      const request = req as Request;
      if (request.originalUrl.split('?')[0] === '/v1/billing/revenuecat/webhook') request.rawBody = Buffer.from(body);
    },
  }));

  app.get('/health', (req, res) => {
    res.status(200).json(successEnvelope({
      status: 'ok', service: 'birkare-api', brand: deps.config.APP_NAME,
      authProtocol: AUTH_PROTOCOL_VERSION,
      emailRegistrationPolicy: EMAIL_REGISTRATION_POLICY,
      accountDeletionRecoveryDays: ACCOUNT_DELETION_RECOVERY_DAYS,
      repository: deps.repository?.kind ?? 'unknown',
    }, req.requestId));
  });
  app.get('/ready', async (req, res) => {
    const [repository, authSecurityStore, generationQueue] = await Promise.all([
      deps.repository.readiness(), deps.emailSecurityService.ready(), deps.generationQueue.ready(),
    ]);
    const ready = repository.ready && authSecurityStore && generationQueue;
    if (ready) res.status(200).json(successEnvelope({ status: 'ready', repository: deps.repository.kind }, req.requestId));
    else res.status(503).json(errorEnvelope({ code: 'NOT_READY', message: 'Servis henüz hazır değil.' }, req.requestId));
  });

  app.get('/v1', (req, res) => {
    res.status(200).json(successEnvelope({ name: deps.config.APP_NAME, version: 'v1', status: 'ok' }, req.requestId));
  });
  app.use('/v1/auth', createAuthRouter(deps));
  app.use('/v1/catalog', createCatalogRouter(deps));
  // Public billing webhooks must precede the broad asset authentication middleware.
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
