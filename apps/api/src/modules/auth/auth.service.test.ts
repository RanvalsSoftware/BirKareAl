import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MemoryRepository,
  WELCOME_CREDIT_AMOUNT,
  welcomeCreditIdempotencyKey,
} from '@birkare/database';
import type { SocialLoginInput, SocialProfileCompletionInput } from '@birkare/contracts';
import { ApiError, hashToken } from '@birkare/shared';
import { PasswordService } from '../../services/password.service.js';
import { TokenService } from '../../services/token.service.js';
import { AuthService } from './auth.service.js';
import type { GoogleIdentityVerifier, VerifiedGoogleIdentity } from './google-id-token.service.js';

class FakeGoogleIdentityVerifier implements GoogleIdentityVerifier {
  constructor(private readonly identity: VerifiedGoogleIdentity) {}

  async verify(): Promise<VerifiedGoogleIdentity> {
    return this.identity;
  }
}

const socialRegistration = {
  firstName: 'Elif',
  lastName: 'Yılmaz',
  locale: 'tr-TR',
  dateOfBirth: '1990-01-01',
  consent: {
    termsAccepted: true,
    privacyAccepted: true,
    aiDisclosureAccepted: true,
    ageConfirmed: true,
    ownImageOrPermissionConfirmed: true,
  },
} as const;

const socialInput = (): SocialLoginInput => ({
  idToken: 'test-google-id-token',
  platform: 'ios',
  deviceId: 'device-1',
});

const completionInput = (pendingToken: string): SocialProfileCompletionInput => ({
  pendingToken,
  ...socialRegistration,
  platform: 'ios',
  deviceId: 'device-1',
});

test('concurrent refresh-token reuse revokes the entire token family', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'refresh@example.test',
    passwordHash: 'unused',
    firstName: 'Test',
    lastName: 'User',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    consents: [],
  });
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  await repository.createSession({
    userId: user.id,
    refreshTokenHash: hashToken('original-refresh'),
    expiresAt: new Date(Date.now() + 60_000),
  });
  const service = createAuthService(repository, { subject: 'unused', email: user.email });
  const results = await Promise.allSettled([
    service.refresh({ refreshToken: 'original-refresh' }, {}),
    service.refresh({ refreshToken: 'original-refresh' }, {}),
  ]);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.ok((await repository.listSessions(user.id)).every((session) => session.revokedAt));
});

function createAuthService(
  repository: MemoryRepository,
  identity: VerifiedGoogleIdentity,
): AuthService {
  return new AuthService(
    repository,
    new PasswordService('test-only-pepper-with-enough-length'),
    new TokenService({
      JWT_ACCESS_SECRET: 'test-only-access-secret-with-enough-length',
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_ISSUER: 'https://api.example.test',
      JWT_USER_AUDIENCE: 'birkare-mobile',
    }),
    { AUTH_DEV_MODE: true, NODE_ENV: 'test', REFRESH_TOKEN_TTL_DAYS: 30 },
    new FakeGoogleIdentityVerifier(identity),
  );
}

