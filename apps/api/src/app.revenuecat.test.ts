import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { loadConfig } from '@birkare/config';
import { forbidden } from '@birkare/shared';
import { createApp } from './app.js';
import type { ApiDependencies } from './services/dependencies.js';

test('RevenueCat webhook is reachable before broad mobile JWT middleware', async () => {
  let webhookCalls = 0;
  const deps = {
    config: loadConfig({ NODE_ENV: 'test' }),
    logger: { info() {}, warn() {}, error() {} },
    revenueCatService: {
      async processWebhook() {
        webhookCalls += 1;
        throw forbidden('REVENUECAT_WEBHOOK_UNAUTHORIZED', 'Webhook doğrulaması başarısız.');
      },
    },
  } as unknown as ApiDependencies;
  const server = createServer(createApp(deps));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const webhook = await fetch(`${base}/v1/billing/revenuecat/webhook`, {
      method: 'POST',
      headers: { authorization: 'invalid', 'content-type': 'application/json' },
      body: JSON.stringify({ event: { id: 'probe', app_user_id: 'nobody' } }),
    });
    const webhookBody = (await webhook.json()) as { error?: { code?: string } };
    assert.equal(webhook.status, 403);
    assert.equal(webhookBody.error?.code, 'REVENUECAT_WEBHOOK_UNAUTHORIZED');
    assert.equal(webhookCalls, 1);

    const sync = await fetch(`${base}/v1/billing/revenuecat/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const syncBody = (await sync.json()) as { error?: { code?: string } };
    assert.equal(sync.status, 401);
    assert.equal(syncBody.error?.code, 'AUTH_UNAUTHORIZED');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
