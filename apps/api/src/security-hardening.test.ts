import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import express from 'express';
import { loadConfig } from '@birkare/config';
import { MemoryRepository } from '@birkare/database';
import { ApiError } from '@birkare/shared';
import { createApp } from './app.js';
import { createErrorMiddleware } from './middleware/error.middleware.js';
import { authRateLimit } from './middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { createGenerationsRouter } from './modules/generations/generations.routes.js';
import { createProjectsRouter } from './modules/projects/projects.routes.js';
import type { ApiDependencies } from './services/dependencies.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';

async function withServer(app: express.Express, run: (base: string) => Promise<void>) {
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    server.close();
    await once(server, 'close');
  }
}

const production = {
  NODE_ENV: 'production',
  AUTH_DEV_MODE: 'false',
  AI_PROVIDER: 'disabled',
  DATABASE_PROVIDER: 'prisma',
  DATABASE_URL: 'postgresql://user:pass@db.internal:5432/app',
  QUEUE_DRIVER: 'bullmq',
  REDIS_URL: 'redis://redis.internal:6379',
  STORAGE_DRIVER: 'gcs',
  GCS_BUCKET: 'bucket-name',
  JWT_ISSUER: 'https://api.example.com',
  CORS_ORIGINS: 'https://app.example.com',
  JWT_ACCESS_SECRET: 'k3Vq9ZtB1xYw7Lm2Rp8Ns4Hd6Gf0Jc5Ua1Te3Wi9',
  PASSWORD_PEPPER: 'Qe7Ru2Ty9Ui4Op1As6Df3Gh8Jk5Lz0Xc7Vb2Nm4',
} as const;

describe('production configuration refuses unsafe values', () => {
  it('starts with a complete production environment', () => {
    assert.equal(loadConfig({ ...production }).NODE_ENV, 'production');
  });

  it('rejects the public development JWT secret and pepper', () => {
    const development = loadConfig({ NODE_ENV: 'development' });
    assert.throws(
      () => loadConfig({ ...production, JWT_ACCESS_SECRET: development.JWT_ACCESS_SECRET }),
      /geliştirme değerleri/,
    );
    assert.throws(
      () => loadConfig({ ...production, PASSWORD_PEPPER: development.PASSWORD_PEPPER }),
      /geliştirme değerleri/,
    );
  });

  it('never sends the RevenueCat secret key to a non-RevenueCat host', () => {
    assert.throws(
      () => loadConfig({ ...production, REVENUECAT_API_BASE_URL: 'https://evil.example/v1' }),
      /REVENUECAT_API_BASE_URL/,
    );
    assert.equal(
      loadConfig({ NODE_ENV: 'test', REVENUECAT_API_BASE_URL: 'http://stub:9000/v1/' })
        .REVENUECAT_API_BASE_URL,
      'http://stub:9000/v1',
    );
  });

  it('accepts a reverse-proxy hop count for TRUST_PROXY', () => {
    assert.equal(loadConfig({ NODE_ENV: 'test', TRUST_PROXY: '1' }).TRUST_PROXY, 1);
    assert.equal(loadConfig({ NODE_ENV: 'test', TRUST_PROXY: 'true' }).TRUST_PROXY, true);
    assert.equal(loadConfig({ NODE_ENV: 'test' }).TRUST_PROXY, false);
    assert.throws(() => loadConfig({ NODE_ENV: 'test', TRUST_PROXY: '0' }));
    assert.throws(() => loadConfig({ NODE_ENV: 'test', TRUST_PROXY: '10.0.0.0/8' }));
  });
});

describe('client IP and rate-limit keys', () => {
  it('with one trusted hop, a client-supplied X-Forwarded-For cannot choose the IP', async () => {
    const app = express();
    app.set('trust proxy', loadConfig({ NODE_ENV: 'test', TRUST_PROXY: '1' }).TRUST_PROXY);
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));
    await withServer(app, async (base) => {
      // The proxy appends the real peer; the attacker controls only the left part.
      const response = await fetch(`${base}/ip`, {
        headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' },
      });
      assert.equal(((await response.json()) as { ip: string }).ip, '203.0.113.9');
    });
  });

  it('auth limiter shares one bucket across path case and trailing slashes', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    const router = express.Router();
    router.post('/probe', authRateLimit, (_req, res) => res.json({ ok: true }));
    app.use('/v1/auth', router);
    await withServer(app, async (base) => {
      const variants = ['/probe', '/PROBE', '/Probe/', '/pRoBe'];
      const statuses: number[] = [];
      for (let index = 0; index < 22; index += 1) {
        const response = await fetch(`${base}/v1/auth${variants[index % variants.length]}`, {
          method: 'POST',
        });
        statuses.push(response.status);
      }
      assert.deepEqual(statuses.slice(0, 20), Array(20).fill(200));
      assert.deepEqual(statuses.slice(20), [429, 429]);
    });
  });
});

