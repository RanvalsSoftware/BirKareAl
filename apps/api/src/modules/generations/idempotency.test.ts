import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryRepository } from '@birkare/database';
import { accountIdempotencyKey, findAccountIdempotency } from './idempotency.js';

const route = 'POST:/v1/generations';
const clientKey = 'shared-client-retry-key';

test('idempotency and credit-reservation keys are deterministic and account scoped', () => {
  assert.equal(
    accountIdempotencyKey('alice', clientKey),
    accountIdempotencyKey('alice', clientKey),
  );
  assert.notEqual(
    accountIdempotencyKey('alice', clientKey),
    accountIdempotencyKey('bob', clientKey),
  );
  assert.notEqual(
    accountIdempotencyKey('alice', clientKey),
    accountIdempotencyKey('alice', clientKey, `${route}/preview`),
  );
});

test('legacy or scoped cached generation responses never cross the account boundary', async () => {
  const repository = new MemoryRepository();
  const stored = {
    userId: 'alice',
    route,
    key: clientKey,
    requestHash: 'hash',
    responseCode: 202,
    responseBody: { privateGeneration: 'alice-result' },
    expiresAt: new Date(Date.now() + 60_000),
  };
  await repository.putIdempotency(stored);
  assert.equal(
    (await findAccountIdempotency(repository, route, 'alice', clientKey))?.userId,
    'alice',
  );
  assert.equal(await findAccountIdempotency(repository, route, 'bob', clientKey), null);
  await repository.putIdempotency({ ...stored, key: accountIdempotencyKey('bob', clientKey) });
  assert.equal(await findAccountIdempotency(repository, route, 'bob', clientKey), null);
  await repository.putIdempotency({ ...stored, key: accountIdempotencyKey('alice', clientKey) });
  assert.equal(
    (await findAccountIdempotency(repository, route, 'alice', clientKey))?.key,
    accountIdempotencyKey('alice', clientKey),
  );
});
