import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@birkare/shared';
import { EmailSecurityService, emailAbuseFingerprint } from './email-security.service.js';

const config = {
  NODE_ENV: 'test' as const,
  REDIS_URL: undefined,
  PASSWORD_PEPPER: 'test-only-email-security-pepper',
  EMAIL_DOMAIN_ALLOWLIST: ['privaterelay.appleid.com'],
  EMAIL_DOMAIN_BLOCKLIST: ['blocked.example'],
};

const matchesCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

test('normalizes Gmail aliases only for welcome-credit abuse identity', () => {
  assert.equal(emailAbuseFingerprint(' A.hm.et+promo@GoogleMail.com '), 'ahmet@gmail.com');
  assert.equal(emailAbuseFingerprint('a.hmet+promo@outlook.com'), 'a.hmet+promo@outlook.com');
});

test('rejects provider typos, manual blocks and disposable domains before account creation', async () => {
  const service = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => [{ exchange: 'mx.example', priority: 10 }],
  });
  await assert.rejects(
    () => service.validateRegistrationEmail('user@gmaill.com'),
    matchesCode('EMAIL_DOMAIN_TYPO'),
  );
  await assert.rejects(
    () => service.validateRegistrationEmail('user@blocked.example'),
    matchesCode('EMAIL_DOMAIN_BLOCKED'),
  );
  await assert.rejects(
    () => service.validateRegistrationEmail('user@mailinator.com'),
    matchesCode('DISPOSABLE_EMAIL_NOT_ALLOWED'),
  );
});

test('accepts a real corporate MX and Apple private relay without provider allowlisting', async () => {
  const domains: string[] = [];
  const service = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async (domain) => {
      domains.push(domain);
      return [{ exchange: `mx.${domain}`, priority: 10 }];
    },
  });
  await service.validateRegistrationEmail('user@ranvals.com');
  await service.validateRegistrationEmail('opaque@privaterelay.appleid.com');
  assert.deepEqual(domains, ['ranvals.com', 'privaterelay.appleid.com']);
});

test('distinguishes an absent MX from a temporary DNS outage', async () => {
  const missing = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => [],
  });
  await assert.rejects(
    () => missing.validateRegistrationEmail('user@valid-corporate.com'),
    matchesCode('EMAIL_DOMAIN_NOT_DELIVERABLE'),
  );

  const temporary = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => {
      throw Object.assign(new Error('temporary resolver failure'), { code: 'ETIMEOUT' });
    },
  });
  await assert.rejects(
    () => temporary.validateRegistrationEmail('user@valid-corporate.com'),
    matchesCode('EMAIL_DOMAIN_CHECK_TEMPORARILY_UNAVAILABLE'),
  );
});

test('enforces resend cooldown and layered hashed registration limits', async () => {
  const service = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => [{ exchange: 'mx.example', priority: 10 }],
  });
  await service.assertResendAllowed('member@example.test', {
    ip: '192.0.2.10',
    deviceId: 'test-installation',
  });
  await assert.rejects(
    () =>
      service.assertResendAllowed('member@example.test', {
        ip: '192.0.2.10',
        deviceId: 'test-installation',
      }),
    matchesCode('AUTH_RESEND_COOLDOWN'),
  );

  for (let index = 0; index < 3; index += 1)
    await service.assertRegistrationAllowed('new-member@example.test', {
      ip: '192.0.2.20',
    });
  await assert.rejects(
    () =>
      service.assertRegistrationAllowed('new-member@example.test', {
        ip: '192.0.2.20',
      }),
    matchesCode('AUTH_REGISTER_RATE_LIMITED'),
  );
});
