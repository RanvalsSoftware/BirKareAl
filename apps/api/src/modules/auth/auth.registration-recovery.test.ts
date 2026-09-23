import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { loadConfig } from '@birkare/config';
import { createRepository, MemoryRepository, type BirKareRepository } from '@birkare/database';
import { ApiError } from '@birkare/shared';
import { createApp } from '../../app.js';
import { AuthService } from './auth.service.js';
import { EmailSecurityService } from './email-security.service.js';
import { PasswordService } from '../../services/password.service.js';
import { TokenService } from '../../services/token.service.js';
import {
  DisabledMailService,
  type MailMessage,
  type MailService,
} from '../../services/mail.service.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { AUTH_PROTOCOL_VERSION } from '../../services/auth-runtime.js';

const consent = {
  termsAccepted: true, privacyAccepted: true, aiDisclosureAccepted: true,
  ageConfirmed: true, ownImageOrPermissionConfirmed: true,
} as const;
const codeIs = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;
const password = 'Recovery-password-2026';
const logger = { info() {}, warn() {}, error() {} } as unknown as ApiDependencies['logger'];

async function fixture(
  kind: 'memory' | 'prisma' = 'memory',
  domain = 'ranvals.com',
  mailService: MailService = new DisabledMailService(),
) {
  const id = randomUUID();
  const identity = { subject: `recovery-ci-${id}`, email: `recovery-ci-${id}@${domain}`, issuedAt: Math.floor(Date.now() / 1000) };
  const config = loadConfig({
    NODE_ENV: 'test', AUTH_DEV_MODE: 'true',
    ACCOUNT_DELETION_WEB_URL: 'http://localhost:3000/birkare/hesap-silme/',
    CORS_ORIGINS: 'http://localhost:3000',
    DATABASE_PROVIDER: kind,
    ...(kind === 'prisma' ? { DATABASE_URL: process.env.RECOVERY_TEST_DATABASE_URL! } : {}),
  });
  const repository: BirKareRepository = kind === 'memory'
    ? new MemoryRepository('isolated-recovery-test-secret')
    : await createRepository(config, logger);
  const passwordService = new PasswordService(config.PASSWORD_PEPPER);
  const tokenService = new TokenService(config);
  const emailSecurityService = await EmailSecurityService.create(config, {
    connectRedis: false, resolveMx: async () => [{ exchange: 'mx.fixture.invalid', priority: 10 }],
  });
  const authService = new AuthService(
    repository, passwordService, tokenService, config,
    { verify: async () => identity }, mailService, { verify: async () => identity }, emailSecurityService,
  );
  const deps = {
    config, repository, passwordService, tokenService, mailService, emailSecurityService, authService, logger,
    storage: { deleteObject: async () => undefined },
  } as unknown as ApiDependencies;
  return { ...deps, identity };
}

async function seed(f: Awaited<ReturnType<typeof fixture>>, provider: 'GOOGLE' | 'APPLE' = 'GOOGLE') {
  const user = await f.repository.createVerifiedSocialUser({
    email: f.identity.email, firstName: 'Recovery', lastName: 'Fixture', locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'), provider, providerAccountId: f.identity.subject,
    providerEmail: f.identity.email, consents: [],
  });
  await f.repository.updateUser(user.id, { passwordHash: await f.passwordService.hash(password) });
  return user;
}


class CaptureMail implements MailService {
  readonly enabled = true;
  readonly sent: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}

