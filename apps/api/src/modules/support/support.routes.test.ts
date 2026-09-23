import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { MemoryRepository, PrismaRepository, type GenerationRecord } from '@birkare/database';
import { createSupportRouter } from './support.routes.js';
import { TokenService } from '../../services/token.service.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import type { MailMessage } from '../../services/mail.service.js';
import { createErrorMiddleware } from '../../middleware/error.middleware.js';
import { requestIdMiddleware } from '../../middleware/request-id.middleware.js';

const body = {
  category: 'GENERATION',
  subject: 'Üretim sorunu',
  message: 'Bu üretim tamamlanmadı, kontrol eder misiniz?',
};

async function fixture(send?: (message: MailMessage) => Promise<void>, enabled = true) {
  const repository = new MemoryRepository();
  const mails: MailMessage[] = [];
  const tokenService = new TokenService({
    JWT_ACCESS_SECRET: 'support-tests-access-secret-long-enough',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_ISSUER: 'https://api.example.test',
    JWT_USER_AUDIENCE: 'birkare-mobile',
  });
  async function account(email: string) {
    const initial = await repository.createUser({
      email,
      firstName: 'Support',
      lastName: 'Test',
      passwordHash: 'unused',
      locale: 'tr-TR',
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
  const owner = await account('support-owner@example.test');
  const other = await account('support-other@example.test');
  const logger = { error() {}, warn() {} } as unknown as ApiDependencies['logger'];
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(
    '/v1/support',
    createSupportRouter({
      repository,
      tokenService,
      config: { SUPPORT_EMAIL: 'fixed-support@example.test' },
      logger,
      mailService: {
        enabled,
        send: async (message: MailMessage) => {
          mails.push(message);
          await send?.(message);
        },
      },
    } as unknown as ApiDependencies),
  );
  app.use(createErrorMiddleware(logger, true));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (
    input: unknown = body,
    key = 'support-test-key-0001',
    token: string | null = owner.accessToken,
  ) =>
    fetch(`${base}/v1/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
  const get = (id: string, token = owner.accessToken) =>
    fetch(`${base}/v1/support/tickets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return {
    repository,
    mails,
    owner,
    other,
    post,
    get,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

test('support requires a verified session and bounded strict input; recipients cannot be overridden', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.post(body, undefined, null)).status, 401);
    for (const input of [
      { ...body, message: '    ' },
      { ...body, message: 'x'.repeat(4001) },
      { ...body, subject: 'x'.repeat(121) },
      { ...body, subject: 'Hi\r\nBcc: other@example.test' },
      { ...body, category: 'UNKNOWN' },
      { ...body, to: 'attacker@example.test' },
      { ...body, userId: f.other.user.id },
    ])
      assert.equal((await f.post(input)).status, 400);
    assert.equal((await f.post(body, 'short')).status, 400);
    assert.equal(f.mails.length, 0);
  } finally {
    await f.close();
  }
});

test('support records delivery to the fixed mailbox, replays once and isolates accounts', async () => {
  const f = await fixture();
  try {
    const first = await f.post();
    assert.equal(first.status, 201);
    const response = (await first.json()) as any;
    const id = response.data.ticket.id;
    assert.equal(response.data.ticket.status, 'SENT');
    assert.equal(response.data.ticket.message, undefined);
    assert.equal(response.meta.requestId, first.headers.get('x-request-id'));
    assert.equal(f.mails[0]?.to, 'fixed-support@example.test');
    assert.equal(f.mails[0]?.replyTo, f.owner.user.email);
    assert.equal((await f.repository.getSupportTicket(f.owner.user.id, id))?.message, body.message);
    assert.equal((await f.post()).status, 200);
    assert.equal(f.mails.length, 1);
    assert.equal(
      (await f.post({ ...body, message: 'Aynı anahtarla farklı bir mesaj gönderiyorum.' })).status,
      409,
    );
    assert.equal((await f.get(id, f.other.accessToken)).status, 404);
    assert.equal((await f.get(id)).status, 200);
    assert.equal((await f.post(body, 'support-test-key-0001', f.other.accessToken)).status, 201);
    assert.equal(f.mails.length, 2);
  } finally {
    await f.close();
  }
});

test('concurrent identical support requests claim only one automatic mail attempt', async () => {
  let accept!: () => void;
  const wait = new Promise<void>((resolve) => {
    accept = resolve;
  });
  const f = await fixture(async () => wait);
  try {
    const first = f.post();
    const second = f.post();
    const pending = await Promise.race([first, second]);
    assert.equal(pending.status, 202);
    accept();
    const responses = await Promise.all([first, second]);
    assert.deepEqual(responses.map((entry) => entry.status).sort(), [201, 202]);
    assert.equal(f.mails.length, 1);
  } finally {
    accept();
    await f.close();
  }
});

test('uncertain SMTP delivery persists without a fake success or automatic retry', async () => {
  const f = await fixture(async () => {
    throw new Error('private smtp diagnostic must not escape');
  });
  try {
    const first = await f.post();
    assert.equal(first.status, 503);
    const result = (await first.json()) as any;
    assert.equal(result.error.code, 'SUPPORT_DELIVERY_UNCONFIRMED');
    assert.ok(!JSON.stringify(result).includes('private smtp'));
    const ticket = await f.repository.getSupportTicket(
      f.owner.user.id,
      result.error.details.ticketId,
    );
    assert.equal(ticket?.status, 'UNCONFIRMED');
    assert.equal((await f.post()).status, 503);
    assert.equal(f.mails.length, 1);
  } finally {
    await f.close();
  }
});

test('disabled support mail fails honestly without attempting delivery', async () => {
  const f = await fixture(undefined, false);
  try {
    assert.equal((await f.post()).status, 503);
    assert.equal(f.mails.length, 0);
  } finally {
    await f.close();
  }
});

test('support diagnostics come only from an owned generation and never include prompts/photos', async () => {
  const f = await fixture();
  try {
    const id = '6d61756f-9088-427c-98a7-13fc88890a8c';
    f.repository.getGenerationById = async () =>
      ({
        id,
        userId: f.owner.user.id,
        status: 'FAILED',
        failureCode: 'PROVIDER_CONFIGURATION_ERROR',
        stage: 'OPENAI_IMAGE_GENERATION',
        model: 'gpt-image-1-mini',
        providerRequestId: 'req_safe_support_test',
        compiledPrompt: 'NEVER_EXPOSE_PROMPT',
        userInstruction: 'NEVER_EXPOSE_INSTRUCTION',
        sourceAssetId: 'NEVER_EXPOSE_PHOTO',
      }) as GenerationRecord;
    assert.equal((await f.post({ ...body, generationId: id })).status, 201);
    const mail = f.mails[0]!.text;
    assert.ok(mail.includes('req_safe_support_test'));
    assert.ok(mail.includes('PROVIDER_CONFIGURATION_ERROR'));
    assert.ok(!mail.includes('NEVER_EXPOSE'));
    assert.equal(
      (await f.post({ ...body, generationId: id }, 'support-other-key-0002', f.other.accessToken))
        .status,
      404,
    );
    assert.equal(f.mails.length, 1);
  } finally {
    await f.close();
  }
});

test('support burst limit is scoped to authenticated account', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 10; i += 1) assert.ok([200, 201].includes((await f.post()).status));
    assert.equal((await f.post()).status, 429);
    assert.equal((await f.post(body, 'support-test-key-0001', f.other.accessToken)).status, 201);
  } finally {
    await f.close();
  }
});

test('Prisma email token CAS allows exactly one concurrent consumer', async () => {
  const token = {
    id: 'test-token',
    userId: 'test-user',
    tokenHash: 'test-hash',
    type: 'RESET_PASSWORD',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    createdAt: new Date(),
  };
  let claimed = false;
  const repo = new PrismaRepository({
    emailToken: {
      findUnique: async () => ({ ...token }),
      updateMany: async ({ where }: any) => {
        assert.equal(where.usedAt, null);
        assert.equal(where.type, 'RESET_PASSWORD');
        assert.ok(where.expiresAt.gt instanceof Date);
        if (claimed) return { count: 0 };
        claimed = true;
        return { count: 1 };
      },
    },
  });
  const results = await Promise.all([
    repo.consumeEmailToken('test-hash', 'RESET_PASSWORD'),
    repo.consumeEmailToken('test-hash', 'RESET_PASSWORD'),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
});
