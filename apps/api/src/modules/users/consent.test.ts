import assert from 'node:assert/strict';
import test from 'node:test';

import { MemoryRepository } from '@birkare/database';
import type { ApiDependencies } from '../../services/dependencies.js';
import { latestImageProcessingConsent, requireImageProcessingConsent } from './consent.js';

test('image-processing consent is required, versioned, and revocation disables uploads and generation', async () => {
  const repository = new MemoryRepository();
  const user = await repository.createUser({
    email: 'image-consent@example.test',
    passwordHash: 'unused',
    firstName: 'Image',
    lastName: 'Consent',
    locale: 'tr-TR',
    dateOfBirth: new Date('1990-01-01'),
    consents: [],
  });
  const deps = { repository } as unknown as ApiDependencies;
  await assert.rejects(() => requireImageProcessingConsent(deps, user.id), /açık rıza/i);
  await repository.createUserConsentEvent(user.id, {
    type: 'IMAGE_PROCESSING_EXPLICIT',
    version: 'v1.0',
    action: 'GRANTED',
    source: 'FIRST_IMAGE_UPLOAD',
  });
  assert.equal((await latestImageProcessingConsent(deps, user.id))?.action, 'GRANTED');
  await requireImageProcessingConsent(deps, user.id);
  await repository.createUserConsentEvent(user.id, {
    type: 'IMAGE_PROCESSING_EXPLICIT',
    version: 'v1.0',
    action: 'REVOKED',
    source: 'SETTINGS',
  });
  assert.equal((await latestImageProcessingConsent(deps, user.id))?.action, 'REVOKED');
  await assert.rejects(() => requireImageProcessingConsent(deps, user.id), /açık rıza/i);
});
