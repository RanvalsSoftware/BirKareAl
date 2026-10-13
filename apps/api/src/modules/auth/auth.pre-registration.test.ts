import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { loadConfig } from '@birkare/config';
import { MemoryRepository } from '@birkare/database';
import { ApiError, hashToken } from '@birkare/shared';
import { createApp } from '../../app.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { DisabledMailService } from '../../services/mail.service.js';
import { PasswordService } from '../../services/password.service.js';
import { TokenService } from '../../services/token.service.js';
import { AuthService } from './auth.service.js';
import { EmailSecurityService } from './email-security.service.js';

const consent = { termsAccepted: true, noticeAccepted: true } as const;
const codeIs = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;
const EMAIL = 'birkare.fixture.victim@gmail.com';
const ATTACKER_PASSWORD = 'Attacker-password-2026';
const VICTIM_PASSWORD = 'Victim-password-2026';

const registration = (password: string, overrides: Record<string, unknown> = {}) => ({
  email: EMAIL,
  password,
  firstName: 'Ece',
  lastName: 'Kaya',
  locale: 'tr-TR',
  dateOfBirth: '1990-01-01',
  consent,
  ...overrides,
});

async function fixture() {
  const config = loadConfig({
    NODE_ENV: 'test',
    AUTH_DEV_MODE: 'true',
    DATABASE_PROVIDER: 'memory',
  });
  const repository = new MemoryRepository('pre-registration-test-secret');
  const passwordService = new PasswordService(config.PASSWORD_PEPPER);
  const tokenService = new TokenService(config);
  const mailService = new DisabledMailService();
  const emailSecurityService = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => [{ exchange: 'mx.fixture.invalid', priority: 10 }],
  });
  const unusedIdentity = { subject: 'unused', email: 'unused@gmail.com' };
  const authService = new AuthService(
    repository,
    passwordService,
    tokenService,
    config,
    { verify: async () => unusedIdentity },
    mailService,
    { verify: async () => unusedIdentity },
    emailSecurityService,
  );
  const logger = { info() {}, warn() {}, error() {} } as unknown as ApiDependencies['logger'];
  const deps = {
    config,
    repository,
    passwordService,
    tokenService,
    mailService,
    emailSecurityService,
    authService,
    logger,
  } as unknown as ApiDependencies;
  return { deps, repository, authService, emailSecurityService };
}

const login = (f: Awaited<ReturnType<typeof fixture>>, password: string) =>
  f.authService.login({ email: EMAIL, password }, {});

test('register returns an opaque registration token and stores only its hash', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());

  const result = await f.authService.register(registration(VICTIM_PASSWORD), {});

  assert.equal(result.verificationRequired, true);
  assert.match(result.registrationToken, /^[A-Za-z0-9_-]{43,}$/);
  assert.match(result.developmentVerificationToken ?? '', /^\d{6}$/);
  // The token is bound to the pending registration: verifying with it keeps the password.
  const verified = await f.authService.verifyEmail(
    EMAIL,
    result.developmentVerificationToken!,
    {},
    result.registrationToken,
  );
  assert.deepEqual(verified, { verified: true });
  const session = await login(f, VICTIM_PASSWORD);
  assert.equal(session.user.emailVerified, true);
  assert.ok(session.accessToken && session.refreshToken);
  assert.ok(
    !JSON.stringify(await f.repository.getUserByEmail(EMAIL)).includes(
      hashToken(result.registrationToken),
    ),
  );
});

test('pre-registration takeover: the victim verifies via resend and the attacker password is dead', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  // The attacker registers the victim's address with a password they know.
  const attacker = await f.authService.register(registration(ATTACKER_PASSWORD), {});
  const user = (await f.repository.getUserByEmail(EMAIL))!;
  // The victim later asks for a new code and verifies; they never registered here.
  const resent = await f.authService.resendVerification(EMAIL);
  assert.ok(resent.developmentVerificationToken);
  assert.equal('registrationToken' in resent, false);

  const verified = await f.authService.verifyEmail(EMAIL, resent.developmentVerificationToken!);

  assert.deepEqual(verified, { verified: true, passwordResetRequired: true });
  const after = (await f.repository.getUserById(user.id))!;
  assert.equal(after.status, 'ACTIVE');
  assert.ok(after.emailVerifiedAt);
  assert.equal(after.passwordHash, null);
  // Nobody can log in with the attacker's password; the state is not leaked.
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
  await assert.rejects(() => login(f, 'anything-else-1'), codeIs('AUTH_INVALID_CREDENTIALS'));
  // The attacker's registration token is useless afterwards too.
  await assert.rejects(
    () =>
      f.authService.verifyEmail(
        EMAIL,
        attacker.developmentVerificationToken!,
        {},
        attacker.registrationToken,
      ),
    codeIs('AUTH_INVALID_VERIFICATION_TOKEN'),
  );

  // The owner of the mailbox sets a password through the normal reset flow.
  const reset = await f.authService.forgotPassword(EMAIL);
  assert.ok(reset.developmentResetToken);
  await f.authService.resetPassword(reset.developmentResetToken!, VICTIM_PASSWORD);
  const session = await login(f, VICTIM_PASSWORD);
  assert.equal(session.user.id, user.id);
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
});