test('HTTP web deletion request reaches MailService and builds the local BirKare confirmation link', async (t) => {
  const mail = new CaptureMail();
  const f = await fixture('memory', 'gmail.com', mail);
  t.after(() => f.emailSecurityService.close());

  const user = await seed(f);
  assert.equal(user.status, 'ACTIVE');

  const server = createServer(createApp(f));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(
    `http://127.0.0.1:${address.port}/v1/auth/account-deletion/request`,
    {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: user.email }),
    },
  );

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  const payload = (await response.json()) as {
    success?: boolean;
    data?: { accepted?: boolean; developmentDeletionToken?: string };
  };
  assert.equal(payload.success, true);
  assert.equal(payload.data?.accepted, true);
  assert.ok(payload.data?.developmentDeletionToken);

  assert.equal(mail.sent.length, 1);
  const message = mail.sent[0]!;
  assert.equal(message.to, user.email);
  assert.equal(message.subject, 'BirKare AI — Hesap silme bağlantın');
  const linkLine = message.text.split('\n').find((line) => line.startsWith('http://localhost:3000/'));
  assert.ok(linkLine);
  const link = new URL(linkLine);
  assert.equal(link.pathname, '/birkare/hesap-silme/');
  assert.ok((link.searchParams.get('token') ?? '').length >= 40);
});

test('new password, Google and Apple accounts cannot bypass the known-provider policy', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const registration = {
    email: f.identity.email, password, firstName: 'Test', lastName: 'User',
    locale: 'tr-TR', dateOfBirth: '1990-01-01', consent,
  };
  await assert.rejects(f.authService.register(registration, {}), codeIs('EMAIL_PROVIDER_NOT_ALLOWED'));
  await assert.rejects(f.authService.googleLogin({ idToken: 'fixture-google-token' }, {}), codeIs('EMAIL_PROVIDER_NOT_ALLOWED'));
  await assert.rejects(f.authService.appleLogin({ idToken: 'fixture-apple-token' }, {}), codeIs('EMAIL_PROVIDER_NOT_ALLOWED'));
  assert.equal(await f.repository.getUserByEmail(f.identity.email), null);
});

test('a social registration handoff issued before the policy change is checked again on completion', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const { hashToken } = await import('@birkare/shared');
  const pendingToken = 'old-policy-handoff-'.padEnd(64, 'x');
  await f.repository.createPendingSocialLogin({
    tokenHash: hashToken(pendingToken), provider: 'GOOGLE', providerAccountId: f.identity.subject,
    providerEmail: f.identity.email, givenName: null, familyName: null,
    expiresAt: new Date(Date.now() + 60000),
  });
  await assert.rejects(f.authService.completeSocialRegistration({
    pendingToken, firstName: 'Test', lastName: 'User', locale: 'tr-TR', dateOfBirth: '1990-01-01', consent,
  }, {}), codeIs('EMAIL_PROVIDER_NOT_ALLOWED'));
  assert.equal(await f.repository.getUserByEmail(f.identity.email), null);
});

test('Gmail signup still requires OTP before activating the account or awarding welcome credit', async (t) => {
  const f = await fixture('memory', 'gmail.com');
  t.after(() => f.emailSecurityService.close());
  const result = await f.authService.register({
    email: f.identity.email, password, firstName: 'Test', lastName: 'User',
    locale: 'tr-TR', dateOfBirth: '1990-01-01', consent,
  }, {});
  const user = await f.repository.getUserByEmail(f.identity.email);
  assert.ok(user);
  assert.equal(user.status, 'PENDING_VERIFICATION');
  assert.equal((await f.repository.getWallet(user.id)).available, 0);
  assert.ok(result.developmentVerificationToken);
  await f.authService.verifyEmail(user.email, result.developmentVerificationToken);
  assert.equal((await f.repository.getUserById(user.id))?.status, 'ACTIVE');
  assert.ok((await f.repository.getWallet(user.id)).available > 0);
});

