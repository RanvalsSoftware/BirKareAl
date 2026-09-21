import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '@birkare/config';
import { VerifyEmailSchema } from '@birkare/contracts';
import { MemoryRepository } from '@birkare/database';
import { ApiError, hashToken } from '@birkare/shared';
import { AuthService } from '../modules/auth/auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import {
  authMail,
  createMailService,
  DisabledMailService,
  SmtpMailService,
  smtpTransportOptions,
  type MailMessage,
  type MailService,
  type MailTransport,
} from './mail.service.js';

const smtpFixture = {
  MAIL_DRIVER: 'smtp',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'sender@example.test',
  SMTP_PASSWORD: 'fixture-app-password-never-used',
  MAIL_FROM_EMAIL: 'sender@example.test',
  MAIL_FROM_NAME: 'BirKare AI',
};

test('SMTP config requires credentials and rejects unsafe port/TLS combinations', () => {
  const config = loadConfig(smtpFixture);
  assert.equal(config.SMTP_PORT, 587);
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM_EMAIL']) {
    const values: NodeJS.ProcessEnv = { ...smtpFixture };
    delete values[key];
    assert.throws(() => loadConfig(values), /zorunludur/);
  }
  assert.throws(() => loadConfig({ ...smtpFixture, SMTP_PORT: '465' }), /SMTP_SECURE=true/);
  assert.throws(() => loadConfig({ ...smtpFixture, SMTP_SECURE: 'true' }), /SMTP_SECURE=false/);
  assert.throws(() => loadConfig({ ...smtpFixture, SMTP_PORT: '25' }), /SMTP_PORT/);
  assert.throws(() =>
    loadConfig({ ...smtpFixture, MAIL_FROM_NAME: 'Name\r\nBcc: victim@example.test' }),
  );
  assert.throws(() => loadConfig({ EXPO_PUBLIC_SMTP_PASSWORD: 'fixture' }), /server environment/);
  assert.equal(loadConfig({}).MAIL_DRIVER, 'disabled');
});

test('transport enforces TLS validation, bounded timeouts and disables data fetching/debug output', () => {
  const options = smtpTransportOptions(loadConfig(smtpFixture));
  assert.equal(options.requireTLS, true);
  assert.equal(options.ignoreTLS, false);
  assert.equal(options.opportunisticTLS, false);
  assert.deepEqual(options.tls, { rejectUnauthorized: true, minVersion: 'TLSv1.2' });
  for (const key of [
    'connectionTimeout',
    'greetingTimeout',
    'socketTimeout',
    'dnsTimeout',
  ] as const) {
    assert.ok(options[key] > 0 && options[key] <= 15_000);
  }
  assert.equal(options.debug, false);
  assert.equal(options.logger, false);
  assert.equal(options.transactionLog, false);
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(options.maxRecipients, 1);
  const encrypted = smtpTransportOptions(
    loadConfig({ ...smtpFixture, SMTP_PORT: '465', SMTP_SECURE: 'true' }),
  );
  assert.equal(encrypted.secure, true);
  assert.equal(encrypted.requireTLS, false);
});

