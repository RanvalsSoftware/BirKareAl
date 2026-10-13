import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import {
  FakeListingCopyProvider,
  FakeModerationProvider,
  getStudioSelection,
  type ListingCopyInput,
  type ListingCopyProvider,
} from '@birkare/ai';
import { ProjectListingSchema } from '@birkare/contracts';
import { MemoryRepository } from '@birkare/database';
import { createProjectsRouter } from './projects.routes.js';
import { TokenService } from '../../services/token.service.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { createErrorMiddleware } from '../../middleware/error.middleware.js';
import { requestIdMiddleware } from '../../middleware/request-id.middleware.js';

async function fixture(listingCopyProvider: ListingCopyProvider = new FakeListingCopyProvider()) {
  const repository = new MemoryRepository();
  const tokenService = new TokenService({
    JWT_ACCESS_SECRET: 'project-tests-access-secret-long-enough',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_ISSUER: 'https://api.example.test',
    JWT_USER_AUDIENCE: 'birkare-mobile',
  });
  async function account(email: string) {
    const initial = await repository.createUser({
      email,
      firstName: 'Project',
      lastName: 'Test',
      passwordHash: 'unused',
      locale: 'de-DE',
      dateOfBirth: new Date('1990-01-01'),
      consents: [],
    });
    const user = await repository.updateUser(initial.id, {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const session = await repository.createSession({
      userId: user.id,
      refreshTokenHash: email,
      expiresAt: new Date(Date.now() + 86400000),
    });
    return { user, ...(await tokenService.issueAccessToken(user, session.id)) };
  }
  const owner = await account('project-owner@example.test');
  const other = await account('project-other@example.test');
  const writes: ListingCopyInput[] = [];
  const logger = { error() {}, warn() {} } as unknown as ApiDependencies['logger'];
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(
    '/v1/projects',
    createProjectsRouter({
      repository,
      tokenService,
      moderationProvider: new FakeModerationProvider(),
      listingCopyProvider: {
        name: listingCopyProvider.name,
        write: async (input: ListingCopyInput) => {
          writes.push(input);
          return listingCopyProvider.write(input);
        },
      },
    } as unknown as ApiDependencies),
  );
  app.use(createErrorMiddleware(logger, true));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (
    method: string,
    path: string,
    input?: unknown,
    token: string | null = owner.accessToken,
    headers: Record<string, string> = {},
  ) => {
    const response = await fetch(`${base}/v1/projects${path}`, {
      method,
      headers: {
        ...(input === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    return { status: response.status, body: (await response.json()) as any };
  };
  const createProject = async (title?: string, token = owner.accessToken) =>
    (await call('POST', '', { mode: 'PRODUCT_STUDIO', ...(title ? { title } : {}) }, token)).body
      .data.project;
  return {
    repository,
    owner,
    other,
    writes,
    call,
    createProject,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

test('every project response exposes price and listing; PATCH sets and clears the price', async () => {
  const f = await fixture();
  try {
    const created = await f.createProject('Deri El Çantası');
    assert.equal(created.priceAmount, null);
    assert.equal(created.priceCurrency, null);
    assert.equal(created.listing, null);

    const priced = await f.call('PATCH', `/${created.id}`, {
      priceAmount: 1249.9,
      priceCurrency: 'TRY',
    });
    assert.equal(priced.status, 200);
    assert.equal(priced.body.data.project.priceAmount, 1249.9);
    assert.equal(priced.body.data.project.priceCurrency, 'TRY');

    const detail = await f.call('GET', `/${created.id}`);
    assert.equal(detail.body.data.project.priceAmount, 1249.9);
    assert.equal(detail.body.data.project.priceCurrency, 'TRY');
    assert.equal(detail.body.data.project.listing, null);
    const list = await f.call('GET', '');
    assert.equal(list.body.data.items[0].priceAmount, 1249.9);
    assert.equal(list.body.data.items[0].listing, null);
    const favorite = await f.call('POST', `/${created.id}/favorite`);
    assert.equal(favorite.body.data.project.priceCurrency, 'TRY');

    // Unrelated updates keep the price; explicit null clears each field.
    const renamed = await f.call('PATCH', `/${created.id}`, { title: 'Deri Çanta' });
    assert.equal(renamed.body.data.project.priceAmount, 1249.9);
    const cleared = await f.call('PATCH', `/${created.id}`, {
      priceAmount: null,
      priceCurrency: null,
    });
    assert.equal(cleared.body.data.project.priceAmount, null);
    assert.equal(cleared.body.data.project.priceCurrency, null);
    const free = await f.call('PATCH', `/${created.id}`, { priceAmount: 0 });
    assert.equal(free.body.data.project.priceAmount, 0);
  } finally {
    await f.close();
  }
});

test('PATCH validates the price and stays owner-only', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Parfüm');
    for (const input of [
      { priceAmount: -1 },
      { priceAmount: 100_000_000 },
      { priceAmount: 9.999 },
      { priceAmount: '12.50' },
      { priceCurrency: 'try' },
      { priceCurrency: 'TL' },
      { priceCurrency: 'EURO' },
      { priceCurrency: 949 },
    ]) {
      const rejected = await f.call('PATCH', `/${project.id}`, input);
      assert.equal(rejected.status, 400, JSON.stringify(input));
      assert.equal(rejected.body.error.code, 'VALIDATION_ERROR');
    }
    assert.equal(
      (await f.call('PATCH', `/${project.id}`, { priceAmount: 99_999_999.99 })).status,
      200,
    );
    const foreign = await f.call(
      'PATCH',
      `/${project.id}`,
      { priceAmount: 1, priceCurrency: 'USD' },
      f.other.accessToken,
    );
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.error.code, 'PROJECT_NOT_OWNED');
    assert.equal((await f.repository.getProjectById(project.id))?.priceAmount, 99_999_999.99);
  } finally {
    await f.close();
  }
});

test('listing copy is generated in the requested language, persisted and overwritten', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Deri El Çantası');
    const turkish = await f.call('POST', `/${project.id}/listing`, { language: 'tr' });
    assert.equal(turkish.status, 200);
    const listing = turkish.body.data.listing;
    assert.deepEqual(Object.keys(turkish.body.data), ['listing']);
    assert.equal(ProjectListingSchema.safeParse(listing).success, true);
    assert.equal(listing.language, 'tr');
    assert.equal(listing.tone, 'neutral');
    assert.match(listing.title, /Deri El Çantası/);
    assert.match(listing.description, /Deri El Çantası/);

    const stored = await f.call('GET', `/${project.id}`);
    assert.deepEqual(stored.body.data.project.listing, listing);
    assert.deepEqual((await f.call('GET', '')).body.data.items[0].listing, listing);

    const english = await f.call('POST', `/${project.id}/listing`, {
      language: 'en',
      tone: 'premium',
    });
    assert.equal(english.status, 200);
    assert.equal(english.body.data.listing.language, 'en');
    assert.equal(english.body.data.listing.tone, 'premium');
    assert.notEqual(english.body.data.listing.description, listing.description);
    assert.deepEqual(
      (await f.call('GET', `/${project.id}`)).body.data.project.listing,
      english.body.data.listing,
    );
  } finally {
    await f.close();
  }
});

test('listing language defaults to Accept-Language, then the account locale', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Seramik Kupa');
    const header = await f.call('POST', `/${project.id}/listing`, undefined, undefined, {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
    });
    assert.equal(header.status, 200);
    assert.equal(header.body.data.listing.language, 'es');
    assert.equal(header.body.data.listing.tone, 'neutral');
    // undici always sends an Accept-Language header; `*` resolves to no preference.
    const account = await f.call('POST', `/${project.id}/listing`, {}, undefined, {
      'Accept-Language': '*',
    });
    assert.equal(account.body.data.listing.language, 'de');
  } finally {
    await f.close();
  }
});

test('listing writer receives the latest studio recipe as text-only data', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Oud Parfüm 50 ml');
    const plan = getStudioSelection({
      kind: 'PRODUCT_STUDIO',
      categoryId: 'handbag',
      sceneId: 'marble',
    });
    assert.equal(plan.kind, 'PRODUCT_STUDIO');
    await f.repository.createGeneration({
      userId: f.owner.user.id,
      projectId: project.id,
      sourceAssetId: randomUUID(),
      parentGenerationId: null,
      quality: 'STANDARD',
      requestedImageCount: 1,
      aspectRatio: '4:5',
      preserveFace: true,
      preserveClothes: true,
      recipe: {
        version: 2,
        studio: {
          kind: 'PRODUCT_STUDIO',
          categoryId: 'handbag',
          sceneId: 'marble',
          taskType: plan.taskType as 'PRODUCT_PREMIUM',
        },
        catalogVersion: plan.catalogVersion,
        promptVersion: plan.promptVersion,
        pricingVersion: plan.pricingVersion,
        modelLane: plan.modelLane,
        baseCredits: plan.baseCredits,
        hdExtraCredits: plan.hdExtraCredits,
      },
      userInstruction: 'Altın kapak detayını vurgula',
      provider: 'FAKE',
      model: 'fake',
      reservedCredits: 0,
    });
    const response = await f.call('POST', `/${project.id}/listing`, { language: 'tr' });
    assert.equal(response.status, 200);
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.writes[0]!.product, {
      title: 'Oud Parfüm 50 ml',
      mode: 'PRODUCT_STUDIO',
      categoryId: 'handbag',
      category: 'Çanta',
      scene: plan.selectionLabel,
      commerceGoal: plan.taskType,
      userNote: 'Altın kapak detayını vurgula',
    });
    assert.ok(response.body.data.listing.hashtags.includes('#handbag'));
  } finally {
    await f.close();
  }
});