test('a wrong registration token clears the password exactly like a missing one', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const attacker = await f.authService.register(registration(ATTACKER_PASSWORD), {});
  await f.repository.createSession({
    userId: (await f.repository.getUserByEmail(EMAIL))!.id,
    refreshTokenHash: hashToken('pre-existing-session'),
    expiresAt: new Date(Date.now() + 60_000),
  });

  const verified = await f.authService.verifyEmail(
    EMAIL,
    attacker.developmentVerificationToken!,
    {},
    'not-the-registration-token',
  );

  assert.deepEqual(verified, { verified: true, passwordResetRequired: true });
  const user = (await f.repository.getUserByEmail(EMAIL))!;
  assert.equal(user.passwordHash, null);
  const sessions = await f.repository.listSessions(user.id);
  assert.equal(sessions.length, 1);
  assert.ok(sessions.every((session) => session.revokedAt));
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
});

test('re-registering over a pending account replaces it and answers like a first registration', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const attacker = await f.authService.register(
    registration(ATTACKER_PASSWORD, {
      firstName: 'Mallory',
      lastName: 'Evil',
      dateOfBirth: '1980-05-05',
    }),
    {},
  );
  const pending = (await f.repository.getUserByEmail(EMAIL))!;
  await f.repository.createSession({
    userId: pending.id,
    refreshTokenHash: hashToken('attacker-session'),
    expiresAt: new Date(Date.now() + 60_000),
  });
  const attackerConsents = await f.repository.listUserConsents(pending.id);

  const victim = await f.authService.register(registration(VICTIM_PASSWORD), {});

  assert.deepEqual(Object.keys(victim).sort(), Object.keys(attacker).sort());
  assert.notEqual(victim.registrationToken, attacker.registrationToken);
  const replaced = (await f.repository.getUserByEmail(EMAIL))!;
  assert.equal(replaced.id, pending.id);
  assert.equal(replaced.status, 'PENDING_VERIFICATION');
  assert.equal(replaced.firstName, 'Ece');
  assert.equal(replaced.lastName, 'Kaya');
  assert.equal(replaced.dateOfBirth?.toISOString().slice(0, 10), '1990-01-01');
  assert.notEqual(replaced.passwordHash, pending.passwordHash);
  const consents = await f.repository.listUserConsents(pending.id);
  assert.equal(consents.length, 2);
  assert.ok(consents.every((record) => !attackerConsents.some((old) => old.id === record.id)));
  assert.ok((await f.repository.listSessions(pending.id)).every((session) => session.revokedAt));

  // The attacker's code and token no longer verify anything.
  await assert.rejects(
    () =>
      f.authService.verifyEmail(
        EMAIL,
        attacker.developmentVerificationToken!,
        {},
        attacker.registrationToken,
      ),
    codeIs('AUTH_INVALID_VERIFICATION_TOKEN'),
  );
  assert.equal((await f.repository.getUserByEmail(EMAIL))!.status, 'PENDING_VERIFICATION');
  // The attacker's token with the victim's code cannot keep any password.
  // (Shown on a second address so this address can finish the happy path.)
  const verified = await f.authService.verifyEmail(
    EMAIL,
    victim.developmentVerificationToken!,
    {},
    victim.registrationToken,
  );
  assert.deepEqual(verified, { verified: true });
  assert.equal((await login(f, VICTIM_PASSWORD)).user.id, pending.id);
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
});

test('the previous registrant cannot keep a password by verifying the new code with the old token', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const first = await f.authService.register(registration(ATTACKER_PASSWORD), {});
  const second = await f.authService.register(registration(VICTIM_PASSWORD), {});

  const verified = await f.authService.verifyEmail(
    EMAIL,
    second.developmentVerificationToken!,
    {},
    first.registrationToken,
  );

  assert.deepEqual(verified, { verified: true, passwordResetRequired: true });
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
  await assert.rejects(() => login(f, VICTIM_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
});

test('resend-verification keeps the registration token valid', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const registered = await f.authService.register(registration(VICTIM_PASSWORD), {});
  const resent = await f.authService.resendVerification(EMAIL);
  assert.notEqual(resent.developmentVerificationToken, undefined);

  // The first code was replaced by the resend; the registration token was not.
  if (resent.developmentVerificationToken !== registered.developmentVerificationToken)
    await assert.rejects(
      () =>
        f.authService.verifyEmail(
          EMAIL,
          registered.developmentVerificationToken!,
          {},
          registered.registrationToken,
        ),
      codeIs('AUTH_INVALID_VERIFICATION_TOKEN'),
    );
  const verified = await f.authService.verifyEmail(
    EMAIL,
    resent.developmentVerificationToken!,
    {},
    registered.registrationToken,
  );

  assert.deepEqual(verified, { verified: true });
  assert.ok((await login(f, VICTIM_PASSWORD)).accessToken);
});