describe('error responses', () => {
  it('staging hides non-exposed error text exactly like production', async () => {
    const deps = {
      config: {
        ...loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'https://allowed.example' }),
        NODE_ENV: 'staging',
      },
      logger: { info() {}, warn() {}, error() {} },
      revenueCatService: {
        processWebhook: async () => {
          throw new ApiError({
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: 'pg host db-7.internal refused',
            expose: false,
          });
        },
      },
    } as unknown as ApiDependencies;
    const app = createApp(deps);
    await withServer(app, async (base) => {
      const response = await fetch(`${base}/v1/billing/revenuecat/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const text = await response.text();
      assert.equal(response.status, 500);
      assert.doesNotMatch(text, /db-7\.internal/);
    });
  });
});

describe('login timing', () => {
  it('spends Argon2 work for an address without a password account', async () => {
    const service = new PasswordService('timing-test-pepper-value-long-enough');
    let verifications = 0;
    const original = service.verify.bind(service);
    service.verify = async (hash, password) => {
      verifications += 1;
      return original(hash, password);
    };
    await service.verifyAgainstDummy('whatever-password-1');
    await service.verifyAgainstDummy('whatever-password-2');
    assert.equal(verifications, 2);
  });
});

describe('generation responses never deliver refunded or server-only data', () => {
  async function fixture() {
    const repository = new MemoryRepository();
    const tokenService = new TokenService({
      JWT_ACCESS_SECRET: 'hardening-tests-access-secret-long-enough',
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_ISSUER: 'https://api.example.test',
      JWT_USER_AUDIENCE: 'birkare-mobile',
    });
    const initial = await repository.createUser({
      email: 'hardening@example.test',
      firstName: null,
      lastName: null,
      passwordHash: 'unused',
      locale: 'tr-TR',
      dateOfBirth: null,
      consents: [],
    });
    const user = await repository.updateUser(initial.id, {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const session = await repository.createSession({
      userId: user.id,
      refreshTokenHash: 'hardening',
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const { accessToken } = await tokenService.issueAccessToken(user, session.id);
    const asset = async () => {
      const created = await repository.createAsset({
        id: randomUUID(),
        ownerId: user.id,
        type: 'GENERATION_PREVIEW',
        storageProvider: 'local',
        storageKey: `users/${user.id}/generations/${randomUUID()}/preview-1.png`,
        originalName: null,
        mimeType: 'image/png',
        sizeBytes: 10,
        sha256: null,
      });
      return repository.updateAsset(created.id, { status: 'READY' });
    };
    const source = await asset();
    const project = await repository.createProject({
      userId: user.id,
      mode: 'PRODUCT_STUDIO',
      title: 'Hardening',
      sourceAssetId: source.id,
    } as Parameters<MemoryRepository['createProject']>[0]);
    const generation = async (status: 'COMPLETED' | 'CANCELLED') => {
      const created = await repository.createGeneration({
        id: randomUUID(),
        userId: user.id,
        projectId: project.id,
        sourceAssetId: source.id,
        parentGenerationId: null,
        quality: 'STANDARD',
        requestedImageCount: 1,
        aspectRatio: '4:5',
        preserveFace: true,
        preserveClothes: true,
        recipe: null,
        userInstruction: null,
        compiledPrompt: 'SERVER SYSTEM PROMPT — never for clients',
        promptVersion: 'v-test',
        provider: 'FAKE',
        model: 'fake-image',
        reservedCredits: 3,
      } as Parameters<MemoryRepository['createGeneration']>[0]);
      const output = await asset();
      await repository.addGenerationOutput({
        generationId: created.id,
        assetId: output.id,
        variantIndex: 0,
        selected: true,
        watermarkApplied: false,
        disclosureType: 'AI_GENERATED',
      });
      await repository.updateGeneration(created.id, {
        status,
        providerRequestId: 'req_provider_internal',
      } as Parameters<MemoryRepository['updateGeneration']>[1]);
      return created.id;
    };
    const deps = {
      repository,
      tokenService,
      config: loadConfig({ NODE_ENV: 'test' }),
      storage: {},
    } as unknown as ApiDependencies;
    const app = express();
    app.use(express.json());
    app.use(requestIdMiddleware);
    app.use('/v1/projects', createProjectsRouter(deps));
    app.use('/v1/generations', createGenerationsRouter(deps));
    app.use(
      createErrorMiddleware({ error() {}, warn() {} } as unknown as ApiDependencies['logger'], true),
    );
    return { app, accessToken, project, generation };
  }

  it('a cancelled (refunded) generation exposes no output images; a completed one does', async () => {
    const f = await fixture();
    const cancelled = await f.generation('CANCELLED');
    const completed = await f.generation('COMPLETED');
    await withServer(f.app, async (base) => {
      const get = async (path: string) =>
        (
          (await (
            await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${f.accessToken}` } })
          ).json()) as { data: any }
        ).data;
      assert.deepEqual((await get(`/v1/generations/${cancelled}`)).outputs, []);
      assert.equal((await get(`/v1/generations/${completed}`)).outputs.length, 1);

      const detail = await get(`/v1/projects/${f.project.id}`);
      const list = await get(`/v1/projects/${f.project.id}/generations`);
      for (const items of [detail.generations, list.items] as any[][]) {
        assert.equal(items.length, 2);
        for (const item of items) {
          assert.equal('compiledPrompt' in item, false);
          assert.equal('providerRequestId' in item, false);
          assert.equal('providerUsage' in item, false);
          assert.equal(item.outputs.length, item.status === 'COMPLETED' ? 1 : 0);
        }
      }
      assert.doesNotMatch(JSON.stringify([detail, list]), /SERVER SYSTEM PROMPT|req_provider_internal/);
    });
  });
});
