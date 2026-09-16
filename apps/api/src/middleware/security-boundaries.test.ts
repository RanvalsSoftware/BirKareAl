import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import express from 'express';
import { loadConfig } from '@birkare/config';
import { createApp } from '../app.js';
import type { ApiDependencies } from '../services/dependencies.js';
import { billingSyncRateLimit } from './rate-limit.middleware.js';

async function withServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function boundaryApp() {
  const deps = {
    config: loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'https://allowed.example' }),
    logger: { info() {}, warn() {}, error() {} },
  } as unknown as ApiDependencies;
  return createApp(deps);
}

describe('HTTP security boundaries', () => {
  it('sets defensive headers, hides Express and sanitizes request IDs', async () => {
    await withServer(boundaryApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`, {
        headers: { 'x-request-id': '../../unsafe-header-value' },
      });
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-security-policy'));
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.match(response.headers.get('x-request-id') ?? '', /^req_[0-9a-f-]{36}$/);
    });
  });

  it('rejects untrusted CORS origins with a stable 403 envelope', async () => {
    await withServer(boundaryApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`, {
        headers: { origin: 'https://attacker.example' },
      });
      const body = (await response.json()) as { error?: { code?: string } };
      assert.equal(response.status, 403);
      assert.equal(body.error?.code, 'CORS_ORIGIN_DENIED');
    });
  });

  it('rejects malformed and oversized JSON before route handlers', async () => {
    await withServer(boundaryApp(), async (baseUrl) => {
      const malformed = await fetch(`${baseUrl}/v1/billing/revenuecat/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      });
      const malformedBody = (await malformed.json()) as { error?: { code?: string } };
      assert.equal(malformed.status, 400);
      assert.equal(malformedBody.error?.code, 'INVALID_JSON');

      const oversized = await fetch(`${baseUrl}/v1/billing/revenuecat/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: 'x'.repeat(1_050_000) }),
      });
      const oversizedBody = (await oversized.json()) as { error?: { code?: string } };
      assert.equal(oversized.status, 413);
      assert.equal(oversizedBody.error?.code, 'REQUEST_TOO_LARGE');
    });
  });

  it('rate-limits forced RevenueCat sync per authenticated user', async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.auth = {
        userId: req.header('x-test-user') ?? 'anonymous',
        sessionId: 'session-security-test',
        role: 'USER',
        email: 'security@example.test',
      };
      next();
    });
    app.post('/sync', billingSyncRateLimit, (_req, res) => res.status(200).json({ ok: true }));

    await withServer(app, async (baseUrl) => {
      for (let index = 0; index < 6; index += 1) {
        const response = await fetch(`${baseUrl}/sync`, {
          method: 'POST',
          headers: { 'x-test-user': 'user-security-a' },
        });
        assert.equal(response.status, 200);
      }
      const limited = await fetch(`${baseUrl}/sync`, {
        method: 'POST',
        headers: { 'x-test-user': 'user-security-a' },
      });
      const limitedBody = (await limited.json()) as { error?: { code?: string } };
      assert.equal(limited.status, 429);
      assert.equal(limitedBody.error?.code, 'BILLING_SYNC_RATE_LIMITED');

      const otherUser = await fetch(`${baseUrl}/sync`, {
        method: 'POST',
        headers: { 'x-test-user': 'user-security-b' },
      });
      assert.equal(otherUser.status, 200);
    });
  });
});

describe('production secret boundaries', () => {
  it('rejects a public RevenueCat key in the backend secret slot', () => {
    const production = {
      NODE_ENV: 'production',
      DATABASE_PROVIDER: 'prisma',
      DATABASE_URL: 'postgresql://app:password@db.example.test:5432/birkare',
      QUEUE_DRIVER: 'bullmq',
      REDIS_URL: 'redis://redis.example.test:6379',
      STORAGE_DRIVER: 'r2',
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_BUCKET: 'birkare-private',
      R2_ACCESS_KEY_ID: 'fixture-access-key',
      R2_SECRET_ACCESS_KEY: 'fixture-secret-key',
      JWT_ACCESS_SECRET: 'fixture-jwt-secret-at-least-32-characters',
      PASSWORD_PEPPER: 'fixture-password-pepper',
      AUTH_DEV_MODE: 'false',
      REVENUECAT_ENABLED: 'true',
      REVENUECAT_WEBHOOK_AUTH_TOKEN: 'fixture-webhook-token-at-least-24-characters',
      REVENUECAT_WEBHOOK_SIGNING_SECRET: 'fixture-webhook-signing-secret-at-least-32',
      REVENUECAT_SECRET_API_KEY: 'appl_public-key-must-not-run-on-server',
    } satisfies NodeJS.ProcessEnv;

    assert.throws(() => loadConfig(production), /Secret API key \(sk_\.\.\.\)/);
    assert.equal(
      loadConfig({ ...production, REVENUECAT_SECRET_API_KEY: 'sk_fixture-server-secret-key' })
        .REVENUECAT_ENABLED,
      true,
    );
  });
});
