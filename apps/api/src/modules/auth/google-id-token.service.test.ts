import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { ApiError } from '@birkare/shared';
import { GoogleIdTokenService } from './google-id-token.service.js';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
const web = '123-web.apps.googleusercontent.com';
const ios = '123-ios.apps.googleusercontent.com';
const service = new GoogleIdTokenService(
  { GOOGLE_WEB_CLIENT_ID: web, GOOGLE_IOS_CLIENT_ID: ios },
  createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256' }] }),
);
const now = Math.floor(Date.now() / 1000);
async function token(overrides: JWTPayload = {}) {
  return new SignJWT({
    sub: 'immutable-google-subject',
    email: 'elif@example.test',
    email_verified: true,
    iss: 'https://accounts.google.com',
    aud: web,
    azp: ios,
    iat: now,
    exp: now + 3600,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(privateKey);
}

test('verifies signed Google identity and exposes trusted issue time for sensitive reauthentication', async () => {
  const identity = await service.verify(await token());
  assert.equal(identity.subject, 'immutable-google-subject');
  assert.equal(identity.email, 'elif@example.test');
  assert.equal(identity.issuedAt, now);
});

test('rejects foreign audience with a safe actionable configuration error', async () => {
  await assert.rejects(
    () => token({ aud: 'unrelated-app' }).then((value) => service.verify(value)),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_GOOGLE_CLIENT_MISMATCH',
  );
});

test('rejects foreign issuer, unauthorized party, absent subject and unverified email', async () => {
  for (const invalid of [
    { iss: 'https://attacker.example' },
    { azp: 'other-client' },
    { azp: 7 },
    { sub: '' },
    { email_verified: false },
    { email: 'not-an-email' },
    { aud: [web, ios], azp: undefined },
  ]) {
    await assert.rejects(
      () => token(invalid).then((value) => service.verify(value)),
      (error: unknown) => error instanceof ApiError && error.code === 'AUTH_INVALID_GOOGLE_TOKEN',
    );
  }
});

test('expired or too-old Google tokens cannot be replayed as a fresh login', async () => {
  for (const invalid of [{ exp: now - 30 }, { iat: now - 4000 }]) {
    await assert.rejects(
      () => token(invalid).then((value) => service.verify(value)),
      (error: unknown) => error instanceof ApiError && error.code === 'AUTH_GOOGLE_TOKEN_EXPIRED',
    );
  }
});

test('rejects unsigned or invalid-signature input without exposing its content', async () => {
  const valid = await token();
  const parts = valid.split('.');
  const tampered = `${parts[0]}.${parts[1]}.${'x'.repeat(parts[2]!.length)}`;
  await assert.rejects(
    () => service.verify(tampered),
    (error: unknown) =>
      error instanceof ApiError &&
      error.code === 'AUTH_INVALID_GOOGLE_TOKEN' &&
      !error.message.includes(tampered),
  );
});
