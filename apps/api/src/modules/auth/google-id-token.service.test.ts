import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { loadConfig } from '@birkare/config';
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

const easAndroid = '123-eas.apps.googleusercontent.com';
const playAndroid = '123-play.apps.googleusercontent.com';
const thirdAndroid = '123-unlisted.apps.googleusercontent.com';
function androidService(value?: string) {
  return new GoogleIdTokenService(
    {
      GOOGLE_WEB_CLIENT_ID: web,
      GOOGLE_IOS_CLIENT_ID: ios,
      GOOGLE_ANDROID_CLIENT_ID: value,
    },
    createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256' }] }),
  );
}
const codeIs = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

test('both configured EAS and Play presenters authenticate with a Web audience; iOS is unchanged', async () => {
  const dual = androidService(`${playAndroid},${easAndroid}`);
  for (const azp of [easAndroid, playAndroid, ios, web]) {
    const identity = await dual.verify(await token({ aud: web, azp }));
    assert.equal(identity.subject, 'immutable-google-subject');
  }
  // Preserve the pre-existing behavior for explicitly configured native audiences.
  for (const aud of [easAndroid, playAndroid, ios]) {
    assert.equal((await dual.verify(await token({ aud, azp: aud }))).subject, 'immutable-google-subject');
  }
});

test('single and absent Android settings remain backward compatible; omitted clients gain no trust', async () => {
  const single = androidService(playAndroid);
  await single.verify(await token({ azp: playAndroid }));
  await single.verify(await token());
  await assert.rejects(() => token({ azp: easAndroid }).then((jwt) => single.verify(jwt)), codeIs('AUTH_INVALID_GOOGLE_TOKEN'));
  for (const empty of [undefined, '', '   ']) {
    const withoutAndroid = androidService(empty);
    await withoutAndroid.verify(await token());
    await assert.rejects(() => token({ azp: easAndroid }).then((jwt) => withoutAndroid.verify(jwt)), codeIs('AUTH_INVALID_GOOGLE_TOKEN'));
  }
});

test('Android allowlist trims and deduplicates exact IDs without accepting an unlisted same-project client', async () => {
  const dual = androidService(` ${playAndroid}, ${easAndroid} , ${playAndroid} `);
  await dual.verify(await token({ azp: easAndroid }));
  await dual.verify(await token({ azp: playAndroid }));
  for (const azp of [thirdAndroid, `${easAndroid}.attacker.example`, '123', `${easAndroid},${playAndroid}`]) {
    await assert.rejects(() => token({ azp }).then((jwt) => dual.verify(jwt)), codeIs('AUTH_INVALID_GOOGLE_TOKEN'));
  }
});

test('multiple Android clients do not bypass audience, issuer, signature, age or verified-email checks', async () => {
  const dual = androidService(`${playAndroid},${easAndroid}`);
  await assert.rejects(() => token({ aud: thirdAndroid, azp: easAndroid }).then((jwt) => dual.verify(jwt)), codeIs('AUTH_GOOGLE_CLIENT_MISMATCH'));
  for (const patch of [
    { iss: 'https://attacker.example', azp: easAndroid },
    { aud: [web, playAndroid], azp: undefined },
    { azp: 42 },
    { azp: easAndroid, email_verified: false },
  ]) {
    await assert.rejects(() => token(patch).then((jwt) => dual.verify(jwt)), codeIs('AUTH_INVALID_GOOGLE_TOKEN'));
  }
  await dual.verify(await token({ aud: [web, playAndroid], azp: easAndroid }));
  for (const patch of [{ exp: now - 30 }, { iat: now - 4000 }]) {
    await assert.rejects(() => token({ ...patch, azp: easAndroid }).then((jwt) => dual.verify(jwt)), codeIs('AUTH_GOOGLE_TOKEN_EXPIRED'));
  }
  const valid = await token({ azp: easAndroid });
  const parts = valid.split('.');
  const forged = `${parts[0]}.${parts[1]}.${'x'.repeat(parts[2]!.length)}`;
  await assert.rejects(() => dual.verify(forged), codeIs('AUTH_INVALID_GOOGLE_TOKEN'));
});

test('invalid or oversized Android allowlists fail closed without exposing their contents', () => {
  for (const value of [
    '*',
    '6C:73:69:5D:32:C6:91:32:40:64:19:E4:36:98:56:E3:DA:B7:C1:B0',
    `${playAndroid},`,
    `,${easAndroid}`,
    `${playAndroid},,${easAndroid}`,
    `${playAndroid},not-a-client-secret`,
    `${playAndroid};${easAndroid}`,
    `${playAndroid}\n${easAndroid}`,
    `${playAndroid},${easAndroid}.attacker.example`,
    Array.from({ length: 7 }, (_, i) => `123-client${i}.apps.googleusercontent.com`).join(','),
    `123-${'x'.repeat(512)}.apps.googleusercontent.com`,
  ]) {
    assert.throws(() => androidService(value), (error: unknown) =>
      error instanceof Error && error.message.startsWith('GOOGLE_ANDROID_CLIENT_ID ') && !error.message.includes(value),
    );
  }
});

test('shared backend config passes the comma-separated Android setting through to token verification', async () => {
  const configured = loadConfig({
    NODE_ENV: 'test',
    GOOGLE_WEB_CLIENT_ID: web,
    GOOGLE_IOS_CLIENT_ID: ios,
    GOOGLE_ANDROID_CLIENT_ID: `${playAndroid},${easAndroid}`,
  });
  assert.equal(configured.GOOGLE_ANDROID_CLIENT_ID, `${playAndroid},${easAndroid}`);
  const dual = new GoogleIdTokenService(
    configured,
    createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256' }] }),
  );
  await dual.verify(await token({ azp: easAndroid }));
  await dual.verify(await token({ azp: playAndroid }));
});