test('issues an opaque handoff, then creates a verified Google user by immutable subject', async () => {
  const repository = new MemoryRepository();
  const service = createAuthService(repository, {
    subject: 'google-subject-123',
    email: 'elif@example.test',
    givenName: 'Elif',
    familyName: 'Yılmaz',
  });

  const handoff = await service.googleLogin(socialInput(), { ip: '127.0.0.1' });
  if (!('needsProfileCompletion' in handoff)) assert.fail('Expected profile completion handoff.');
  assert.equal(handoff.needsProfileCompletion, true);
  const first = await service.completeSocialRegistration(completionInput(handoff.pendingToken), {
    ip: '127.0.0.1',
  });
  await assert.rejects(
    () =>
      service.completeSocialRegistration(completionInput(handoff.pendingToken), {
        ip: '127.0.0.1',
      }),
    (error: unknown) =>
      error instanceof ApiError && error.code === 'AUTH_SOCIAL_PENDING_TOKEN_INVALID',
  );
  const second = await service.googleLogin(socialInput(), { ip: '127.0.0.1' });
  if (!('user' in second)) assert.fail('Expected a session for a linked Google account.');

  assert.equal(first.user.email, 'elif@example.test');
  assert.equal(first.user.emailVerified, true);
  assert.equal(first.user.status, 'ACTIVE');
  assert.equal(second.user.id, first.user.id);
  assert.notEqual(second.refreshToken, first.refreshToken);
  const socialConsents = await repository.listUserConsents(first.user.id);
  assert.equal(socialConsents.length, 5);
  assert.deepEqual(socialConsents.map((record) => record.type).sort(), [
    'AGE_CONFIRMATION',
    'AI_DISCLOSURE',
    'IMAGE_RIGHTS',
    'PRIVACY',
    'TERMS',
  ]);
  assert.ok(
    socialConsents.every(
      (record) => record.source === 'SOCIAL_REGISTRATION' && record.version === '2026-09-04',
    ),
  );
  assert.equal(
    (await repository.getUserByAuthAccount('GOOGLE', 'google-subject-123'))?.id,
    first.user.id,
  );
  const wallet = await repository.getWallet(first.user.id);
  const welcomeCredits = (await repository.listCreditTransactions(first.user.id)).filter(
    (transaction) => transaction.referenceType === 'WELCOME_CREDIT',
  );
  assert.equal(wallet.available, WELCOME_CREDIT_AMOUNT);
  assert.equal(wallet.lifetimeEarned, WELCOME_CREDIT_AMOUNT);
  assert.equal(welcomeCredits.length, 1);
  assert.equal(welcomeCredits[0]?.amount, WELCOME_CREDIT_AMOUNT);
  assert.equal(welcomeCredits[0]?.idempotencyKey, welcomeCreditIdempotencyKey(first.user.id));
});

test('password re-registration and repeated login cannot repeat the welcome grant', async () => {
  const repository = new MemoryRepository();
  const service = createAuthService(repository, {
    subject: 'unused-google-subject',
    email: 'unused@example.test',
  });

  const registrationInput = {
    email: 'password-registration@example.test',
    password: 'Password1234',
    firstName: 'Ece',
    lastName: 'Kaya',
    locale: 'tr-TR',
    dateOfBirth: '1990-01-01',
    consent: socialRegistration.consent,
  } as const;
  const registration = await service.register(registrationInput, {});
  const user = await repository.getUserByEmail('password-registration@example.test');
  assert.ok(user);
  assert.equal((await repository.getWallet(user.id)).available, 0);
  assert.deepEqual(await repository.listCreditTransactions(user.id), []);
  const consents = await repository.listUserConsents(user.id);
  assert.equal(consents.length, 5);
  assert.ok(
    consents.every(
      (record) => record.source === 'PASSWORD_REGISTRATION' && record.version === '2026-09-04',
    ),
  );

  await assert.rejects(
    () => service.register(registrationInput, {}),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_EMAIL_ALREADY_EXISTS',
  );
  assert.ok(registration.developmentVerificationToken);
  await service.verifyEmail(registrationInput.email, registration.developmentVerificationToken);
  await service.login(
    { email: registrationInput.email, password: registrationInput.password },
    { deviceId: 'first-install' },
  );
  await service.login(
    { email: registrationInput.email, password: registrationInput.password },
    { deviceId: 'after-onboarding-reset' },
  );

  const wallet = await repository.getWallet(user.id);
  const welcomeCredits = (await repository.listCreditTransactions(user.id)).filter(
    (transaction) => transaction.referenceType === 'WELCOME_CREDIT',
  );
  assert.equal(wallet.available, WELCOME_CREDIT_AMOUNT);
  assert.equal(wallet.lifetimeEarned, WELCOME_CREDIT_AMOUNT);
  assert.equal(welcomeCredits.length, 1);
  assert.equal(welcomeCredits[0]?.idempotencyKey, welcomeCreditIdempotencyKey(user.id));
});

