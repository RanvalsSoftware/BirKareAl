import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { ApiError } from '@birkare/shared';
import { AppleIdTokenService } from './apple-id-token.service.js';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
const bundleId = 'com.birkareai.mobile';
const service = new AppleIdTokenService(
  { APPLE_BUNDLE_ID: bundleId },
  createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'apple-test-key', alg: 'RS256' }] }),
);
const now = Math.floor(Date.now() / 1000);

async function token(overrides: JWTPayload = {}) {
  return new SignJWT({
    sub: 'immutable-apple-subject',
    email: 'private-relay@privaterelay.appleid.com',
    email_verified: 'true',
    iss: 'https://appleid.apple.com',
    aud: bundleId,
    iat: now,
    exp: now + 600,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'apple-test-key' })
    .sign(privateKey);
}

test('verifies an Apple identity using issuer, bundle audience, signature and email', async () => {
  const identity = await service.verify(await token());
  assert.equal(identity.subject, 'immutable-apple-subject');
  assert.equal(identity.email, 'private-relay@privaterelay.appleid.com');
  assert.equal(identity.issuedAt, now);
});

test('rejects a foreign bundle, issuer, missing subject and unverified email', async () => {
  for (const invalid of [
    { aud: 'com.attacker.app' },
    { iss: 'https://attacker.example' },
    { sub: '' },
    { email_verified: 'false' },
    { email: 'invalid' },
  ]) {
    await assert.rejects(
      () => token(invalid).then((value) => service.verify(value)),
      (error: unknown) => error instanceof ApiError && error.code.startsWith('AUTH_'),
    );
  }
});

test('fails closed when Apple bundle identity is missing', async () => {
  const disabled = new AppleIdTokenService({});
  await assert.rejects(
    () => disabled.verify('not-a-token'),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_APPLE_NOT_CONFIGURED',
  );
});
