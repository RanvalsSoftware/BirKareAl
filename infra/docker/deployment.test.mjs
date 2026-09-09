import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Fixtures only. Never load the developer's .env or contact external services.
const fixtureEnv = {
  PATH: process.env.PATH,
  IMAGE_TAG: 'test-only',
  NODE_ENV: 'staging',
  DB_NAME: 'birkare_staging',
  DB_USER: 'birkare_app',
  DB_PASSWORD: 'db-fixture-012345678901234567890123456789',
  CLOUD_SQL_INSTANCE_CONNECTION_NAME: 'project:region:instance',
  CLOUD_SQL_CREDENTIALS_FILE: '/dev/null',
  REDIS_PASSWORD: 'redis-fixture-012345678901234567890123456789',
  OPENAI_API_KEY: 'sk-fixture-never-used',
  JWT_ISSUER: 'https://api.example.invalid',
  CORS_ORIGINS: 'https://www.example.invalid',
  JWT_ACCESS_SECRET: 'jwt-fixture-012345678901234567890123456789',
  PASSWORD_PEPPER: 'pepper-fixture-012345678901234567890123456789',
  R2_ENDPOINT: 'https://storage.example.invalid',
  R2_BUCKET: 'private-test-bucket',
  R2_ACCESS_KEY_ID: 'fixture-access-id',
  R2_SECRET_ACCESS_KEY: 'fixture-secret',
};

function compose(env = fixtureEnv) {
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      '/dev/null',
      '-f',
      'docker-compose.production.yml',
      '--profile',
      'tools',
      'config',
      '--format',
      'json',
    ],
    { cwd: root, env, encoding: 'utf8' },
  );
}

test('production stack uses external SQL and authenticated persistent private Redis', () => {
  const result = compose();
  assert.equal(result.status, 0, result.stderr);
  const { services, volumes } = JSON.parse(result.stdout);
  assert.deepEqual(
    Object.keys(services).sort(),
    ['api', 'cloudsql-proxy', 'migrate', 'redis', 'worker'],
  );
  assert.equal(services['cloudsql-proxy'].image, 'gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1');
  assert.deepEqual(services['cloudsql-proxy'].secrets, [
    { source: 'cloudsql-service-account', target: '/run/secrets/cloudsql-service-account' },
  ]);
  assert.equal(services['cloudsql-proxy'].ports, undefined);
  assert.equal(services.redis.ports, undefined);
  assert.ok(services.redis.command[0].includes('maxmemory-policy noeviction'));
  assert.ok(services.redis.command[0].includes('appendonly yes'));
  assert.ok(services.redis.command[0].includes('requirepass %s'));
  assert.ok(services.redis.command[0].includes('${#REDIS_PASSWORD}'));
  assert.deepEqual(Object.keys(volumes), ['redis-data']);
  assert.match(services.redis.healthcheck.test[1], /REDISCLI_AUTH="\$\$?REDIS_PASSWORD"/);
});

test('API and worker run immutable backend images with runtime-only required config', () => {
  const result = compose();
  assert.equal(result.status, 0, result.stderr);
  const { services } = JSON.parse(result.stdout);
  for (const name of ['api', 'worker']) {
    const service = services[name];
    assert.equal(service.image, `ghcr.io/ranvals-software/birkare-${name}:test-only`);
    assert.equal(service.build, undefined);
    assert.equal(service.platform, 'linux/amd64');
    assert.equal(service.read_only, true);
    assert.deepEqual(service.cap_drop, ['ALL']);
    assert.equal(
      service.environment.DATABASE_URL,
      'postgresql://birkare_app:db-fixture-012345678901234567890123456789@cloudsql-proxy:5432/birkare_staging?schema=public&sslmode=disable',
    );
    assert.equal(
      service.environment.REDIS_URL,
      `redis://:${fixtureEnv.REDIS_PASSWORD}@redis:6379/0`,
    );
    assert.equal(service.environment.AUTH_DEV_MODE, 'false');
    assert.equal(service.environment.ENABLE_INLINE_WORKER, 'false');
    assert.equal(service.environment.STORAGE_DRIVER, 'r2');
    assert.equal(service.environment.DISABLE_ALL_GENERATION, 'true');
    assert.equal(service.environment.NODE_ENV, 'staging');
  }
  assert.equal(services.api.environment.MAIL_DRIVER, 'disabled');
  assert.equal(services.api.environment.SMTP_PORT, '587');
  assert.equal(services.api.environment.SUPPORT_EMAIL, 'birkareal@ranvals.com');
  assert.equal(services.worker.environment.SMTP_PASSWORD, undefined);
  assert.equal(services.worker.environment.SMTP_USER, undefined);
  assert.equal(services.api.ports[0].host_ip, '127.0.0.1');
  assert.equal(services.worker.ports, undefined);
  assert.equal(services.worker.stop_grace_period, '4m0s');
  assert.equal(services.migrate.profiles, undefined);
  assert.equal(
    services.migrate.environment.DATABASE_URL,
    'postgresql://birkare_app:db-fixture-012345678901234567890123456789@cloudsql-proxy:5432/birkare_staging?schema=public&sslmode=disable',
  );
  assert.deepEqual(Object.keys(services.migrate.environment).sort(), ['DATABASE_URL', 'NODE_ENV']);
  assert.equal(services.migrate.depends_on['cloudsql-proxy'].condition, 'service_started');
  assert.ok(services.migrate.command.includes('deploy'));
  assert.equal(services.migrate.healthcheck.disable, true);
  assert.equal(services.api.depends_on.migrate.condition, 'service_completed_successfully');
  assert.equal(services.worker.depends_on.migrate.condition, 'service_completed_successfully');
});

test('missing production credentials fail interpolation rather than using development defaults', () => {
  for (const key of [
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'CLOUD_SQL_INSTANCE_CONNECTION_NAME',
    'CLOUD_SQL_CREDENTIALS_FILE',
    'REDIS_PASSWORD',
    'OPENAI_API_KEY',
    'JWT_ACCESS_SECRET',
    'PASSWORD_PEPPER',
    'R2_SECRET_ACCESS_KEY',
    'IMAGE_TAG',
  ]) {
    const env = { ...fixtureEnv };
    delete env[key];
    const result = compose(env);
    assert.notEqual(result.status, 0, `${key} must be required`);
    assert.ok(result.stderr.includes(key), `Diagnostic must identify ${key}`);
  }
});

test('Dockerfiles use a nonroot multistage runtime and do not bake deployment credentials', () => {
  for (const name of ['api', 'worker']) {
    const source = readFileSync(new URL(`${name}.Dockerfile`, import.meta.url), 'utf8');
    assert.match(source, /FROM base AS runtime/);
    assert.match(source, /USER node/);
    assert.match(source, /HEALTHCHECK/);
    assert.match(source, /--frozen-lockfile/);
    assert.doesNotMatch(
      source,
      /^\s*(ARG|ENV)\s+(DATABASE_URL|OPENAI_API_KEY|JWT_ACCESS_SECRET|PASSWORD_PEPPER|R2_SECRET_ACCESS_KEY)/m,
    );
    assert.doesNotMatch(source, /^COPY\s+(\.\s|\.env)/m);
    assert.doesNotMatch(source, /^COPY\s+apps\/mobile\s/m);
  }
});
