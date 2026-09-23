import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { loadConfig } from '@birkare/config';
import { createApp } from './app.js';
import type { ApiDependencies } from './services/dependencies.js';

test('configured account-deletion web origin is always allowed by CORS', async () => {
  const deletionOrigin = 'https://ai.ranvals.com';
  const deps = {
    config: loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGINS: 'https://other.example',
      ACCOUNT_DELETION_WEB_URL: `${deletionOrigin}/birkare/hesap-silme/`,
    }),
    logger: { info() {}, warn() {}, error() {} },
  } as unknown as ApiDependencies;

  const server = createServer(createApp(deps));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;

    const allowed = await fetch(`${base}/v1/auth/account-deletion/request`, {
      method: 'OPTIONS',
      headers: {
        origin: deletionOrigin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), deletionOrigin);

    const configured = await fetch(`${base}/v1/auth/account-deletion/request`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://other.example',
        'access-control-request-method': 'POST',
      },
    });
    assert.equal(configured.status, 204);
    assert.equal(configured.headers.get('access-control-allow-origin'), 'https://other.example');

    const denied = await fetch(`${base}/v1/auth/account-deletion/request`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'POST',
      },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
