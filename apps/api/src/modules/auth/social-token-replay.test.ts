import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { createHash } from 'node:crypto';
import { MemoryRepository } from '@birkare/database';
import { ApiError } from '@birkare/shared';
import { PasswordService } from '../../services/password.service.js';
import { TokenService } from '../../services/token.service.js';
import { AppleIdTokenService } from './apple-id-token.service.js';
import { AuthService } from './auth.service.js';
import { GoogleIdTokenService } from './google-id-token.service.js';
import { identityTokenReplayRef } from './identity-token-replay.js';

const codeIs = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' }],
});
const GOOGLE_AUDIENCE = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
const APPLE_BUNDLE = 'com.birkareai.mobile';
const now = () => Math.floor(Date.now() / 1000);
const sign = (claims: JWTPayload) =>
  new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(privateKey);

let serial = 0;
/** Like Google, every call mints a distinct token (own iat/jti) for the same person. */
const googleToken = (overrides: JWTPayload = {}) =>
  sign({
    sub: 'google-subject-1',
    email: 'birkare.fixture.social@gmail.com',
    email_verified: true,
    iss: 'https://accounts.google.com',
    aud: GOOGLE_AUDIENCE,
    iat: now(),
    exp: now() + 3600,
    jti: `google-jti-${(serial += 1)}`,
    ...overrides,
  });
const appleToken = (overrides: JWTPayload = {}) =>
  sign({
    sub: 'apple-subject-1',
    email: 'birkare.fixture.apple@icloud.com',
    email_verified: 'true',
    iss: 'https://appleid.apple.com',
    aud: APPLE_BUNDLE,
    iat: now(),
    exp: now() + 600,
    // Apple issues no jti: uniqueness comes from the signed content.
    c_hash: `c-${(serial += 1)}`,
    ...overrides,
  });

function fixture() {
  const repository = new MemoryRepository();
  const service = new AuthService(
    repository,
    new PasswordService('test-only-pepper-with-enough-length'),
    new TokenService({
      JWT_ACCESS_SECRET: 'test-only-access-secret-with-enough-length',
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_ISSUER: 'https://api.example.test',
      JWT_USER_AUDIENCE: 'birkare-mobile',
    }),
    { AUTH_DEV_MODE: true, NODE_ENV: 'test', REFRESH_TOKEN_TTL_DAYS: 30 },
    new GoogleIdTokenService(
      { GOOGLE_IOS_CLIENT_ID: GOOGLE_AUDIENCE, GOOGLE_WEB_CLIENT_ID: GOOGLE_AUDIENCE },
      jwks,
    ),
    undefined,
    new AppleIdTokenService({ APPLE_BUNDLE_ID: APPLE_BUNDLE }, jwks),
  );
  return { repository, service };
}

async function linkedUser(repository: MemoryRepository, provider: 'GOOGLE' | 'APPLE' = 'GOOGLE') {
  return repository.createVerifiedSocialUser({
    email:
      provider === 'GOOGLE'
        ? 'birkare.fixture.social@gmail.com'
        : 'birkare.fixture.apple@icloud.com',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    provider,
    providerAccountId: provider === 'GOOGLE' ? 'google-subject-1' : 'apple-subject-1',
    providerEmail: 'unused@example.test',
    consents: [],
  });
}

