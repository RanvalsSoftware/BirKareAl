import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredSecretNames,
  createSecretScanner,
  forbiddenFileKind,
  parseKnownSecrets,
} from './audit-release-images.mjs';

test('reads only allowlisted long non-placeholder secrets without retaining unrelated fields', () => {
  assert.deepEqual(
    parseKnownSecrets(
      [
        'OPENAI_API_KEY="sample-real-secret-123456"',
        'JWT_ACCESS_SECRET=replace-me-before-deploy',
        'PASSWORD_PEPPER=development-password-pepper',
        'EXPO_PUBLIC_API_BASE_URL=https://example.test',
        'REDIS_PASSWORD=actual-redis-password-123456 # comment',
        'UNRELATED_SECRET=never-read-this-secret',
      ].join('\n'),
    ),
    [
      { name: 'OPENAI_API_KEY', value: 'sample-real-secret-123456' },
      { name: 'REDIS_PASSWORD', value: 'actual-redis-password-123456' },
    ],
  );
});

test('finds raw, URL-encoded and JSON-escaped values across stream chunks', () => {
  const value = 'real-secret-value/&*"123456';
  for (const representation of [
    value,
    encodeURIComponent(value),
    JSON.stringify(value).slice(1, -1),
  ]) {
    const scanner = createSecretScanner([{ name: 'DB_PASSWORD', value }]);
    for (const character of `prefix-${representation}-suffix`) scanner.push(Buffer.from(character));
    assert.deepEqual([...scanner.found], ['DB_PASSWORD']);
  }
});

test('rejects application env/credential/key files while allowing templates and dependency metadata', () => {
  for (const path of [
    'srv/app/.env',
    'srv/app/apps/api/.env.production',
    'srv/app/deploy/portainer.env',
  ])
    assert.equal(forbiddenFileKind(path), 'application-env-file');
  assert.equal(forbiddenFileKind('srv/app/.env.example'), null);
  assert.equal(forbiddenFileKind('srv/app/node_modules/package/.env.example'), null);
  assert.equal(forbiddenFileKind('etc/ssl/cert.pem'), null);
  assert.equal(forbiddenFileKind('srv/app/private.pem'), 'application-key-file');
  assert.equal(forbiddenFileKind('anywhere/upload.jks'), 'keystore');
  assert.equal(forbiddenFileKind('srv/app/.local-credentials/deploy.json'), 'credential-directory');
});

test('rejects baked-in secret-like environment defaults', () => {
  assert.deepEqual(
    configuredSecretNames([
      'NODE_ENV=production',
      'PORT=4000',
      'OPENAI_API_KEY=',
      'SMTP_PASSWORD=real-password',
      'DATABASE_URL=postgresql://u:p@host/db',
    ]),
    ['SMTP_PASSWORD', 'DATABASE_URL'],
  );
});
