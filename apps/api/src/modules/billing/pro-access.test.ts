import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  BirKareRepository,
  CreditWalletRecord,
  LegacyGenerationRecipe,
  ProjectRecord,
} from '@birkare/database';
import { assertProGenerationAccess } from './pro-access.js';
import type { RevenueCatService } from './revenuecat.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-25T09:00:00.000Z');

function repository(unlimited: boolean): BirKareRepository {
  const wallet: CreditWalletRecord = {
    id: 'wallet-1',
    userId,
    unlimited,
    available: 0,
    reserved: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
  return {
    getCatalog: async () => ({
      scenes: [{ id: 'pro-scene', isPro: true }],
      styles: [],
      filters: [],
    }),
    getWallet: async () => wallet,
  } as unknown as BirKareRepository;
}

const project = { mode: 'PHOTO' } as unknown as ProjectRecord;
const recipe = {} as LegacyGenerationRecipe;
const selection = { sceneTemplateId: 'pro-scene' } as ProjectRecord;

test('server-granted unlimited accounts can use Pro generations without a store entitlement', async () => {
  let revenueCatChecks = 0;
  const revenueCatService = {
    assertActive: async () => {
      revenueCatChecks += 1;
      throw new Error('RevenueCat should not be called for a server-granted account.');
    },
  } as unknown as RevenueCatService;

  await assertProGenerationAccess({
    repository: repository(true),
    revenueCatService,
    userId,
    project,
    recipe,
    selection,
  });
  assert.equal(revenueCatChecks, 0);
});

test('ordinary accounts still require a verified RevenueCat entitlement', async () => {
  let revenueCatChecks = 0;
  const revenueCatService = {
    assertActive: async () => {
      revenueCatChecks += 1;
      return { active: true };
    },
  } as unknown as RevenueCatService;

  await assertProGenerationAccess({
    repository: repository(false),
    revenueCatService,
    userId,
    project,
    recipe,
    selection,
  });
  assert.equal(revenueCatChecks, 1);
});
