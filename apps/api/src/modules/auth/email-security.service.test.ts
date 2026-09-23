import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@birkare/shared';
import { EmailSecurityService, emailAbuseFingerprint } from './email-security.service.js';
import { assertKnownRegistrationProvider, KNOWN_EMAIL_DOMAINS } from './email-provider-policy.js';

const config = {
  NODE_ENV: 'test' as const, REDIS_URL: undefined,
  PASSWORD_PEPPER: 'test-only-email-security-pepper',
  EMAIL_DOMAIN_ALLOWLIST: ['privaterelay.appleid.com'],
  EMAIL_DOMAIN_BLOCKLIST: ['blocked.example'],
};
const matchesCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;
const options = { connectRedis: false, resolveMx: async () => [{ exchange: 'mx.example', priority: 10 }] };

test('normalizes Gmail aliases only for welcome-credit abuse identity', () => {
  assert.equal(emailAbuseFingerprint(' A.hm.et+promo@GoogleMail.com '), 'ahmet@gmail.com');
  assert.equal(emailAbuseFingerprint('a.hmet+promo@outlook.com'), 'a.hmet+promo@outlook.com');
});

test('rejects provider typos, manual blocks and disposable domains before account creation', async () => {
  const service = await EmailSecurityService.create(config, options);
  await assert.rejects(service.validateRegistrationEmail('user@gmaill.com'), matchesCode('EMAIL_DOMAIN_TYPO'));
  await assert.rejects(service.validateRegistrationEmail('user@blocked.example'), matchesCode('EMAIL_DOMAIN_BLOCKED'));
  await assert.rejects(service.validateRegistrationEmail('user@mailinator.com'), matchesCode('DISPOSABLE_EMAIL_NOT_ALLOWED'));
});

test('accepts supported providers and Apple relay, but a corporate MX no longer permits signup', async () => {
  const domains: string[] = [];
  const service = await EmailSecurityService.create({ ...config, NODE_ENV: 'development' }, {
    connectRedis: false,
    resolveMx: async (domain) => { domains.push(domain); return [{ exchange: `mx.${domain}`, priority: 10 }]; },
  });
  for (const domain of KNOWN_EMAIL_DOMAINS) await service.validateRegistrationEmail(`user@${domain}`);
  assert.deepEqual(domains, [...KNOWN_EMAIL_DOMAINS]);
  await assert.rejects(service.validateRegistrationEmail('user@ranvals.com'), matchesCode('EMAIL_PROVIDER_NOT_ALLOWED'));
  assert.ok(!domains.includes('ranvals.com'));
});

test('uses exact domain matching and a manual allowlist cannot expand the provider policy', async () => {
  const service = await EmailSecurityService.create({
    ...config, NODE_ENV: 'development', EMAIL_DOMAIN_ALLOWLIST: ['ranvals.com', 'gmail.com.evil.com'],
  }, options);
  for (const domain of ['ranvals.com', 'gmail.com.evil.com', 'sub.gmail.com', 'notgmail.com', 'example.test']) {
    await assert.rejects(service.validateRegistrationEmail(`user@${domain}`), matchesCode('EMAIL_PROVIDER_NOT_ALLOWED'));
  }
  await service.validateRegistrationEmail(' User+tag@GMAIL.COM ');
  for (const environment of ['development', 'staging', 'production']) {
    assert.throws(() => assertKnownRegistrationProvider('user@example.test', environment), matchesCode('EMAIL_PROVIDER_NOT_ALLOWED'));
  }
  assert.doesNotThrow(() => assertKnownRegistrationProvider('user@example.test', 'test'));
});

test('distinguishes an absent MX from a temporary DNS outage even for an allowed provider', async () => {
  const missing = await EmailSecurityService.create(config, { connectRedis: false, resolveMx: async () => [] });
  await assert.rejects(missing.validateRegistrationEmail('user@gmail.com'), matchesCode('EMAIL_DOMAIN_NOT_DELIVERABLE'));
  const temporary = await EmailSecurityService.create(config, {
    connectRedis: false,
    resolveMx: async () => { throw Object.assign(new Error('temporary resolver failure'), { code: 'ETIMEOUT' }); },
  });
  await assert.rejects(temporary.validateRegistrationEmail('user@gmail.com'), matchesCode('EMAIL_DOMAIN_CHECK_TEMPORARILY_UNAVAILABLE'));
});

test('existing-account login, recovery and resend never apply new-signup provider restrictions', async () => {
  const service = await EmailSecurityService.create({ ...config, NODE_ENV: 'development' }, {
    connectRedis: false, resolveMx: async () => { throw new Error('Existing account must not trigger DNS'); },
  });
  await service.assertLoginAllowed('existing@ranvals.com', { ip: '192.0.2.1' });
  await service.assertRecoveryAllowed('existing@ranvals.com', { ip: '192.0.2.1' });
  await service.assertResendAllowed('existing@ranvals.com', { ip: '192.0.2.1' });
});

test('enforces resend cooldown and layered hashed registration limits', async () => {
  const service = await EmailSecurityService.create(config, options);
  const context = { ip: '192.0.2.10', deviceId: 'test-installation' };
  await service.assertResendAllowed('member@example.test', context);
  await assert.rejects(service.assertResendAllowed('member@example.test', context), matchesCode('AUTH_RESEND_COOLDOWN'));
  for (let index = 0; index < 3; index++) await service.assertRegistrationAllowed('new-member@example.test', { ip: '192.0.2.20' });
  await assert.rejects(service.assertRegistrationAllowed('new-member@example.test', { ip: '192.0.2.20' }), matchesCode('AUTH_REGISTER_RATE_LIMITED'));
});