test('purges expired pending social logins in bounded batches', async () => {
  const repository = new MemoryRepository();
  const before = new Date();
  await repository.createPendingSocialLogin({
    tokenHash: 'a'.repeat(64),
    provider: 'GOOGLE',
    providerAccountId: 'expired-subject-1',
    providerEmail: 'one@example.test',
    givenName: null,
    familyName: null,
    expiresAt: new Date(before.getTime() - 1_000),
  });
  await repository.createPendingSocialLogin({
    tokenHash: 'b'.repeat(64),
    provider: 'GOOGLE',
    providerAccountId: 'expired-subject-2',
    providerEmail: 'two@example.test',
    givenName: null,
    familyName: null,
    expiresAt: new Date(before.getTime() - 1_000),
  });

  assert.equal(await repository.purgePendingSocialLogins({ before, limit: 1 }), 1);
  assert.equal(await repository.purgePendingSocialLogins({ before, limit: 1 }), 1);
});

test('does not auto-link an ID token to an existing password account by e-mail', async () => {
  const repository = new MemoryRepository();
  await repository.createUser({
    email: 'elif@example.test',
    passwordHash: 'not-used-by-this-test',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    consents: [],
  });
  const service = createAuthService(repository, {
    subject: 'google-subject-123',
    email: 'elif@example.test',
  });

  await assert.rejects(
    () => service.googleLogin(socialInput(), {}),
    (error: unknown) =>
      error instanceof ApiError && error.code === 'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED',
  );
  assert.equal(await repository.getUserByAuthAccount('GOOGLE', 'google-subject-123'), null);
});

test('requires the authenticated account e-mail to match before linking Google', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'elif@example.test',
    passwordHash: 'not-used-by-this-test',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    consents: [],
  });
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  const service = createAuthService(repository, {
    subject: 'google-subject-123',
    email: 'elif@example.test',
  });

  await service.linkGoogle(user.id, { idToken: 'test-google-id-token' });
  assert.equal(
    (await repository.getUserByAuthAccount('GOOGLE', 'google-subject-123'))?.id,
    user.id,
  );
  await service.linkGoogle(user.id, { idToken: 'test-google-id-token' });
  assert.equal(
    (await repository.listCreditTransactions(user.id)).filter(
      (item) => item.referenceType === 'WELCOME_CREDIT',
    ).length,
    0,
  );
});

test('Google linking rejects a different email and unavailable accounts', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'owner@example.test',
    passwordHash: 'test-only',
    firstName: 'Test',
    lastName: 'User',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    consents: [],
  });
  await repository.grantCredits({
    userId: user.id,
    amount: WELCOME_CREDIT_AMOUNT,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: user.id,
    idempotencyKey: `test-fixture:${user.id}`,
  });
  await repository.updateUser(user.id, { status: 'ACTIVE', emailVerifiedAt: new Date() });
  const wrongEmail = createAuthService(repository, {
    subject: 'wrong-google-account',
    email: 'another@example.test',
  });
  await assert.rejects(
    () => wrongEmail.linkGoogle(user.id, socialInput()),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_SOCIAL_EMAIL_MISMATCH',
  );
  const matching = createAuthService(repository, {
    subject: 'matching-google-account',
    email: user.email,
  });
  for (const status of ['SUSPENDED', 'DELETION_PENDING', 'DELETED'] as const) {
    await repository.updateUser(user.id, { status });
    await assert.rejects(
      () => matching.linkGoogle(user.id, socialInput()),
      (error: unknown) =>
        error instanceof ApiError &&
        ['AUTH_ACCOUNT_SUSPENDED', 'AUTH_ACCOUNT_UNAVAILABLE'].includes(error.code),
    );
  }
  assert.equal(await repository.getUserByAuthAccount('GOOGLE', 'matching-google-account'), null);
});

