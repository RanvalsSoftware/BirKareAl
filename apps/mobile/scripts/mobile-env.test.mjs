import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildMobileEnvironment, parseArguments } from './mobile-env.mjs';

test('only forwards public configuration and explicitly allowed build tooling', () => {
  const source = {
    EXPO_PUBLIC_APP_ENV: 'development',
    EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4000',
    GOOGLE_WEB_CLIENT_ID: 'public-client.apps.googleusercontent.com',
    OPENAI_API_KEY: 'secret-openai',
    DATABASE_URL: 'secret-database',
    JWT_ACCESS_SECRET: 'secret-jwt',
    GOOGLE_WEB_CLIENT_SECRET: 'secret-google',
    PATH: 'malicious-dotenv-path',
    BIRKARE_ANDROID_KEYSTORE_PASSWORD: 'dotenv-signing-secret',
  };
  const inherited = {
    PATH: '/safe/tooling/bin',
    JAVA_HOME: '/safe/java',
    HOME: '/safe/home',
    OPENAI_API_KEY: 'inherited-server-secret',
    UNKNOWN_PRIVATE_KEY: 'future-server-secret',
    EXPO_PUBLIC_API_BASE_URL: 'http://other-machine:4000',
    BIRKARE_ANDROID_KEYSTORE_PASSWORD: 'native-build-only-secret',
  };
  const actual = buildMobileEnvironment(source, inherited);
  assert.equal(actual.PATH, inherited.PATH);
  assert.equal(actual.JAVA_HOME, inherited.JAVA_HOME);
  assert.equal(actual.EXPO_PUBLIC_API_BASE_URL, source.EXPO_PUBLIC_API_BASE_URL);
  assert.equal(actual.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, source.GOOGLE_WEB_CLIENT_ID);
  assert.equal(
    actual.BIRKARE_ANDROID_KEYSTORE_PASSWORD,
    inherited.BIRKARE_ANDROID_KEYSTORE_PASSWORD,
  );
  assert.equal(actual.EXPO_NO_DOTENV, '1');
  for (const key of [
    'OPENAI_API_KEY',
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'GOOGLE_WEB_CLIENT_SECRET',
    'GOOGLE_WEB_CLIENT_ID',
    'UNKNOWN_PRIVATE_KEY',
  ]) {
    assert.equal(actual[key], undefined, key);
  }
  assert.equal(source.PATH, 'malicious-dotenv-path');
  assert.equal(inherited.OPENAI_API_KEY, 'inherited-server-secret');
});

test('requires explicit release configuration and never silently makes localhost production', () => {
  assert.throws(() => buildMobileEnvironment({}, {}, { release: true }), /EXPO_PUBLIC_APP_ENV/);
  assert.throws(
    () =>
      buildMobileEnvironment(
        {
          EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4000',
          EXPO_PUBLIC_SUPPORT_EMAIL: 'support@birkare.ai',
        },
        {},
        { appEnv: 'production', release: true },
      ),
    /EXPO_PUBLIC_API_BASE_URL/,
  );
  const actual = buildMobileEnvironment(
    {
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_API_BASE_URL: 'https://api.birkare.ai',
      EXPO_PUBLIC_SUPPORT_EMAIL: 'support@birkare.ai',
    },
    {},
    { appEnv: 'staging', release: true },
  );
  assert.equal(actual.EXPO_PUBLIC_APP_ENV, 'staging');
  assert.equal(actual.BIRKARE_RELEASE_BUILD, '1');
});

test('fails closed on accidentally prefixed public secrets without printing values', () => {
  assert.throws(
    () => buildMobileEnvironment({ EXPO_PUBLIC_OPENAI_API_KEY: 'never-print-this' }, {}),
    (error) =>
      error.message.includes('EXPO_PUBLIC_OPENAI_API_KEY') &&
      !error.message.includes('never-print-this'),
  );
});

test('parses explicit dotenv, release mode and literal child command arguments', () => {
  assert.deepEqual(
    parseArguments([
      '--env-file',
      '.env',
      '--app-env',
      'staging',
      '--release',
      '--',
      'npm',
      'exec',
      '--',
      'expo',
      'config',
    ]),
    {
      envFile: '.env',
      appEnv: 'staging',
      release: true,
      check: false,
      command: ['npm', 'exec', '--', 'expo', 'config'],
    },
  );
  assert.throws(() => parseArguments(['--', 'npm', 'start']), /--env-file/);
  assert.throws(() => parseArguments(['--env-file', '.env']), /command/);
  assert.throws(
    () => parseArguments(['--env-file', '.env', '--check', '--', 'npm']),
    /does not accept/,
  );
});