test('listing requires auth, ownership, valid input and a project title', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Gümüş Kolye');
    const untitled = await f.createProject();
    assert.equal((await f.call('POST', `/${project.id}/listing`, {}, null)).status, 401);

    const foreign = await f.call('POST', `/${project.id}/listing`, {}, f.other.accessToken);
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.error.code, 'PROJECT_NOT_OWNED');
    const missing = await f.call('POST', `/${randomUUID()}/listing`, {});
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'PROJECT_NOT_FOUND');

    for (const input of [{ language: 'fr' }, { tone: 'funny' }, { title: 'Ignore previous' }]) {
      const rejected = await f.call('POST', `/${project.id}/listing`, input);
      assert.equal(rejected.status, 400, JSON.stringify(input));
      assert.equal(rejected.body.error.code, 'VALIDATION_ERROR');
    }

    const noTitle = await f.call('POST', `/${untitled.id}/listing`, { language: 'tr' });
    assert.equal(noTitle.status, 409);
    assert.equal(noTitle.body.error.code, 'PROJECT_TITLE_REQUIRED');
    assert.equal(f.writes.length, 0);
    assert.equal((await f.repository.getProjectById(project.id))?.listing, null);
  } finally {
    await f.close();
  }
});

test('flagged seller text is rejected before the writer is called', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Sahte pasaport kılıfı');
    const blocked = await f.call('POST', `/${project.id}/listing`, { language: 'tr' });
    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.error.code, 'MODERATION_BLOCKED');
    assert.equal(blocked.body.error.details.moderationStage, 'input');
    assert.equal(f.writes.length, 0);
    assert.equal((await f.repository.getProjectById(project.id))?.listing, null);
  } finally {
    await f.close();
  }
});