test('mail delivery fixes the sender, accepts only the intended recipient and prevents header injection', async () => {
  const sent: Parameters<MailTransport['sendMail']>[0][] = [];
  const transport: MailTransport = {
    async sendMail(message) {
      sent.push(message);
      return { accepted: [message.to], rejected: [] };
    },
  };
  const mail = new SmtpMailService(loadConfig(smtpFixture), transport);
  await mail.send({
    to: 'recipient@example.test',
    replyTo: 'reply@example.test',
    subject: 'Support',
    text: 'Hello',
  });
  assert.deepEqual(sent[0]!.from, { name: 'BirKare AI', address: 'sender@example.test' });
  assert.equal(sent[0]!.disableFileAccess, true);
  assert.equal(sent[0]!.disableUrlAccess, true);
  await assert.rejects(
    () =>
      mail.send({
        to: 'recipient@example.test',
        subject: 'Subject\r\nBcc: victim@example.test',
        text: 'Hello',
      }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
  await assert.rejects(
    () =>
      mail.send({
        to: 'recipient@example.test,victim@example.test',
        subject: 'Subject',
        text: 'Hello',
      }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
  assert.equal(sent.length, 1);
  const rejected = new SmtpMailService(loadConfig(smtpFixture), {
    async sendMail() {
      return { accepted: [], rejected: ['recipient@example.test'] };
    },
  });
  await assert.rejects(
    () => rejected.send({ to: 'recipient@example.test', subject: 'Subject', text: 'Hello' }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
});

test('SMTP exceptions cannot leak credentials, recipient, token or raw server response', async () => {
  const events: unknown[] = [];
  const sensitive = 'smtp-password recipient@example.test token-secret raw-server-response';
  const mail = new SmtpMailService(
    loadConfig(smtpFixture),
    {
      async sendMail() {
        throw new Error(sensitive);
      },
    },
    {
      warn(...args: unknown[]) {
        events.push(args);
      },
    } as any,
  );
  await assert.rejects(
    () => mail.send({ to: 'recipient@example.test', subject: 'Auth', text: 'token-secret' }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, 'MAIL_DELIVERY_UNAVAILABLE');
      assert.equal(error.expose, true);
      assert.equal(error.details, undefined);
      assert.equal(error.cause, undefined);
      assert.ok(!error.message.includes(sensitive));
      return true;
    },
  );
  const log = JSON.stringify(events);
  for (const term of sensitive.split(' ')) assert.ok(!log.includes(term));
});

test('disabled mail transport fails closed without opening a network connection', async () => {
  const mail = createMailService(loadConfig({}));
  assert.equal(mail.enabled, false);
  await assert.rejects(
    () => mail.send({ to: 'recipient@example.test', subject: 'Auth', text: 'Code' }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
});

test('auth emails contain escaped app links and copyable one-time codes', () => {
  for (const kind of ['verification', 'password-reset'] as const) {
    const token = kind === 'verification' ? '042179' : 'abc_DEF-123';
    const message = authMail({ kind, email: 'recipient+test@example.test', token });
    const url = new URL(
      message.text
        .split('\n')
        .find((line) => line.startsWith('Uygulamayı'))!
        .replace('Uygulamayı açmak için: ', ''),
    );
    assert.equal(url.protocol, 'birkareai:');
    assert.equal(url.host, kind === 'verification' ? 'verify-email' : 'reset-password');
    assert.equal(url.searchParams.get(kind === 'verification' ? 'code' : 'token'), token);
    assert.ok(message.text.includes(token));
    assert.ok(message.text.includes(kind === 'verification' ? '10 dakika' : '1 saat'));
    assert.equal(message.to, 'recipient+test@example.test');
  }
  assert.throws(
    () =>
      authMail({
        kind: 'verification',
        email: 'recipient@example.test',
        token: '12345',
      }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
  assert.throws(
    () =>
      authMail({
        kind: 'verification',
        email: 'recipient@example.test',
        token: 'x',
        scheme: 'https://evil.example',
      }),
    { code: 'MAIL_DELIVERY_UNAVAILABLE' },
  );
});

test('verification API contract requires an e-mail-scoped six-digit numeric code', () => {
  assert.deepEqual(VerifyEmailSchema.parse({ email: ' USER@Example.Test ', code: '042179' }), {
    email: 'user@example.test',
    code: '042179',
  });
  for (const body of [
    { code: '042179' },
    { email: 'user@example.test', code: '42179' },
    { email: 'user@example.test', code: '0421790' },
    { email: 'user@example.test', code: '04A179' },
    { email: 'user@example.test', token: '042179' },
  ]) {
    assert.equal(VerifyEmailSchema.safeParse(body).success, false);
  }
});

class FakeMail implements MailService {
  readonly enabled = true;
  sent: MailMessage[] = [];
  fail = false;
  async send(message: MailMessage) {
    if (this.fail) throw new Error('fixture-smtp-failure');
    this.sent.push(message);
  }
}

function authFixture(mail: MailService = new FakeMail(), development = false) {
  const repository = new MemoryRepository();
  const passwordService = new PasswordService('fixture-long-enough-test-pepper');
  const service = new AuthService(
    repository,
    passwordService,
    new TokenService({
      JWT_ACCESS_SECRET: 'fixture-long-enough-access-signing-secret',
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_ISSUER: 'https://api.example.test',
      JWT_USER_AUDIENCE: 'birkare-mobile',
    }),
    {
      NODE_ENV: development ? 'test' : 'production',
      AUTH_DEV_MODE: development,
      REFRESH_TOKEN_TTL_DAYS: 30,
      MAIL_APP_SCHEME: 'birkareai',
    },
    {
      async verify() {
        throw new Error('Google not used in mail tests');
      },
    },
    mail,
  );
  return { repository, passwordService, service };
}

const registration = {
  email: 'registered@example.test',
  password: 'Test-Passphrase-981!',
  firstName: 'Mail',
  lastName: 'Test',
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

function deliveredToken(mail: FakeMail, index = mail.sent.length - 1) {
  const match = /(?:kodun|kod): ([a-zA-Z0-9_-]+)/.exec(mail.sent[index]!.text);
  assert.ok(match);
  return match[1]!;
}

test('production registration sends a single-use six-digit verification code but exposes no development code', async () => {
  const mail = new FakeMail();
  const { service, repository } = authFixture(mail);
  assert.deepEqual(await service.register(registration, {}), { verificationRequired: true });
  assert.equal(mail.sent.length, 1);
  const raw = deliveredToken(mail);
  assert.match(raw, /^\d{6}$/);
  const before = await repository.getUserByEmail(registration.email);
  assert.equal(before!.status, 'PENDING_VERIFICATION');
  assert.equal(before!.emailVerifiedAt, null);
  await service.verifyEmail(registration.email, raw);
  assert.equal((await repository.getUserByEmail(registration.email))!.status, 'ACTIVE');
  await assert.rejects(() => service.verifyEmail(registration.email, raw), {
    code: 'AUTH_INVALID_VERIFICATION_TOKEN',
  });
});

test('verification codes are scoped to the normalized e-mail and a wrong address does not consume the code', async () => {
  const mail = new FakeMail();
  const { service, passwordService } = authFixture(mail);
  await service.register(registration, {});
  const code = deliveredToken(mail);

  assert.notEqual(
    passwordService.hashEmailVerificationCode(registration.email, code),
    passwordService.hashEmailVerificationCode('other@example.test', code),
  );
  await assert.rejects(() => service.verifyEmail('other@example.test', code), {
    code: 'AUTH_INVALID_VERIFICATION_TOKEN',
  });
  await service.verifyEmail(` ${registration.email.toUpperCase()} `, code);
});

test('resending replaces the previous verification code', async () => {
  const mail = new FakeMail();
  const { service } = authFixture(mail);
  const input = { ...registration, email: 'replacement@example.test' };
  await service.register(input, {});
  const first = deliveredToken(mail);
  let latest = first;
  for (let attempt = 0; attempt < 10 && latest === first; attempt += 1) {
    await service.resendVerification(input.email);
    latest = deliveredToken(mail);
  }
  assert.notEqual(latest, first);
  await assert.rejects(() => service.verifyEmail(input.email, first), {
    code: 'AUTH_INVALID_VERIFICATION_TOKEN',
  });
  await service.verifyEmail(input.email, latest);
});

test('five failed guesses invalidate the active code until a replacement is issued', async () => {
  const mail = new FakeMail();
  const { service } = authFixture(mail);
  const input = { ...registration, email: 'attempt-limit@example.test' };
  await service.register(input, {});
  const correct = deliveredToken(mail);
  const wrongCodes = ['000000', '111111', '222222', '333333', '444444', '555555'].filter(
    (candidate) => candidate !== correct,
  );
  for (const wrong of wrongCodes.slice(0, 5)) {
    await assert.rejects(() => service.verifyEmail(input.email, wrong), {
      code: 'AUTH_INVALID_VERIFICATION_TOKEN',
    });
  }
  await assert.rejects(() => service.verifyEmail(input.email, correct), {
    code: 'AUTH_INVALID_VERIFICATION_TOKEN',
  });
  await service.resendVerification(input.email);
  await service.verifyEmail(input.email, deliveredToken(mail));
});

test('failed registration mail reports delivery failure and resend recovers the same pending account', async () => {
  const mail = new FakeMail();
  mail.fail = true;
  const { service, repository } = authFixture(mail);
  await assert.rejects(() => service.register(registration, {}), {
    code: 'AUTH_VERIFICATION_DELIVERY_FAILED',
  });
  const pending = await repository.getUserByEmail(registration.email);
  assert.equal(pending!.status, 'PENDING_VERIFICATION');
  mail.fail = false;
  assert.deepEqual(await service.resendVerification(registration.email), {});
  await service.verifyEmail(registration.email, deliveredToken(mail));
  assert.equal((await repository.getUserByEmail(registration.email))!.id, pending!.id);
});

test('password reset sends single-use mail, hides account existence and revokes old sessions', async () => {
  const mail = new FakeMail();
  const { service, repository, passwordService } = authFixture(mail);
  await service.register(registration, {});
  await service.verifyEmail(registration.email, deliveredToken(mail));
  const user = (await repository.getUserByEmail(registration.email))!;
  await repository.createSession({
    userId: user.id,
    refreshTokenHash: hashToken('old-session'),
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.deepEqual(await service.forgotPassword(registration.email), {});
  assert.deepEqual(await service.forgotPassword('absent@example.test'), {});
  const replacedReset = deliveredToken(mail);
  assert.deepEqual(await service.forgotPassword(registration.email), {});
  const reset = deliveredToken(mail);
  await assert.rejects(() => service.resetPassword(replacedReset, 'Replacement-Passphrase-982!'), {
    code: 'AUTH_INVALID_RESET_TOKEN',
  });
  const legacyReset = 'legacy-reset-token-that-must-not-survive-success';
  await repository.createEmailToken({
    userId: user.id,
    type: 'RESET_PASSWORD',
    tokenHash: hashToken(legacyReset),
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
  });
  await service.resetPassword(reset, 'Replacement-Passphrase-982!');
  assert.ok(
    await passwordService.verify(
      (await repository.getUserById(user.id))!.passwordHash!,
      'Replacement-Passphrase-982!',
    ),
  );
  assert.ok((await repository.listSessions(user.id)).every((session) => session.revokedAt));
  await assert.rejects(() => service.resetPassword(reset, 'Other-Passphrase-983!'), {
    code: 'AUTH_INVALID_RESET_TOKEN',
  });
  await assert.rejects(() => service.resetPassword(legacyReset, 'Other-Passphrase-983!'), {
    code: 'AUTH_INVALID_RESET_TOKEN',
  });
  mail.fail = true;
  assert.deepEqual(
    await service.forgotPassword(registration.email),
    await service.forgotPassword('absent@example.test'),
  );
});

test('disabled mail refuses production auth mail equally for known and unknown addresses; local tokens remain opt-in', async () => {
  const production = authFixture(new DisabledMailService());
  await assert.rejects(() => production.service.register(registration, {}), {
    code: 'MAIL_DELIVERY_UNAVAILABLE',
  });
  assert.equal(await production.repository.getUserByEmail(registration.email), null);
  for (const email of [registration.email, 'unknown@example.test']) {
    await assert.rejects(() => production.service.forgotPassword(email), {
      code: 'MAIL_DELIVERY_UNAVAILABLE',
    });
    await assert.rejects(() => production.service.resendVerification(email), {
      code: 'MAIL_DELIVERY_UNAVAILABLE',
    });
  }
  const development = authFixture(new DisabledMailService(), true);
  assert.ok((await development.service.register(registration, {})).developmentVerificationToken);
});
