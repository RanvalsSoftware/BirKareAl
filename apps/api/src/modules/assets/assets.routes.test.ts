import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { MemoryRepository } from '@birkare/database';
import type { StorageProvider } from '@birkare/storage';
import type { ApiDependencies } from '../../services/dependencies.js';
import { TokenService } from '../../services/token.service.js';
import { createAssetsRouter } from './assets.routes.js';
import { createErrorMiddleware } from '../../middleware/error.middleware.js';

test('HTTP photo upload accepts exact ArrayBuffer bytes; MIME, ownership and revoked auth remain enforced', async () => {
  // Completely isolated account/storage. No real DB, uploads, queues or AI provider.
  const repository = new MemoryRepository();
  const objects = new Map<string, Buffer>();
  const storage: StorageProvider = {
    createDownloadUrl: async ({ key }) => `/test/${key}`,
    deleteObject: async (key) => {
      objects.delete(key);
    },
    createUploadUrl: async ({ key, contentType }) => ({
      url: `/test/${key}`,
      headers: { 'Content-Type': contentType },
    }),
    putObject: async ({ key, body }) => {
      objects.set(key, Buffer.from(body));
    },
    getObject: async (key) => objects.get(key)!,
    exists: async (key) => objects.has(key),
  };
  const tokenService = new TokenService({
    JWT_ACCESS_SECRET: 'test-only-access-secret-with-enough-length',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_ISSUER: 'https://api.example.test',
    JWT_USER_AUDIENCE: 'birkare-mobile',
  });
  async function account(email: string) {
    const initial = await repository.createUser({
      email,
      firstName: 'Upload',
      lastName: 'Test',
      passwordHash: 'unused',
      locale: 'tr-TR',
      dateOfBirth: new Date('1990-01-01'),
      consents: [],
    });
    const user = await repository.updateUser(initial.id, {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const session = await repository.createSession({
      userId: user.id,
      refreshTokenHash: email,
      expiresAt: new Date(Date.now() + 86400000),
    });
    return { user, session, ...(await tokenService.issueAccessToken(user, session.id)) };
  }
  const owner = await account('upload-owner@example.test');
  const stranger = await account('upload-stranger@example.test');
  const logger = { error() {}, warn() {} } as unknown as ApiDependencies['logger'];
  const app = express();
  app.use(express.json());
  app.use(
    '/v1',
    createAssetsRouter({
      repository,
      storage,
      tokenService,
      config: { STORAGE_DRIVER: 'local' },
    } as unknown as ApiDependencies),
  );
  app.use(createErrorMiddleware(logger, false));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const authorized = { Authorization: `Bearer ${owner.accessToken}` };
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);
  try {
    const initiate = await fetch(`${base}/v1/uploads/initiate`, {
      method: 'POST',
      headers: { ...authorized, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose: 'USER_SOURCE',
        fileName: 'test.png',
        mimeType: 'image/png',
        sizeBytes: bytes.byteLength,
      }),
    });
    assert.equal(initiate.status, 201);
    const { data } = (await initiate.json()) as {
      data: { uploadUrl: string; assetId: string; headers: Record<string, string> };
    };
    const badMime = await fetch(`${base}${data.uploadUrl}`, {
      method: 'PUT',
      headers: { ...authorized, 'Content-Type': 'application/octet-stream' },
      body: bytes.buffer,
    });
    assert.equal(badMime.status, 403);
    assert.equal(
      ((await badMime.json()) as { error: { code: string } }).error.code,
      'UPLOAD_BODY_REQUIRED',
    );
    const upload = await fetch(`${base}${data.uploadUrl}`, {
      method: 'PUT',
      headers: { ...authorized, ...data.headers },
      body: bytes.buffer,
    });
    assert.equal(upload.status, 200);
    const completed = await fetch(`${base}/v1/uploads/${data.assetId}/complete`, {
      method: 'POST',
      headers: authorized,
    });
    assert.equal(completed.status, 200);
    const download = await fetch(`${base}/v1/assets/${data.assetId}/content`, {
      headers: authorized,
    });
    assert.equal(download.status, 200);
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()), bytes);
    const denied = await fetch(`${base}/v1/assets/${data.assetId}/content`, {
      headers: { Authorization: `Bearer ${stranger.accessToken}` },
    });
    assert.equal(denied.status, 403);
    await repository.revokeSession(owner.session.id, 'TEST_LOGOUT');
    const revoked = await fetch(`${base}/v1/assets/${data.assetId}/content`, {
      headers: authorized,
    });
    assert.equal(revoked.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