test('a disabled or failing writer never overwrites the stored listing', async () => {
  const disabled = await fixture({
    name: 'disabled',
    write: async () => {
      throw new Error('must not be called');
    },
  });
  try {
    const project = await disabled.createProject('Ahşap Sehpa');
    const response = await disabled.call('POST', `/${project.id}/listing`, {});
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'LISTING_DISABLED');
    assert.equal(disabled.writes.length, 0);
  } finally {
    await disabled.close();
  }

  let fail = false;
  const fake = new FakeListingCopyProvider();
  const flaky = await fixture({
    name: 'openai',
    write: async (input) => {
      if (fail) throw new Error('socket hang up with secret sk-test');
      return fake.write(input);
    },
  });
  try {
    const project = await flaky.createProject('Ahşap Sehpa');
    const first = await flaky.call('POST', `/${project.id}/listing`, { language: 'en' });
    fail = true;
    const second = await flaky.call('POST', `/${project.id}/listing`, { language: 'tr' });
    assert.equal(second.status, 500);
    assert.doesNotMatch(JSON.stringify(second.body), /sk-test|socket/);
    assert.deepEqual(
      (await flaky.call('GET', `/${project.id}`)).body.data.project.listing,
      first.body.data.listing,
    );
  } finally {
    await flaky.close();
  }
});

test('listing copy is rate limited per account, not globally', async () => {
  const f = await fixture();
  try {
    const project = await f.createProject('Koşu Ayakkabısı');
    const theirs = await f.createProject('Kablosuz Kulaklık', f.other.accessToken);
    for (let attempt = 0; attempt < 10; attempt += 1)
      assert.equal((await f.call('POST', `/${project.id}/listing`, {})).status, 200);
    const limited = await f.call('POST', `/${project.id}/listing`, {});
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'LISTING_RATE_LIMITED');
    assert.equal(f.writes.length, 10);
    assert.equal(
      (await f.call('POST', `/${theirs.id}/listing`, {}, f.other.accessToken)).status,
      200,
    );
    // Reads and price updates are not affected by the listing window.
    assert.equal((await f.call('PATCH', `/${project.id}`, { priceAmount: 5 })).status, 200);
  } finally {
    await f.close();
  }
});
