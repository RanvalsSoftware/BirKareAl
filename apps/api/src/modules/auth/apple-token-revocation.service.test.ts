import assert from 'node:assert/strict';
import test from 'node:test';
import { exportPKCS8, generateKeyPair } from 'jose';
import { ApiError } from '@birkare/shared';
import { AppleTokenRevocationService } from './apple-token-revocation.service.js';

const config = {
  APPLE_BUNDLE_ID: 'com.birkareai.mobile',
  APPLE_TEAM_ID: 'A1B2C3D4E5',
  APPLE_KEY_ID: 'F6G7H8J9K0',
  APPLE_PRIVATE_KEY_FILE: '/run/secrets/apple-signin-private-key',
};

test('exchanges a fresh Apple authorization code and revokes the returned refresh token', async () => {
  const { privateKey } = await generateKeyPair('ES256');
  const pem = await exportPKCS8(privateKey);
  const calls: Array<{ url: string; body: URLSearchParams }> = [];
  const request = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body as URLSearchParams });
    if (url.endsWith('/auth/token'))
      return new Response(JSON.stringify({ refresh_token: 'apple-refresh-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    return new Response(null, { status: 200 });
  };
  const service = new AppleTokenRevocationService(config, request as typeof fetch, async () => pem);
  await service.revoke('fresh-authorization-code');
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.body.get('code'), 'fresh-authorization-code');
  assert.equal(calls[0]?.body.get('client_id'), config.APPLE_BUNDLE_ID);
  assert.equal(calls[1]?.body.get('token'), 'apple-refresh-token');
  assert.equal(calls[1]?.body.get('token_type_hint'), 'refresh_token');
  assert.ok(calls.every((call) => call.body.get('client_secret')?.split('.').length === 3));
});

test('fails closed when Apple credentials or revocation are unavailable', async () => {
  const missing = new AppleTokenRevocationService(
    {},
    async () => new Response(null, { status: 200 }),
  );
  await assert.rejects(
    () => missing.revoke('fresh-code'),
    (error: unknown) =>
      error instanceof ApiError && error.code === 'AUTH_APPLE_REVOCATION_NOT_CONFIGURED',
  );

  const { privateKey } = await generateKeyPair('ES256');
  const pem = await exportPKCS8(privateKey);
  const rejected = new AppleTokenRevocationService(
    config,
    async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    async () => pem,
  );
  await assert.rejects(
    () => rejected.revoke('expired-code'),
    (error: unknown) =>
      error instanceof ApiError && error.code === 'AUTH_APPLE_REVOCATION_UNAVAILABLE',
  );
});