test('a verified address still answers 409 and is not modified by a new registration', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const registered = await f.authService.register(registration(VICTIM_PASSWORD), {});
  await f.authService.verifyEmail(
    EMAIL,
    registered.developmentVerificationToken!,
    {},
    registered.registrationToken,
  );
  const before = (await f.repository.getUserByEmail(EMAIL))!;

  await assert.rejects(
    () => f.authService.register(registration(ATTACKER_PASSWORD), {}),
    codeIs('AUTH_EMAIL_ALREADY_EXISTS'),
  );

  const after = (await f.repository.getUserByEmail(EMAIL))!;
  assert.equal(after.passwordHash, before.passwordHash);
  assert.ok((await login(f, VICTIM_PASSWORD)).accessToken);
  await assert.rejects(() => login(f, ATTACKER_PASSWORD), codeIs('AUTH_INVALID_CREDENTIALS'));
});

test('two concurrent first registrations leave one pending account bound to one of them', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());

  const [a, b] = await Promise.all([
    f.authService.register(registration(ATTACKER_PASSWORD), {}),
    f.authService.register(registration(VICTIM_PASSWORD), {}),
  ]);

  const user = (await f.repository.getUserByEmail(EMAIL))!;
  assert.equal(user.status, 'PENDING_VERIFICATION');
  const passwordService = f.deps.passwordService;
  const winner = (await passwordService.verify(user.passwordHash!, VICTIM_PASSWORD)) ? b : a;
  const loser = winner === a ? b : a;
  // Only the code issued last is valid; the registrant whose data was replaced
  // cannot keep a password with it.
  const codes = [a.developmentVerificationToken!, b.developmentVerificationToken!];
  let outcome: Awaited<ReturnType<AuthService['verifyEmail']>> | undefined;
  for (const code of codes) {
    try {
      outcome = await f.authService.verifyEmail(EMAIL, code, {}, loser.registrationToken);
      break;
    } catch (error) {
      assert.ok(codeIs('AUTH_INVALID_VERIFICATION_TOKEN')(error));
    }
  }
  assert.deepEqual(outcome, { verified: true, passwordResetRequired: true });
  assert.equal((await f.repository.getUserByEmail(EMAIL))!.passwordHash, null);
});

test('HTTP: register and verify-email response shapes for both verification outcomes', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const server = createServer(createApp(f.deps));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as any };
  };

  const first = await post('/v1/auth/register', registration(ATTACKER_PASSWORD));
  const second = await post('/v1/auth/register', registration(VICTIM_PASSWORD));
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.deepEqual(Object.keys(second.body.data).sort(), [
    'developmentVerificationToken',
    'registrationToken',
    'verificationRequired',
  ]);

  const matched = await post('/v1/auth/verify-email', {
    email: EMAIL,
    code: second.body.data.developmentVerificationToken,
    registrationToken: second.body.data.registrationToken,
  });
  assert.equal(matched.status, 200);
  assert.deepEqual(matched.body.data, { verified: true });
  const loggedIn = await post('/v1/auth/login', { email: EMAIL, password: VICTIM_PASSWORD });
  assert.equal(loggedIn.status, 200);
  assert.ok(loggedIn.body.data.accessToken);
  assert.equal(
    (await post('/v1/auth/register', registration(ATTACKER_PASSWORD))).body.error.code,
    'AUTH_EMAIL_ALREADY_EXISTS',
  );

  const other = 'second-birkare.fixture.victim@gmail.com';
  const pending = await post(
    '/v1/auth/register',
    registration(ATTACKER_PASSWORD, { email: other }),
  );
  const unmatched = await post('/v1/auth/verify-email', {
    email: other,
    code: pending.body.data.developmentVerificationToken,
  });
  assert.equal(unmatched.status, 200);
  assert.deepEqual(unmatched.body.data, { verified: true, passwordResetRequired: true });
  const denied = await post('/v1/auth/login', { email: other, password: ATTACKER_PASSWORD });
  assert.equal(denied.status, 401);
  assert.equal(denied.body.error.code, 'AUTH_INVALID_CREDENTIALS');
  const unknown = await post('/v1/auth/login', {
    email: 'birkare.fixture.nobody@gmail.com',
    password: ATTACKER_PASSWORD,
  });
  assert.deepEqual(
    { status: unknown.status, code: unknown.body.error.code, message: unknown.body.error.message },
    { status: denied.status, code: denied.body.error.code, message: denied.body.error.message },
  );
  const forgot = await post('/v1/auth/forgot-password', { email: other });
  assert.equal(forgot.status, 200);
  const reset = await post('/v1/auth/reset-password', {
    token: forgot.body.data.developmentResetToken,
    password: VICTIM_PASSWORD,
  });
  assert.deepEqual(reset.body.data, { passwordReset: true });
  assert.equal(
    (await post('/v1/auth/login', { email: other, password: VICTIM_PASSWORD })).status,
    200,
  );
  assert.equal(
    (await post('/v1/auth/login', { email: other, password: ATTACKER_PASSWORD })).status,
    401,
  );
});
