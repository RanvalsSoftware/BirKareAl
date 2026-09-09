import assert from 'node:assert/strict';
import test from 'node:test';
import {
  providerFailure,
  IMAGE_REQUEST_TIMEOUT_MS,
  MODERATION_REQUEST_TIMEOUT_MS,
} from '@birkare/ai';

test('provider failures retain actionable codes without SDK bodies or credentials', () => {
  const failure = providerFailure({
    status: 429,
    code: 'insufficient_quota',
    type: 'insufficient_quota',
    request_id: 'req_safe123',
    message: 'secret request',
    headers: { authorization: 'secret-token' },
    error: { message: 'private photo prompt' },
  });
  assert.equal(failure.code, 'PROVIDER_QUOTA_EXHAUSTED');
  assert.equal(failure.expose, true);
  assert.equal(failure.details?.providerRequestId, 'req_safe123');
  assert.equal(failure.details?.providerStatus, 429);
  assert.doesNotMatch(JSON.stringify(failure), /secret|private photo/);
});

test('timeout, rejection, account access, transient load and safety are distinct', () => {
  const cases = [
    [{ name: 'APIConnectionTimeoutError' }, 'PROVIDER_TIMEOUT'],
    [{ name: 'APIConnectionError' }, 'PROVIDER_CONNECTION_FAILED'],
    [{ status: 400 }, 'PROVIDER_REQUEST_REJECTED'],
    [{ status: 422 }, 'PROVIDER_REQUEST_REJECTED'],
    [{ status: 401 }, 'PROVIDER_CONFIGURATION_ERROR'],
    [{ status: 403 }, 'PROVIDER_CONFIGURATION_ERROR'],
    [{ status: 404 }, 'PROVIDER_CONFIGURATION_ERROR'],
    [{ status: 429 }, 'PROVIDER_RATE_LIMITED'],
    [{ status: 400, code: 'moderation_blocked' }, 'MODERATION_BLOCKED'],
    [{ status: 500 }, 'GENERATION_PROVIDER_FAILURE'],
  ] as const;
  for (const [error, code] of cases) assert.equal(providerFailure(error).code, code);
  assert.equal(IMAGE_REQUEST_TIMEOUT_MS, 180_000);
  assert.equal(MODERATION_REQUEST_TIMEOUT_MS, 30_000);
});

test('untrusted provider identifiers are omitted from diagnostics', () => {
  const failure = providerFailure({
    status: 500,
    code: 'bad\nprivate-token',
    request_id: 'https://private/photo?key=secret',
  });
  assert.equal(failure.details?.providerCode, undefined);
  assert.equal(failure.details?.providerRequestId, undefined);
});

test('optional moderation details distinguish output blocks and omit untrusted details', () => {
  const failure = providerFailure({
    status: 400,
    code: 'moderation_blocked',
    requestID: 'req_current_sdk',
    error: {
      moderation_details: {
        moderation_stage: 'output',
        categories: ['violence', 'sexual', 'private-user-input', 'sexual'],
        raw_prompt: 'must-not-log',
      },
    },
  });
  assert.equal(failure.details?.providerRequestId, 'req_current_sdk');
  assert.equal(failure.details?.moderationStage, 'output');
  assert.deepEqual(failure.details?.moderationCategories, ['violence', 'sexual']);
  assert.match(failure.message, /üretilen sonucu/);
  assert.doesNotMatch(JSON.stringify(failure), /private-user-input|must-not-log/);
  const unknown = providerFailure({ code: 'moderation_blocked' });
  assert.match(unknown.message, /ayrıntılı neden bildirilmedi/);
});

test('moderation metadata alone cannot turn a technical failure into a safety refusal', () => {
  assert.equal(
    providerFailure({
      status: 500,
      error: { moderation_details: { moderation_stage: 'input', categories: ['sexual'] } },
    }).code,
    'GENERATION_PROVIDER_FAILURE',
  );
});

test('documented prepaid and spend-limit errors are budget failures, not request-rate pressure', () => {
  for (const code of [
    'credit_balance_exhausted',
    'project_spend_limit_exceeded',
    'organization_spend_limit_exceeded',
  ]) {
    const failure = providerFailure({ status: 429, error: { code } });
    assert.equal(failure.code, 'PROVIDER_QUOTA_EXHAUSTED');
    assert.equal(failure.details?.providerCode, code);
    assert.match(failure.message, /sunucu tarafında/);
  }
  assert.equal(providerFailure({ status: 429, code: 'slow_down' }).code, 'PROVIDER_RATE_LIMITED');
});

test('invalid server credentials, access and missing models have safe, distinct explanations', () => {
  const cases = [
    [{ status: 401, code: 'invalid_api_key' }, /Sunucunun AI erişim bilgileri/],
    [{ status: 403 }, /erişim izni/],
    [{ status: 404, code: 'model_not_found' }, /AI modeli veya hizmet adresi/],
  ] as const;
  for (const [metadata, message] of cases) {
    const failure = providerFailure({ ...metadata, message: 'sensitive-provider-body' });
    assert.equal(failure.code, 'PROVIDER_CONFIGURATION_ERROR');
    assert.match(failure.message, message);
    assert.doesNotMatch(JSON.stringify(failure), /sensitive-provider-body/);
  }
});
