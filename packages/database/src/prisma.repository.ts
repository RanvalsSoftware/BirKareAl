import { catalogFixtures, conflict, notFound, unauthorized } from '@birkare/shared';
import type { CatalogFeaturedPerson, CatalogItem } from '@birkare/shared';
import { randomUUID } from 'node:crypto';
import { deletionIdentityHash, DELETION_GRACE_MS, DELETION_IDLE_STATUSES } from './deletion.js';
import type { AccountDeletionRecord } from './types.js';
import {
  WELCOME_CREDIT_AMOUNT,
  WELCOME_CREDIT_REFERENCE_TYPE,
  welcomeCreditIdempotencyKey,
} from './credits.js';
import type {
  AssetRecord,
  BirKareRepository,
  CatalogSnapshot,
  CreateAssetInput,
  CreateGenerationInput,
  CreateProjectInput,
  CreateSessionInput,
  CreateSupportTicketInput,
  CreateUserInput,
  CreateVerifiedSocialUserInput,
  CreatePendingSocialLoginInput,
  CreditTransactionRecord,
  CreditWalletRecord,
  EmailTokenRecord,
  EmailTokenType,
  GenerationMessageRecord,
  GenerationOutputRecord,
  GenerationRecord,
  IdempotencyRecord,
  LinkAuthAccountInput,
  PendingSocialLoginRecord,
  ProjectRecord,
  SessionRecord,
  SocialAuthProvider,
  SupportTicketRecord,
  UserConsentRecord,
  UserRecord,
} from './types.js';

// Keeping the Prisma client structurally typed lets `DATABASE_PROVIDER=memory`
// work before `prisma generate`, while the production path still uses Prisma.
type PrismaClientLike = any;

const asDate = (value: unknown): Date | null =>
  value instanceof Date ? value : value ? new Date(value as string) : null;
const asNumber = (value: unknown): number => Number(value ?? 0);

function toUser(row: any): UserRecord {
  const profile = row.profile ?? {};
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash ?? null,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    role: row.role,
    status: row.status,
    emailVerifiedAt: asDate(row.emailVerifiedAt),
    locale: row.locale,
    countryCode: row.countryCode ?? null,
    dateOfBirth: asDate(row.dateOfBirth),
    lastLoginAt: asDate(row.lastLoginAt),
    preferences: {
      keepSourcePhotos: profile.keepSourcePhotos ?? true,
      marketingEmail: profile.marketingEmail ?? false,
      pushEnabled: profile.pushEnabled ?? true,
      reducedMotion: profile.reducedMotion ?? false,
      glassEffects: profile.preferences?.glassEffects !== false,
      theme: 'dark',
      defaultAspectRatio: profile.defaultAspectRatio ?? '4:5',
      defaultQuality: profile.defaultQuality ?? 'STANDARD',
    },
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: asDate(row.deletedAt),
  };
}

function toSession(row: any): SessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenFamilyId: row.tokenFamilyId,
    refreshTokenHash: row.refreshTokenHash,
    deviceId: row.deviceId ?? null,
    deviceName: row.deviceName ?? null,
    platform: row.platform ?? null,
    appVersion: row.appVersion ?? null,
    ipHash: row.ipHash ?? null,
    userAgent: row.userAgent ?? null,
    expiresAt: new Date(row.expiresAt),
    lastUsedAt: new Date(row.lastUsedAt),
    rotatedAt: asDate(row.rotatedAt),
    revokedAt: asDate(row.revokedAt),
    revokedReason: row.revokedReason ?? null,
    createdAt: new Date(row.createdAt),
  };
}

function toPendingSocialLogin(row: any): PendingSocialLoginRecord {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    provider: row.provider as SocialAuthProvider,
    providerAccountId: row.providerAccountId,
    providerEmail: row.providerEmail,
    givenName: row.givenName ?? null,
    familyName: row.familyName ?? null,
    expiresAt: new Date(row.expiresAt),
    consumedAt: asDate(row.consumedAt),
    createdAt: new Date(row.createdAt),
  };
}

function toUserConsent(row: any): UserConsentRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as UserConsentRecord['type'],
    version: row.version,
    source: row.source as UserConsentRecord['source'],
    acceptedAt: new Date(row.acceptedAt),
    createdAt: new Date(row.createdAt),
  };
}

function toAsset(row: any): AssetRecord {
  return {
    id: row.id,
    ownerId: row.ownerId ?? null,
    type: row.type,
    status: row.status,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    originalName: row.originalName ?? null,
    mimeType: row.mimeType,
    sizeBytes: asNumber(row.sizeBytes),
    sha256: row.sha256 ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    isPrivate: row.isPrivate,
    retentionUntil: asDate(row.retentionUntil),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: asDate(row.deletedAt),
  };
}