const kinds: Array<'memory' | 'prisma'> = process.env.RECOVERY_TEST_DATABASE_URL ? ['prisma'] : ['memory'];
for (const kind of kinds) {
  test(`${kind}: HTTP Google login -> DELETE -> recovery choice -> explicit restoration`, async (t) => {
    const f = await fixture(kind);
    t.after(async () => { await f.emailSecurityService.close(); await f.repository.disconnect(); });
    const user = await seed(f);
    const walletBefore = await f.repository.getWallet(user.id);
    const server = createServer(createApp(f));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => { server.closeAllConnections(); await new Promise<void>((done) => server.close(() => done())); });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const request = async (path: string, method = 'GET', body?: unknown, token?: string) => {
      const res = await fetch(base + path, {
        method, signal: AbortSignal.timeout(5000),
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, body: await res.json() as any };
    };
    const health = await request('/health');
    assert.equal(health.body.data.authProtocol, AUTH_PROTOCOL_VERSION);
    assert.equal(health.body.data.accountDeletionRecoveryDays, 30);
    const first = await request('/v1/auth/google', 'POST', { idToken: 'fixture-google-token' });
    assert.equal(first.status, 200);
    const oldToken = first.body.data.accessToken;
    assert.ok(oldToken);
    const deletion = await request('/v1/me', 'DELETE', { confirmation: 'HESABIMI SIL', password }, oldToken);
    assert.equal(deletion.status, 202, JSON.stringify(deletion.body));
    assert.equal(deletion.body.data.recoveryDays, 30);
    assert.equal((await f.repository.getUserById(user.id))?.status, 'DELETION_PENDING');
    assert.ok([401, 403].includes((await request('/v1/me', 'GET', undefined, oldToken)).status));
    const pending = await request('/v1/auth/google', 'POST', { idToken: 'fixture-google-token' });
    assert.equal(pending.status, 200, JSON.stringify(pending.body));
    assert.equal(pending.body.data.deletionRecoveryRequired, true);
    assert.equal(pending.body.data.recoveryDays, 30);
    assert.equal(pending.body.data.accessToken, undefined);
    assert.equal(pending.body.data.refreshToken, undefined);
    const again = await request('/v1/auth/google', 'POST', { idToken: 'fixture-google-token' });
    assert.equal(again.body.data.recoveryUntil, pending.body.data.recoveryUntil);
    assert.equal((await f.repository.getUserById(user.id))?.status, 'DELETION_PENDING');
    const restored = await request('/v1/auth/google', 'POST', { idToken: 'fixture-google-token', recoverDeletion: true });
    assert.equal(restored.status, 200, JSON.stringify(restored.body));
    assert.equal(restored.body.data.user.id, user.id);
    assert.equal(restored.body.data.user.status, 'ACTIVE');
    assert.equal(await f.repository.getAccountDeletion(user.id), null);
    assert.ok([401, 403].includes((await request('/v1/me', 'GET', undefined, oldToken)).status));
    assert.equal((await request('/v1/me', 'GET', undefined, restored.body.data.accessToken)).status, 200);
    assert.equal((await f.repository.getWallet(user.id)).lifetimeEarned, walletBefore.lifetimeEarned);
  });
}

test('Apple private relay can enter new-account registration and existing corporate Apple accounts can recover', async (t) => {
  const relay = await fixture('memory', 'privaterelay.appleid.com');
  const existing = await fixture();
  t.after(async () => { await relay.emailSecurityService.close(); await existing.emailSecurityService.close(); });
  const handoff = await relay.authService.appleLogin({ idToken: 'fixture-apple-token' }, {});
  assert.ok('needsProfileCompletion' in handoff);
  const user = await seed(existing, 'APPLE');
  await existing.repository.requestAccountDeletion(user.id);
  const pending = await existing.authService.appleLogin({ idToken: 'fixture-apple-token' }, {});
  assert.ok('deletionRecoveryRequired' in pending);
  const restored = await existing.authService.appleLogin({ idToken: 'fixture-apple-token', recoverDeletion: true }, {});
  assert.ok('user' in restored);
  if ('user' in restored) assert.equal(restored.user.id, user.id);
});

test('pending recovery cannot disclose a suspended account or reactivate it', async (t) => {
  const f = await fixture();
  t.after(() => f.emailSecurityService.close());
  const user = await seed(f);
  await f.repository.requestAccountDeletion(user.id);
  await f.repository.updateUser(user.id, { status: 'SUSPENDED' });
  for (const recoverDeletion of [false, true]) {
    await assert.rejects(f.authService.googleLogin({ idToken: 'fixture-google-token', recoverDeletion }, {}), codeIs('AUTH_ACCOUNT_SUSPENDED'));
  }
});