test('a Google ID token that issued a session cannot be replayed', async () => {
  const { repository, service } = fixture();
  const user = await linkedUser(repository);
  const idToken = await googleToken();

  const first = await service.googleLogin({ idToken }, {});
  assert.ok('accessToken' in first && first.user.id === user.id);

  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
  await assert.rejects(
    () => service.googleLogin({ idToken, recoverDeletion: true }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
  // The spent token stays out of the Apple namespace and other tokens still work.
  const next = await service.googleLogin({ idToken: await googleToken() }, {});
  assert.ok('accessToken' in next);
  assert.equal((await repository.listSessions(user.id)).length, 2);
});

test('two concurrent requests with one token yield exactly one session', async () => {
  const { repository, service } = fixture();
  const user = await linkedUser(repository);
  const idToken = await googleToken();

  const results = await Promise.allSettled(
    Array.from({ length: 6 }, () => service.googleLogin({ idToken }, {})),
  );

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  for (const result of results)
    if (result.status === 'rejected') assert.ok(codeIs('AUTH_INVALID_GOOGLE_TOKEN')(result.reason));
  assert.equal((await repository.listSessions(user.id)).length, 1);
});

test('a token that created a pending social registration cannot start a second one', async () => {
  const { service } = fixture();
  const idToken = await googleToken();

  const handoff = await service.googleLogin({ idToken }, {});
  assert.ok('needsProfileCompletion' in handoff);
  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );

  // Profile completion uses the opaque handoff, not the provider token.
  const session = await service.completeSocialRegistration(
    {
      pendingToken: handoff.pendingToken,
      firstName: 'Elif',
      lastName: 'Yılmaz',
      locale: 'tr-TR',
      dateOfBirth: '1990-01-01',
      consent: { termsAccepted: true, noticeAccepted: true },
    },
    {},
  );
  assert.ok(session.accessToken);
  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
});

test('deletion recovery still accepts the same token twice, then it is spent', async () => {
  const { repository, service } = fixture();
  const user = await linkedUser(repository);
  await repository.requestAccountDeletion(user.id);
  const idToken = await googleToken();

  const prompt = await service.googleLogin({ idToken }, {});
  assert.ok('deletionRecoveryRequired' in prompt);
  const promptAgain = await service.googleLogin({ idToken }, {});
  assert.ok('deletionRecoveryRequired' in promptAgain);
  assert.equal((await repository.listSessions(user.id)).length, 0);

  const restored = await service.googleLogin({ idToken, recoverDeletion: true }, {});
  assert.ok('accessToken' in restored);
  assert.equal(restored.user.status, 'ACTIVE');

  await assert.rejects(
    () => service.googleLogin({ idToken, recoverDeletion: true }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
});

test('a "link required" answer does not spend the token, so it can still be linked', async () => {
  const { repository, service } = fixture();
  const owner = await repository.createUser({
    email: 'birkare.fixture.social@gmail.com',
    passwordHash: 'unused',
    firstName: null,
    lastName: null,
    locale: 'tr-TR',
    dateOfBirth: null,
    consents: [],
  });
  await repository.updateUser(owner.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  const idToken = await googleToken();

  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED'),
  );
  assert.deepEqual(await service.linkGoogle(owner.id, { idToken }), { linked: true });
  // Now that the identity is linked the same token signs in once.
  assert.ok('accessToken' in (await service.googleLogin({ idToken }, {})));
  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
});

test('a request that fails after claiming the token releases it', async () => {
  const { repository, service } = fixture();
  const user = await linkedUser(repository);
  const idToken = await googleToken();
  const createSession = repository.createSession.bind(repository);
  let fail = true;
  repository.createSession = async (...args) => {
    if (fail) throw new Error('database unavailable');
    return createSession(...args);
  };

  await assert.rejects(() => service.googleLogin({ idToken }, {}), /database unavailable/);
  fail = false;
  const retried = await service.googleLogin({ idToken }, {});

  assert.ok('accessToken' in retried);
  assert.equal((await repository.listSessions(user.id)).length, 1);
});

test('Apple tokens are single-use too and keyed by their signed content', async () => {
  const { repository, service } = fixture();
  await linkedUser(repository, 'APPLE');
  const idToken = await appleToken();

  assert.ok('accessToken' in (await service.appleLogin({ idToken }, {})));
  await assert.rejects(
    () => service.appleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_APPLE_TOKEN'),
  );
  // Re-encoding the signature segment does not produce a "different" token.
  const [header, payload, signature] = idToken.split('.');
  assert.equal(
    identityTokenReplayRef(`${header}.${payload}.${signature}=`).key,
    identityTokenReplayRef(idToken).key,
  );
  assert.match(identityTokenReplayRef(idToken).key, /^sha256:[0-9a-f]{64}$/);
  assert.equal(identityTokenReplayRef(idToken, { jti: 'abc' }).key, 'jti:abc');
});

test('used-token records are kept until the token expires, then purged', async () => {
  const { repository, service } = fixture();
  await linkedUser(repository);
  const idToken = await googleToken({ exp: now() + 120 });
  await service.googleLogin({ idToken }, {});

  assert.equal(await repository.purgeConsumedIdentityTokens({ before: new Date(), limit: 100 }), 0);
  await assert.rejects(
    () => service.googleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_GOOGLE_TOKEN'),
  );
  assert.equal(
    await repository.purgeConsumedIdentityTokens({
      before: new Date(Date.now() + 121_000),
      limit: 100,
    }),
    1,
  );
});

test('Apple nonce: a token bound to a nonce needs the matching raw nonce', async () => {
  const { repository, service } = fixture();
  await linkedUser(repository, 'APPLE');
  const rawNonce = 'raw-nonce-generated-by-the-client-0123456789';
  const hashed = createHash('sha256').update(rawNonce).digest('hex');

  // Missing and wrong nonce are rejected and do not spend the token.
  const idToken = await appleToken({ nonce: hashed });
  await assert.rejects(
    () => service.appleLogin({ idToken }, {}),
    codeIs('AUTH_INVALID_APPLE_TOKEN'),
  );
  await assert.rejects(
    () => service.appleLogin({ idToken, nonce: 'another-nonce' }, {}),
    codeIs('AUTH_INVALID_APPLE_TOKEN'),
  );
  assert.ok('accessToken' in (await service.appleLogin({ idToken, nonce: rawNonce }, {})));

  // A client that hands Apple the raw nonce gets it echoed unhashed: also accepted.
  const rawClaim = await appleToken({ nonce: rawNonce });
  assert.ok(
    'accessToken' in (await service.appleLogin({ idToken: rawClaim, nonce: rawNonce }, {})),
  );

  // No nonce claim: behaves as before, with or without a body nonce.
  assert.ok('accessToken' in (await service.appleLogin({ idToken: await appleToken() }, {})));
  assert.ok(
    'accessToken' in
      (await service.appleLogin({ idToken: await appleToken(), nonce: rawNonce }, {})),
  );
});

test('Google sign-in never requires a nonce', async () => {
  const { repository, service } = fixture();
  await linkedUser(repository);

  const withClaim = await service.googleLogin(
    { idToken: await googleToken({ nonce: 'google-side-nonce' }) },
    {},
  );

  assert.ok('accessToken' in withClaim);
});