function toProject(row: any): ProjectRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title ?? null,
    mode: row.mode,
    status: row.status,
    sourceAssetId: row.sourceAssetId ?? null,
    sceneTemplateId: row.sceneTemplateId ?? null,
    stylePresetId: row.stylePresetId ?? null,
    featuredPersonId: row.featuredPersonId ?? null,
    composition: row.composition ?? null,
    aspectRatio: row.aspectRatio,
    isFavorite: row.isFavorite,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: asDate(row.deletedAt),
  };
}

function toOutput(row: any): GenerationOutputRecord {
  return {
    id: row.id,
    generationId: row.generationId,
    assetId: row.assetId,
    variantIndex: row.variantIndex,
    selected: row.selected,
    watermarkApplied: row.watermarkApplied,
    disclosureType: row.disclosureType ?? null,
    createdAt: new Date(row.createdAt),
  };
}

function toGeneration(row: any): GenerationRecord {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    parentGenerationId: row.parentGenerationId ?? null,
    sourceAssetId: row.sourceAssetId ?? row.inputs?.[0]?.assetId,
    status: row.status,
    stage: row.stage ?? null,
    progress: row.progress,
    quality: row.quality,
    requestedImageCount: row.requestedImageCount,
    aspectRatio: row.aspectRatio,
    preserveFace: row.preserveFace,
    preserveClothes: row.preserveClothes,
    recipe: (row.recipe ?? null) as GenerationRecord['recipe'],
    userInstruction: row.userInstruction ?? null,
    compiledPrompt: row.compiledPrompt ?? null,
    promptVersion: row.promptVersion ?? null,
    provider: row.provider,
    model: row.model,
    providerRequestId: row.providerRequestId ?? null,
    reservedCredits: row.reservedCredits,
    chargedCredits: row.chargedCredits,
    refundedCredits: row.refundedCredits,
    failureCode: row.failureCode ?? null,
    failureMessage: row.failureMessage ?? null,
    retryCount: row.retryCount,
    startedAt: asDate(row.startedAt),
    completedAt: asDate(row.completedAt),
    failedAt: asDate(row.failedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    deletedAt: asDate(row.deletedAt),
    outputs: (row.outputs ?? []).map(toOutput),
  };
}

function toWallet(row: any): CreditWalletRecord {
  return {
    id: row.id,
    userId: row.userId,
    available: row.available,
    reserved: row.reserved,
    lifetimeEarned: row.lifetimeEarned,
    lifetimeSpent: row.lifetimeSpent,
    version: row.version,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toTransaction(row: any): CreditTransactionRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    status: row.status,
    amount: row.amount,
    availableAfter: row.availableAfter ?? null,
    reservedAfter: row.reservedAfter ?? null,
    referenceType: row.referenceType ?? null,
    referenceId: row.referenceId ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    description: row.description ?? null,
    createdAt: new Date(row.createdAt),
    completedAt: asDate(row.completedAt),
  };
}

function toCatalogFeaturedPerson(row: any): CatalogFeaturedPerson {
  return {
    id: row.id,
    slug: row.slug,
    name: row.displayName,
    description: row.disclosureText ?? undefined,
    category: row.category,
    previewColor: '#9a721f',
    requiredCredits: 0,
    enabled: row.enabled,
    isSelectable: row.isSelectable,
    isSearchable: row.isSearchable,
    generationEnabled: row.generationEnabled,
    requiresDisclosure: row.requiresDisclosure,
    requiresWatermark: row.requiresWatermark,
    tags: ['catalog'],
    kind: row.kind as CatalogFeaturedPerson['kind'],
    rightsStatus: row.rightsStatus as CatalogFeaturedPerson['rightsStatus'],
    referenceAssetId: row.referenceAssetId ?? null,
    disclosureText: row.disclosureText ?? undefined,
  };
}

function toCatalogItem(row: any, fallback?: CatalogItem): CatalogItem {
  const config =
    row.config && typeof row.config === 'object' && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  const configuredTags = Array.isArray(config.tags)
    ? config.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ...(row.description
      ? { description: row.description }
      : fallback?.description
        ? { description: fallback.description }
        : {}),
    category: row.category,
    previewColor:
      typeof config.previewColor === 'string'
        ? config.previewColor
        : (fallback?.previewColor ?? '#3f3f46'),
    requiredCredits: asNumber(row.requiredCredits),
    ...(row.isPro ? { isPro: true } : {}),
    enabled: Boolean(row.enabled),
    tags: [...(configuredTags ?? fallback?.tags ?? [])],
  };
}

export class PrismaRepository implements BirKareRepository {
  readonly kind = 'prisma' as const;

  constructor(
    private readonly prisma: PrismaClientLike,
    private readonly identitySecret = 'development-only-deletion-identity-key',
  ) {}