test('old email verification and reset links cannot reactivate a deleted account', async () => {
  const repository = new MemoryRepository();
  const service = createAuthService(repository, {
    subject: 'unused',
    email: 'deleted@example.test',
  });
  const input = { ...socialRegistration, email: 'deleted@example.test', password: 'Password1234' };
  const registration = await service.register(input, {});
  const user = await repository.getUserByEmail(input.email);
  assert.ok(user);
  const reset = await service.forgotPassword(input.email);
  assert.ok(registration.developmentVerificationToken);
  assert.ok(reset.developmentResetToken);
  await repository.updateUser(user.id, { status: 'DELETION_PENDING', deletedAt: new Date() });
  await assert.rejects(
    () => service.verifyEmail(input.email, registration.developmentVerificationToken!),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_ACCOUNT_UNAVAILABLE',
  );
  await assert.rejects(
    () => service.resetPassword(reset.developmentResetToken!, 'Replacement1234'),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_ACCOUNT_UNAVAILABLE',
  );
  assert.equal((await repository.getUserById(user.id))?.status, 'DELETION_PENDING');
  assert.equal((await repository.getUserById(user.id))?.passwordHash, user.passwordHash);
  assert.deepEqual(await service.forgotPassword(input.email), {});
  assert.deepEqual(await service.resendVerification(input.email), {});
});

test('an Apple provider retry cannot create a second account welcome grant', async () => {
  const repository = new MemoryRepository();
  const appleUser = await repository.createVerifiedSocialUser({
    email: 'apple-user@example.test',
    firstName: 'Ada',
    lastName: 'Elma',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    provider: 'APPLE',
    providerAccountId: 'apple-subject-123',
    providerEmail: 'apple-user@example.test',
    consents: [],
  });

  await assert.rejects(
    () =>
      repository.createVerifiedSocialUser({
        email: 'apple-retry@example.test',
        firstName: 'Ada',
        lastName: 'Elma',
        locale: 'tr-TR',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        provider: 'APPLE',
        providerAccountId: 'apple-subject-123',
        providerEmail: 'apple-user@example.test',
        consents: [],
      }),
    (error: unknown) => error instanceof ApiError && error.code === 'AUTH_SOCIAL_ACCOUNT_CONFLICT',
  );

  assert.equal(await repository.getUserByEmail('apple-retry@example.test'), null);
  assert.equal((await repository.getWallet(appleUser.id)).available, WELCOME_CREDIT_AMOUNT);
  assert.equal(
    (await repository.listCreditTransactions(appleUser.id)).filter(
      (transaction) => transaction.referenceType === 'WELCOME_CREDIT',
    ).length,
    1,
  );
});

test('a retried generation reservation with the same key spends credits only once', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'idempotent-generation@example.test',
    passwordHash: 'not-used-by-this-test',
    firstName: 'Ece',
    lastName: 'Kaya',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    consents: [],
  });
  await repository.grantCredits({
    userId: user.id,
    amount: WELCOME_CREDIT_AMOUNT,
    type: 'BONUS',
    referenceType: 'TEST_FIXTURE',
    referenceId: user.id,
    idempotencyKey: `test-fixture:${user.id}`,
  });
  const request = {
    userId: user.id,
    generationId: 'generation-onboarding-1',
    amount: 3,
    idempotencyKey: 'onboarding-generation-request-1',
  };

  const first = await repository.reserveCredits(request);
  const retry = await repository.reserveCredits(request);
  assert.equal(retry.reservationId, first.reservationId);
  assert.equal(retry.wallet.available, WELCOME_CREDIT_AMOUNT - request.amount);
  assert.equal(retry.wallet.reserved, request.amount);
  assert.equal(
    (await repository.listCreditTransactions(user.id)).filter(
      (transaction) => transaction.type === 'GENERATION_RESERVATION',
    ).length,
    1,
  );

  await assert.rejects(
    () => repository.reserveCredits({ ...request, generationId: 'generation-onboarding-2' }),
    (error: unknown) => error instanceof ApiError && error.code === 'IDEMPOTENCY_KEY_REUSED',
  );
});