  async readiness(): Promise<{ ready: boolean; detail?: string }> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { ready: true };
    } catch {
      return { ready: false, detail: 'PostgreSQL bağlantısı hazır değil.' };
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    try {
      return await this.prisma.$transaction(async (tx: PrismaClientLike) => {
        const { consents, ...userInput } = input;
        const priorDeletion = await tx.accountDeletion.findFirst({
          where: {
            identityHashes: {
              has: deletionIdentityHash(this.identitySecret, 'email', input.email),
            },
          },
          select: { userId: true },
        });
        const welcomeAmount = priorDeletion ? 0 : WELCOME_CREDIT_AMOUNT;
        const user = await tx.user.create({
          data: {
            email: userInput.email.toLowerCase(),
            passwordHash: userInput.passwordHash,
            firstName: userInput.firstName,
            lastName: userInput.lastName,
            locale: userInput.locale,
            dateOfBirth: userInput.dateOfBirth,
            status: 'PENDING_VERIFICATION',
            profile: { create: {} },
            wallet: {
              create: {
                available: welcomeAmount,
                lifetimeEarned: welcomeAmount,
                version: 1,
              },
            },
          },
          include: { profile: true, wallet: true },
        });
        await tx.userConsent.createMany({
          data: consents.map((consent) => ({ ...consent, userId: user.id })),
        });
        if (welcomeAmount > 0)
          await tx.creditTransaction.create({
            data: {
              userId: user.id,
              type: 'BONUS',
              status: 'COMPLETED',
              amount: welcomeAmount,
              availableAfter: welcomeAmount,
              reservedAfter: 0,
              referenceType: WELCOME_CREDIT_REFERENCE_TYPE,
              idempotencyKey: welcomeCreditIdempotencyKey(user.id),
              description: 'BirKare AI hoş geldin kredisi',
              completedAt: new Date(),
            },
          });
        return toUser(user);
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw conflict('AUTH_EMAIL_ALREADY_EXISTS', 'Bu e-posta adresiyle zaten bir hesap var.');
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
    return row ? toUser(row) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });
    return row ? toUser(row) : null;
  }

  async getUserByAuthAccount(
    provider: SocialAuthProvider,
    providerAccountId: string,
  ): Promise<UserRecord | null> {
    const account = await this.prisma.authAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: { include: { profile: true } } },
    });
    return account ? toUser(account.user) : null;
  }

  async createVerifiedSocialUser(input: CreateVerifiedSocialUserInput): Promise<UserRecord> {
    try {
      return await this.prisma.$transaction(async (tx: PrismaClientLike) => {
        const now = new Date();
        const priorDeletion = await tx.accountDeletion.findFirst({
          where: {
            identityHashes: {
              hasSome: [
                deletionIdentityHash(this.identitySecret, 'email', input.email),
                deletionIdentityHash(this.identitySecret, input.provider, input.providerAccountId),
              ],
            },
          },
          select: { userId: true },
        });
        const welcomeAmount = priorDeletion ? 0 : WELCOME_CREDIT_AMOUNT;
        const user = await tx.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash: null,
            firstName: input.firstName,
            lastName: input.lastName,
            locale: input.locale,
            dateOfBirth: input.dateOfBirth,
            status: 'ACTIVE',
            emailVerifiedAt: now,
            profile: { create: {} },
            wallet: {
              create: {
                available: welcomeAmount,
                lifetimeEarned: welcomeAmount,
                version: 1,
              },
            },
          },
          include: { profile: true, wallet: true },
        });
        await tx.authAccount.create({
          data: {
            userId: user.id,
            provider: input.provider,
            providerAccountId: input.providerAccountId,
            providerEmail: input.providerEmail,
          },
        });
        await tx.userConsent.createMany({
          data: input.consents.map((consent) => ({ ...consent, userId: user.id })),
        });
        if (welcomeAmount > 0)
          await tx.creditTransaction.create({
            data: {
              userId: user.id,
              type: 'BONUS',
              status: 'COMPLETED',
              amount: welcomeAmount,
              availableAfter: welcomeAmount,
              reservedAfter: 0,
              referenceType: WELCOME_CREDIT_REFERENCE_TYPE,
              idempotencyKey: welcomeCreditIdempotencyKey(user.id),
              description: 'BirKare AI hoş geldin kredisi',
              completedAt: now,
            },
          });
        return toUser(user);
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw conflict('AUTH_SOCIAL_ACCOUNT_CONFLICT', 'Sosyal hesap oluşturulamadı.');
      throw error;
    }
  }

  async linkAuthAccount(input: LinkAuthAccountInput): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: PrismaClientLike) => {
        await this.lockWritableAccount(tx, input.userId);
        await tx.authAccount.create({
          data: {
            userId: input.userId,
            provider: input.provider,
            providerAccountId: input.providerAccountId,
            providerEmail: input.providerEmail,
          },
        });
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const existing = await this.prisma.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
          },
        },
      });
      if (existing?.userId === input.userId) return;
      throw conflict('AUTH_SOCIAL_ALREADY_LINKED', 'Bu sosyal hesap başka bir hesaba bağlı.');
    }
  }

  async createPendingSocialLogin(
    input: CreatePendingSocialLoginInput,
  ): Promise<PendingSocialLoginRecord> {
    try {
      const row = await this.prisma.pendingSocialLogin.create({ data: input });
      return toPendingSocialLogin(row);
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw conflict('AUTH_SOCIAL_PENDING_CONFLICT', 'Sosyal kayıt başlatılamadı.');
      throw error;
    }
  }

  async consumePendingSocialLogin(
    tokenHash: string,
    provider: SocialAuthProvider,
  ): Promise<PendingSocialLoginRecord | null> {
    const record = await this.prisma.pendingSocialLogin.findUnique({ where: { tokenHash } });
    if (
      !record ||
      record.provider !== provider ||
      record.consumedAt ||
      record.expiresAt <= new Date()
    )
      return null;
    const consumedAt = new Date();
    const result = await this.prisma.pendingSocialLogin.updateMany({
      where: { id: record.id, consumedAt: null, expiresAt: { gt: consumedAt } },
      data: { consumedAt },
    });
    return result.count === 1 ? toPendingSocialLogin({ ...record, consumedAt }) : null;
  }

  async purgePendingSocialLogins(input: { before: Date; limit: number }): Promise<number> {
    const records = await this.prisma.pendingSocialLogin.findMany({
      where: {
        OR: [{ consumedAt: { not: null } }, { expiresAt: { lte: input.before } }],
      },
      orderBy: { createdAt: 'asc' },
      take: Math.max(0, input.limit),
      select: { id: true },
    });
    if (records.length === 0) return 0;
    const result = await this.prisma.pendingSocialLogin.deleteMany({
      where: { id: { in: records.map((record: { id: string }) => record.id) } },
    });
    return result.count;
  }

  async listUserConsents(userId: string): Promise<UserConsentRecord[]> {
    const rows = await this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: [{ acceptedAt: 'asc' }, { type: 'asc' }],
    });
    return rows.map(toUserConsent);
  }

  async updateUser(
    id: string,
    input: Parameters<BirKareRepository['updateUser']>[1],
  ): Promise<UserRecord> {
    const { preferences, ...userInput } = input;
    const row = await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      if (preferences) {
        const { glassEffects, theme: _theme, ...columns } = preferences;
        const existingProfile = await tx.profile.findUnique({ where: { userId: id } });
        const profileData = {
          ...columns,
          preferences: {
            ...(existingProfile?.preferences ?? {}),
            glassEffects: glassEffects ?? existingProfile?.preferences?.glassEffects ?? true,
            theme: 'dark',
          },
        };
        await tx.profile.upsert({
          where: { userId: id },
          update: profileData,
          create: { userId: id, ...profileData },
        });
      }
      return tx.user.update({ where: { id }, data: userInput, include: { profile: true } });
    });
    return toUser(row);
  }

  async requestAccountDeletion(
    userId: string,
    guard?: { expectedPasswordHash: string },
  ): Promise<AccountDeletionRecord> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const existing = await tx.accountDeletion.findUnique({ where: { userId } });
      if (existing) return existing;
      // Lock the account before checking generation activity. Credit reservation uses the same lock.
      const locked = await tx.user.updateMany({
        where: {
          id: userId,
          status: 'ACTIVE',
          deletedAt: null,
          // Compare the credential verified by the service in the same write
          // that locks the account. A concurrent password reset must win over
          // a deletion authorized using the old password snapshot.
          ...(guard ? { passwordHash: guard.expectedPasswordHash } : {}),
        },
        data: { status: 'DELETION_PENDING', deletedAt: new Date() },
      });
      if (locked.count !== 1)
        throw conflict(
          guard ? 'DELETION_REAUTH_STALE' : 'ACCOUNT_UNAVAILABLE',
          guard
            ? 'Hesabın doğrulama bilgileri değişti. Güncel şifrenle yeniden doğrula.'
            : 'Hesap silme işlemi için kullanılamıyor.',
        );
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { accounts: true, wallet: true },
      });
      const busy = await tx.generation.count({
        where: { userId, status: { notIn: [...DELETION_IDLE_STATUSES] } },
      });
      if (busy || (user.wallet?.reserved ?? 0) > 0)
        throw conflict(
          'ACCOUNT_GENERATION_ACTIVE',
          'Devam eden üretim tamamlandıktan veya iptal edildikten sonra hesabını silebilirsin.',
        );
      const assets = await tx.asset.findMany({
        where: { ownerId: userId },
        select: { storageKey: true },
      });
      const record = await tx.accountDeletion.create({
        data: {
          userId,
          identityHashes: [
            deletionIdentityHash(this.identitySecret, 'email', user.email),
            ...user.accounts.map((account: any) =>
              deletionIdentityHash(
                this.identitySecret,
                account.provider,
                account.providerAccountId,
              ),
            ),
          ],
          storageKeys: assets.map((asset: { storageKey: string }) => asset.storageKey),
          notBefore: new Date(Date.now() + DELETION_GRACE_MS),
        },
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ACCOUNT_DELETION' },
      });
      return record;
    });
  }

  async listAuthProviders(userId: string) {
    const rows = await this.prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true },
    });
    return rows.map((row: { provider: import('./types.js').AuthProvider }) => row.provider);
  }

  private async lockWritableAccount(tx: PrismaClientLike, userId: string) {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        deletedAt: null,
        status: { notIn: ['DELETION_PENDING', 'DELETED', 'SUSPENDED'] },
      },
      data: { updatedAt: new Date() },
    });
    if (updated.count !== 1)
      throw conflict('ACCOUNT_UNAVAILABLE', 'Hesap yeni işlemler için kullanılamıyor.');
  }

  async listPendingAccountDeletions(now: Date, limit: number): Promise<AccountDeletionRecord[]> {
    return this.prisma.accountDeletion.findMany({
      where: { completedAt: null, notBefore: { lte: now } },
      take: Math.max(1, Math.min(100, limit)),
      orderBy: { createdAt: 'asc' },
    });
  }

  async completeAccountDeletion(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const record = await tx.accountDeletion.findUnique({ where: { userId } });
      if (!record || record.completedAt) return;
      const user = await tx.user.findUnique({ where: { id: userId }, include: { accounts: true } });
      const assets = await tx.asset.findMany({ where: { ownerId: userId }, select: { id: true } });
      await tx.moderationEvent.deleteMany({
        where: {
          OR: [
            { userId },
            { generation: { userId } },
            { assetId: { in: assets.map((asset: { id: string }) => asset.id) } },
          ],
        },
      });
      await tx.idempotencyRecord.deleteMany({ where: { userId } });
      if (user)
        await tx.pendingSocialLogin.deleteMany({
          where: {
            OR: [
              { providerEmail: user.email },
              ...user.accounts.map((account: { provider: string; providerAccountId: string }) => ({
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              })),
            ],
          },
        });
      await tx.generation.deleteMany({ where: { userId } });
      await tx.project.deleteMany({ where: { userId } });
      await tx.asset.deleteMany({ where: { ownerId: userId } });
      await tx.user.deleteMany({ where: { id: userId } });
      await tx.accountDeletion.update({
        where: { userId },
        data: { storageKeys: [], completedAt: new Date() },
      });
    });
  }

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const row = await this.prisma.session.create({
      data: {
        ...input,
        tokenFamilyId: input.tokenFamilyId ?? randomUUID(),
        deviceId: input.deviceId ?? null,
        deviceName: input.deviceName ?? null,
        platform: input.platform ?? null,
        appVersion: input.appVersion ?? null,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
    return toSession(row);
  }

  async getSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({ where: { refreshTokenHash } });
    return row ? toSession(row) : null;
  }

  async rotateSession(sessionId: string, next: CreateSessionInput): Promise<SessionRecord> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const current = await tx.session.findUnique({ where: { id: sessionId } });
      if (!current) throw notFound('SESSION_NOT_FOUND', 'Oturum bulunamadı.');
      // The same account lock is used by deletion. Then atomically claim the
      // refresh token: two requests that read it concurrently cannot fork it.
      await this.lockWritableAccount(tx, current.userId);
      const now = new Date();
      const claimed = await tx.session.updateMany({
        where: { id: sessionId, revokedAt: null, expiresAt: { gt: now } },
        data: {
          revokedAt: now,
          rotatedAt: now,
          revokedReason: 'ROTATED',
          lastUsedAt: now,
        },
      });
      if (claimed.count !== 1)
        throw unauthorized(
          'AUTH_REFRESH_TOKEN_REUSE',
          'Oturum güvenlik nedeniyle kapatıldı. Lütfen tekrar giriş yapın.',
        );
      const row = await tx.session.create({
        data: {
          ...next,
          userId: current.userId,
          tokenFamilyId: current.tokenFamilyId,
          deviceId: next.deviceId ?? null,
          deviceName: next.deviceName ?? null,
          platform: next.platform ?? null,
          appVersion: next.appVersion ?? null,
          ipHash: next.ipHash ?? null,
          userAgent: next.userAgent ?? null,
        },
      });
      return toSession(row);
    });
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeTokenFamily(tokenFamilyId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async listSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
    return rows.map(toSession);
  }

  async createEmailToken(
    input: Omit<EmailTokenRecord, 'id' | 'usedAt' | 'createdAt'>,
  ): Promise<EmailTokenRecord> {
    const row = await this.prisma.emailToken.create({ data: input });
    return { ...row, type: row.type as EmailTokenType, usedAt: null };
  }

  async consumeEmailToken(
    tokenHash: string,
    type: EmailTokenType,
  ): Promise<EmailTokenRecord | null> {
    const token = await this.prisma.emailToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) return null;
    const usedAt = new Date();
    const claimed = await this.prisma.emailToken.updateMany({
      where: { id: token.id, type, usedAt: null, expiresAt: { gt: usedAt } },
      data: { usedAt },
    });
    if (claimed.count !== 1) return null;
    return { ...token, usedAt, type: token.type as EmailTokenType };
  }

  async createAsset(input: CreateAssetInput): Promise<AssetRecord> {
    const row = await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      if (input.ownerId) await this.lockWritableAccount(tx, input.ownerId);
      return tx.asset.create({ data: { ...input, status: 'PENDING_UPLOAD', isPrivate: true } });
    });
    return toAsset(row);
  }

  async getAssetById(id: string): Promise<AssetRecord | null> {
    const row = await this.prisma.asset.findUnique({ where: { id } });
    return row ? toAsset(row) : null;
  }

  async updateAsset(
    id: string,
    input: Parameters<BirKareRepository['updateAsset']>[1],
  ): Promise<AssetRecord> {
    return toAsset(await this.prisma.asset.update({ where: { id }, data: input }));
  }

  async getCatalog(): Promise<CatalogSnapshot> {
    // PostgreSQL rows are authoritative. Returning in-memory fixture IDs for
    // missing rows would pass API validation and then fail Project foreign-key
    // checks. The canonical seed migration provisions these rows for a fresh
    // database; a missing/disabled database item must fail closed at validation.
    const [scenes, stylePresets, people] = await Promise.all([
      this.prisma.sceneTemplate.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.stylePreset.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.featuredPerson.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const sceneFixtures = new Map(catalogFixtures.scenes.map((item) => [item.slug, item]));
    const filterFixtures = new Map(catalogFixtures.filters.map((item) => [item.slug, item]));
    const styleFixtures = new Map(catalogFixtures.styles.map((item) => [item.slug, item]));
    const styleSlugs = new Set(styleFixtures.keys());
    return {
      scenes: scenes.map((row: any) => toCatalogItem(row, sceneFixtures.get(row.slug))),
      filters: stylePresets
        .filter((row: any) => !styleSlugs.has(row.slug))
        .map((row: any) => toCatalogItem(row, filterFixtures.get(row.slug))),
      styles: stylePresets
        .filter((row: any) => styleSlugs.has(row.slug))
        .map((row: any) => toCatalogItem(row, styleFixtures.get(row.slug))),
      featuredPeople: people.map(toCatalogFeaturedPerson),
    };
  }

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      await this.lockWritableAccount(tx, input.userId);
      return toProject(await tx.project.create({ data: input }));
    });
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    return row ? toProject(row) : null;
  }

  async listProjects(
    userId: string,
    input: { cursor?: string; limit: number; favoriteOnly?: boolean },
  ): Promise<{ items: ProjectRecord[]; nextCursor: string | null; hasMore: boolean }> {
    const rows = await this.prisma.project.findMany({
      where: { userId, deletedAt: null, ...(input.favoriteOnly ? { isFavorite: true } : {}) },
      orderBy: { updatedAt: 'desc' },
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
    });
    const hasMore = rows.length > input.limit;
    const items = (hasMore ? rows.slice(0, -1) : rows).map(toProject);
    return { items, hasMore, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async updateProject(
    id: string,
    input: Parameters<BirKareRepository['updateProject']>[1],
  ): Promise<ProjectRecord> {
    return toProject(await this.prisma.project.update({ where: { id }, data: input }));
  }

  async createGeneration(input: CreateGenerationInput): Promise<GenerationRecord> {
    const row = await this.prisma.generation.create({
      data: {
        id: input.id,
        userId: input.userId,
        projectId: input.projectId,
        parentGenerationId: input.parentGenerationId,
        quality: input.quality,
        requestedImageCount: input.requestedImageCount,
        aspectRatio: input.aspectRatio,
        preserveFace: input.preserveFace,
        preserveClothes: input.preserveClothes,
        recipe: input.recipe,
        userInstruction: input.userInstruction,
        provider: input.provider,
        model: input.model,
        reservedCredits: input.reservedCredits,
        status: 'QUEUED',
        stage: 'QUEUE_WAIT',
        progress: 25,
        inputs: { create: { assetId: input.sourceAssetId, role: 'PRIMARY_USER', sortOrder: 0 } },
      },
      include: { outputs: true, inputs: true },
    });
    return toGeneration(row);
  }

  async getGenerationById(id: string): Promise<GenerationRecord | null> {
    const row = await this.prisma.generation.findUnique({
      where: { id },
      include: {
        outputs: { orderBy: { variantIndex: 'asc' } },
        inputs: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return row ? toGeneration(row) : null;
  }

  async listProjectGenerations(projectId: string): Promise<GenerationRecord[]> {
    const rows = await this.prisma.generation.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { outputs: true, inputs: { orderBy: { sortOrder: 'asc' } } },
    });
    return rows.map(toGeneration);
  }

  async updateGeneration(
    id: string,
    input: Parameters<BirKareRepository['updateGeneration']>[1],
  ): Promise<GenerationRecord> {
    const { outputs: _outputs, sourceAssetId: _source, ...data } = input as any;
    const row = await this.prisma.generation.update({
      where: { id },
      data,
      include: { outputs: true, inputs: { orderBy: { sortOrder: 'asc' } } },
    });
    return toGeneration(row);
  }

  async addGenerationOutput(
    input: Omit<GenerationOutputRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationOutputRecord> {
    try {
      return toOutput(await this.prisma.generationOutput.create({ data: input }));
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const row = await this.prisma.generationOutput.findFirstOrThrow({
        where: { generationId: input.generationId, variantIndex: input.variantIndex },
      });
      return toOutput(row);
    }
  }

  async selectGenerationOutput(generationId: string, outputId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const output = await tx.generationOutput.findFirst({ where: { id: outputId, generationId } });
      if (!output) throw notFound('GENERATION_OUTPUT_NOT_FOUND', 'Üretim çıktısı bulunamadı.');
      await tx.generationOutput.updateMany({ where: { generationId }, data: { selected: false } });
      await tx.generationOutput.update({ where: { id: outputId }, data: { selected: true } });
    });
  }

  async addGenerationMessage(
    input: Omit<GenerationMessageRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationMessageRecord> {
    const row = await this.prisma.generationMessage.create({ data: input });
    return { ...row, role: row.role as GenerationMessageRecord['role'] };
  }

  async listGenerationMessages(generationId: string): Promise<GenerationMessageRecord[]> {
    const rows = await this.prisma.generationMessage.findMany({
      where: { generationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row: any) => ({ ...row, role: row.role as GenerationMessageRecord['role'] }));
  }

  async getWallet(userId: string): Promise<CreditWalletRecord> {
    const row = await this.prisma.creditWallet.findUnique({ where: { userId } });
    if (!row) throw notFound('WALLET_NOT_FOUND', 'Kredi cüzdanı bulunamadı.');
    return toWallet(row);
  }

  async reserveCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<{ wallet: CreditWalletRecord; reservationId: string }> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      await this.lockWritableAccount(tx, input.userId);
      const updated = await tx.creditWallet.updateMany({
        where: { userId: input.userId, available: { gte: input.amount } },
        data: {
          available: { decrement: input.amount },
          reserved: { increment: input.amount },
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const wallet = await tx.creditWallet.findUnique({ where: { userId: input.userId } });
        throw conflict(
          'GENERATION_INSUFFICIENT_CREDITS',
          'Bu üretim için yeterli krediniz bulunmuyor.',
          { required: input.amount, available: wallet?.available ?? 0 },
        );
      }
      const wallet = await tx.creditWallet.findUniqueOrThrow({ where: { userId: input.userId } });
      const transaction = await tx.creditTransaction.create({
        data: {
          userId: input.userId,
          type: 'GENERATION_RESERVATION',
          status: 'COMPLETED',
          amount: -input.amount,
          availableAfter: wallet.available,
          reservedAfter: wallet.reserved,
          referenceType: 'GENERATION',
          referenceId: input.generationId,
          idempotencyKey: input.idempotencyKey,
          description: 'Üretim kredi rezervasyonu',
          completedAt: new Date(),
        },
      });
      return { wallet: toWallet(wallet), reservationId: transaction.id };
    });
  }

  async captureCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
  }): Promise<CreditWalletRecord> {
    return this.adjustReservedCredits(input, 'capture');
  }

  async releaseCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
    reason?: string;
  }): Promise<CreditWalletRecord> {
    return this.adjustReservedCredits(input, 'release');
  }

  private async adjustReservedCredits(
    input: { userId: string; generationId: string; amount: number; reason?: string },
    action: 'capture' | 'release',
  ): Promise<CreditWalletRecord> {
    return this.prisma.$transaction(async (tx: PrismaClientLike) => {
      const reservation = await tx.creditTransaction.findFirst({
        where: {
          userId: input.userId,
          type: 'GENERATION_RESERVATION',
          status: 'COMPLETED',
          referenceType: 'GENERATION',
          referenceId: input.generationId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!reservation) {
        const wallet = await tx.creditWallet.findUniqueOrThrow({ where: { userId: input.userId } });
        return toWallet(wallet);
      }
      const amount = Math.abs(reservation.amount);
      const data =
        action === 'capture'
          ? {
              reserved: { decrement: amount },
              lifetimeSpent: { increment: amount },
              version: { increment: 1 },
            }
          : {
              reserved: { decrement: amount },
              available: { increment: amount },
              version: { increment: 1 },
            };
      const updated = await tx.creditWallet.updateMany({
        where: { userId: input.userId, reserved: { gte: amount } },
        data,
      });
      if (updated.count !== 1)
        throw conflict('CREDIT_RESERVATION_NOT_FOUND', 'Kredi rezervasyonu bulunamadı.');
      await tx.creditTransaction.update({
        where: { id: reservation.id },
        data: { status: 'REVERSED' },
      });
      const wallet = await tx.creditWallet.findUniqueOrThrow({ where: { userId: input.userId } });
      await tx.creditTransaction.create({
        data: {
          userId: input.userId,
          type: action === 'capture' ? 'GENERATION_CAPTURE' : 'GENERATION_RELEASE',
          status: 'COMPLETED',
          amount: action === 'capture' ? -amount : amount,
          availableAfter: wallet.available,
          reservedAfter: wallet.reserved,
          referenceType: 'GENERATION',
          referenceId: input.generationId,
          description:
            input.reason ??
            (action === 'capture'
              ? 'Üretim kredisi kesinleştirildi'
              : 'Üretim kredisi iade edildi'),
          completedAt: new Date(),
        },
      });
      return toWallet(wallet);
    });
  }

  async listCreditTransactions(userId: string): Promise<CreditTransactionRecord[]> {
    const rows = await this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toTransaction);
  }

  async claimSupportTicket(input: CreateSupportTicketInput): Promise<{ ticket: SupportTicketRecord; created: boolean }> {
    const id = randomUUID();
    const where = { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } };
    try {
      const ticket = await this.prisma.supportTicket.upsert({ where, create: { id, ...input }, update: {} });
      return { ticket, created: ticket.id === id };
    } catch (error) {
      // Some Prisma versions emulate upsert. Its unique constraint still elects
      // exactly one creator; a concurrent loser must never send another email.
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      const ticket = await this.prisma.supportTicket.findUnique({ where });
      if (!ticket) throw error;
      return { ticket, created: false };
    }
  }

  async getSupportTicket(userId: string, ticketId: string): Promise<SupportTicketRecord | null> {
    return this.prisma.supportTicket.findFirst({ where: { id: ticketId, userId } });
  }

  async completeSupportTicketDelivery(userId: string, ticketId: string, status: 'SENT' | 'UNCONFIRMED'): Promise<SupportTicketRecord> {
    await this.prisma.supportTicket.updateMany({ where: { id: ticketId, userId, status: 'PENDING' }, data: { status, sentAt: status === 'SENT' ? new Date() : null } });
    const ticket = await this.getSupportTicket(userId, ticketId);
    if (!ticket) throw notFound('SUPPORT_TICKET_NOT_FOUND', 'Destek talebi bulunamadı.');
    return ticket;
  }

  async getIdempotency(route: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.prisma.idempotencyRecord.findUnique({
      where: { route_key: { route, key } },
    });
    if (!row || row.expiresAt <= new Date()) return null;
    return { ...row, userId: row.userId ?? null, responseCode: row.responseCode ?? null };
  }

  async putIdempotency(
    input: Omit<IdempotencyRecord, 'id' | 'createdAt'>,
  ): Promise<IdempotencyRecord> {
    const row = await this.prisma.idempotencyRecord.upsert({
      where: { route_key: { route: input.route, key: input.key } },
      create: { ...input, userId: input.userId, responseBody: input.responseBody ?? undefined },
      update: {},
    });
    return { ...row, userId: row.userId ?? null, responseCode: row.responseCode ?? null };
  }
}

export async function connectPrismaRepository(identitySecret?: string): Promise<PrismaRepository> {
  const moduleName = '@prisma/client';
  const module = (await import(moduleName)) as { PrismaClient: new () => PrismaClientLike };
  const client = new module.PrismaClient();
  await client.$connect();
  return new PrismaRepository(client, identitySecret);
}
