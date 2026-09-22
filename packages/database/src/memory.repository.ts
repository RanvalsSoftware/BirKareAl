import {
  TERMINAL_GENERATION_STATUSES,
  catalogFixtures,
  conflict,
  createId,
  notFound,
  unauthorized,
} from '@birkare/shared';
import {
  accountDeletionRecoveryDeadline,
  deletionIdentityHash,
  DELETION_GRACE_MS,
  DELETION_IDLE_STATUSES,
} from './deletion.js';
import type { AccountDeletionRecord } from './types.js';
import {
  WELCOME_CREDIT_AMOUNT,
  WELCOME_CREDIT_REFERENCE_TYPE,
  welcomeCreditAbuseHash,
  welcomeCreditIdempotencyKey,
} from './credits.js';
import type {
  AuthAccountRecord,
  AssetRecord,
  BirKareRepository,
  CatalogSnapshot,
  CreateAssetInput,
  CreateGenerationInput,
  CreateProjectInput,
  CreateSessionInput,
  CreateSupportTicketInput,
  CreateUserInput,
  CreateUserConsentInput,
  CreateVerifiedSocialUserInput,
  CreatePendingSocialLoginInput,
  CreditTransactionRecord,
  CreditSettlementInput,
  CreditSettlementResult,
  CreditWalletRecord,
  GrantCreditsInput,
  EmailTokenRecord,
  EmailTokenType,
  EmailVerificationCompletionResult,
  GenerationMessageRecord,
  GenerationOutputRecord,
  GenerationRecord,
  IdempotencyRecord,
  LinkAuthAccountInput,
  PendingSocialLoginRecord,
  PasswordResetCompletionResult,
  ProjectRecord,
  SessionRecord,
  SocialAuthProvider,
  SupportTicketRecord,
  UserPreferences,
  UserConsentRecord,
  UserRecord,
} from './types.js';

const DEFAULT_PREFERENCES: UserPreferences = {
  keepSourcePhotos: true,
  marketingEmail: false,
  pushEnabled: true,
  reducedMotion: false,
  glassEffects: true,
  theme: 'dark',
  defaultAspectRatio: '4:5',
  defaultQuality: 'STANDARD',
};

const clone = <T>(value: T): T => structuredClone(value);
const providerAccountKey = (provider: SocialAuthProvider, providerAccountId: string): string =>
  `${provider}\u0000${providerAccountId}`;
const userConsentKey = (userId: string, type: string, version: string): string =>
  `${userId}\u0000${type}\u0000${version}`;

/**
 * Safe only for development and tests. It intentionally has the same repository
 * contract as the Prisma adapter, so no service has to special-case storage.
 */
export class MemoryRepository implements BirKareRepository {
  readonly kind = 'memory' as const;
  constructor(private readonly identitySecret = 'development-only-deletion-identity-key') {}
  private readonly accountDeletions = new Map<string, AccountDeletionRecord>();
  private readonly welcomeCreditClaims = new Set<string>();
  private readonly users = new Map<string, UserRecord>();
  private readonly userIdsByEmail = new Map<string, string>();
  private readonly authAccounts = new Map<string, AuthAccountRecord>();
  private readonly authAccountIdsByProviderAccount = new Map<string, string>();
  private readonly pendingSocialLogins = new Map<string, PendingSocialLoginRecord>();
  private readonly pendingSocialLoginIdsByTokenHash = new Map<string, string>();
  private readonly userConsents = new Map<string, UserConsentRecord>();
  private readonly userConsentIdsByUserTypeVersion = new Map<string, string>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly sessionIdsByRefreshHash = new Map<string, string>();
  private readonly emailTokens = new Map<string, EmailTokenRecord>();
  private readonly tokenIdsByHash = new Map<string, string>();
  private readonly assets = new Map<string, AssetRecord>();
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly generations = new Map<string, GenerationRecord>();
  private readonly generationOutputs = new Map<string, GenerationOutputRecord>();
  private readonly generationMessages = new Map<string, GenerationMessageRecord>();
  private readonly wallets = new Map<string, CreditWalletRecord>();
  private readonly transactions = new Map<string, CreditTransactionRecord>();
  private readonly transactionIdsByIdempotencyKey = new Map<string, string>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();
  private readonly supportTickets = new Map<string, SupportTicketRecord>();

  async readiness(): Promise<{ ready: boolean; detail?: string }> {
    return { ready: true, detail: 'development in-memory repository' };
  }

  async disconnect(): Promise<void> {}

  async backfillWelcomeCreditClaims(): Promise<number> {
    let created = 0;
    for (const transaction of this.transactions.values()) {
      if (transaction.referenceType !== WELCOME_CREDIT_REFERENCE_TYPE) continue;
      const user = this.users.get(transaction.userId);
      if (!user) continue;
      const abuseKeyHash = welcomeCreditAbuseHash(this.identitySecret, user.email);
      if (this.welcomeCreditClaims.has(abuseKeyHash)) continue;
      this.welcomeCreditClaims.add(abuseKeyHash);
      created += 1;
    }
    return created;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    if (this.userIdsByEmail.has(email))
      throw conflict('AUTH_EMAIL_ALREADY_EXISTS', 'Bu e-posta adresiyle zaten bir hesap var.');
    const now = new Date();
    const user: UserRecord = {
      id: createId(),
      email,
      passwordHash: input.passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      role: 'USER',
      status: 'PENDING_VERIFICATION',
      emailVerifiedAt: null,
      locale: input.locale,
      countryCode: null,
      dateOfBirth: input.dateOfBirth ?? null,
      lastLoginAt: null,
      preferences: clone(DEFAULT_PREFERENCES),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.set(user.id, user);
    this.userIdsByEmail.set(email, user.id);
    this.recordUserConsents(user.id, input.consents);

    const wallet: CreditWalletRecord = {
      id: createId(),
      userId: user.id,
      unlimited: false,
      available: 0,
      reserved: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.wallets.set(user.id, wallet);
    return clone(user);
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? clone(user) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const id = this.userIdsByEmail.get(email.toLowerCase());
    return id ? this.getUserById(id) : null;
  }

  async getUserByAuthAccount(
    provider: SocialAuthProvider,
    providerAccountId: string,
  ): Promise<UserRecord | null> {
    const accountId = this.authAccountIdsByProviderAccount.get(
      providerAccountKey(provider, providerAccountId),
    );
    const account = accountId ? this.authAccounts.get(accountId) : undefined;
    return account ? this.getUserById(account.userId) : null;
  }

  async createVerifiedSocialUser(input: CreateVerifiedSocialUserInput): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    const wasDeleted = this.wasDeleted([
      deletionIdentityHash(this.identitySecret, 'email', email),
      deletionIdentityHash(this.identitySecret, input.provider, input.providerAccountId),
    ]);
    const abuseKeyHash =
      input.welcomeCreditAbuseHash ??
      welcomeCreditAbuseHash(this.identitySecret, email);
    const welcomeAmount =
      !wasDeleted && !this.welcomeCreditClaims.has(abuseKeyHash) ? WELCOME_CREDIT_AMOUNT : 0;
    const accountKey = providerAccountKey(input.provider, input.providerAccountId);
    if (this.userIdsByEmail.has(email))
      throw conflict('AUTH_EMAIL_ALREADY_EXISTS', 'Bu e-posta adresiyle zaten bir hesap var.');
    if (this.authAccountIdsByProviderAccount.has(accountKey))
      throw conflict('AUTH_SOCIAL_ACCOUNT_CONFLICT', 'Bu sosyal hesap zaten bağlı.');

    const now = new Date();
    const user: UserRecord = {
      id: createId(),
      email,
      passwordHash: null,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: now,
      locale: input.locale,
      countryCode: null,
      dateOfBirth: input.dateOfBirth,
      lastLoginAt: null,
      preferences: clone(DEFAULT_PREFERENCES),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const account: AuthAccountRecord = {
      id: createId(),
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerEmail: input.providerEmail,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    this.userIdsByEmail.set(email, user.id);
    this.authAccounts.set(account.id, account);
    this.authAccountIdsByProviderAccount.set(accountKey, account.id);
    if (welcomeAmount > 0) this.welcomeCreditClaims.add(abuseKeyHash);
    this.recordUserConsents(user.id, input.consents);

    const wallet: CreditWalletRecord = {
      id: createId(),
      userId: user.id,
      unlimited: false,
      available: welcomeAmount,
      reserved: 0,
      lifetimeEarned: welcomeAmount,
      lifetimeSpent: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.wallets.set(user.id, wallet);
    if (welcomeAmount > 0)
      this.recordTransaction({
        userId: user.id,
        type: 'BONUS',
        amount: welcomeAmount,
        availableAfter: wallet.available,
        reservedAfter: wallet.reserved,
        referenceType: WELCOME_CREDIT_REFERENCE_TYPE,
        referenceId: null,
        idempotencyKey: welcomeCreditIdempotencyKey(user.id),
        description: 'BirKare AI hoş geldin kredisi',
      });
    return clone(user);
  }

  async linkAuthAccount(input: LinkAuthAccountInput): Promise<void> {
    this.assertAccountWritable(input.userId);
    const accountKey = providerAccountKey(input.provider, input.providerAccountId);
    const existingId = this.authAccountIdsByProviderAccount.get(accountKey);
    if (existingId) {
      const existing = this.authAccounts.get(existingId);
      if (existing?.userId === input.userId) return;
      throw conflict('AUTH_SOCIAL_ALREADY_LINKED', 'Bu sosyal hesap başka bir hesaba bağlı.');
    }
    if (!this.users.has(input.userId)) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
    const now = new Date();
    const account: AuthAccountRecord = {
      id: createId(),
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerEmail: input.providerEmail,
      createdAt: now,
      updatedAt: now,
    };
    this.authAccounts.set(account.id, account);
    this.authAccountIdsByProviderAccount.set(accountKey, account.id);
  }

  async createPendingSocialLogin(
    input: CreatePendingSocialLoginInput,
  ): Promise<PendingSocialLoginRecord> {
    if (this.pendingSocialLoginIdsByTokenHash.has(input.tokenHash))
      throw conflict('AUTH_SOCIAL_PENDING_CONFLICT', 'Sosyal kayıt başlatılamadı.');
    const record: PendingSocialLoginRecord = {
      id: createId(),
      ...input,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.pendingSocialLogins.set(record.id, record);
    this.pendingSocialLoginIdsByTokenHash.set(record.tokenHash, record.id);
    return clone(record);
  }

  async consumePendingSocialLogin(
    tokenHash: string,
    provider: SocialAuthProvider,
  ): Promise<PendingSocialLoginRecord | null> {
    const id = this.pendingSocialLoginIdsByTokenHash.get(tokenHash);
    const record = id ? this.pendingSocialLogins.get(id) : undefined;
    if (
      !record ||
      record.provider !== provider ||
      record.consumedAt ||
      record.expiresAt <= new Date()
    )
      return null;
    record.consumedAt = new Date();
    return clone(record);
  }

  async purgePendingSocialLogins(input: { before: Date; limit: number }): Promise<number> {
    const records = [...this.pendingSocialLogins.values()]
      .filter((record) => record.consumedAt || record.expiresAt <= input.before)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, Math.max(0, input.limit));
    for (const record of records) {
      this.pendingSocialLogins.delete(record.id);
      this.pendingSocialLoginIdsByTokenHash.delete(record.tokenHash);
    }
    return records.length;
  }

  async listUserConsents(userId: string): Promise<UserConsentRecord[]> {
    return [...this.userConsents.values()]
      .filter((record) => record.userId === userId)
      .sort(
        (a, b) => a.acceptedAt.getTime() - b.acceptedAt.getTime() || a.type.localeCompare(b.type),
      )
      .map(clone);
  }

  async updateUser(
    id: string,
    input: Partial<
      Pick<
        UserRecord,
        | 'passwordHash'
        | 'firstName'
        | 'lastName'
        | 'locale'
        | 'status'
        | 'emailVerifiedAt'
        | 'lastLoginAt'
        | 'deletedAt'
        | 'preferences'
      >
    >,
  ): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
    Object.assign(user, input, { updatedAt: new Date() });
    return clone(user);
  }

  private wasDeleted(hashes: string[]) {
    return (
      hashes.some((hash) => this.welcomeCreditClaims.has(hash)) ||
      [...this.accountDeletions.values()].some((record) =>
        record.identityHashes.some((hash) => hashes.includes(hash)),
      )
    );
  }

  private assertAccountWritable(userId: string) {
    const user = this.users.get(userId);
    if (
      !user ||
      user.deletedAt ||
      ['DELETION_PENDING', 'DELETED', 'SUSPENDED'].includes(user.status)
    )
      throw conflict('ACCOUNT_UNAVAILABLE', 'Hesap yeni işlemler için kullanılamıyor.');
  }

  async listAuthProviders(userId: string) {
    return [...this.authAccounts.values()]
      .filter((item) => item.userId === userId)
      .map((item) => item.provider);
  }

  async requestAccountDeletion(
    userId: string,
    guard?: { expectedPasswordHash: string },
  ): Promise<AccountDeletionRecord> {
    const existing = this.accountDeletions.get(userId);
    if (existing) return clone(existing);
    const user = this.users.get(userId);
    if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
    if (user.status !== 'ACTIVE' || user.deletedAt)
      throw conflict('ACCOUNT_UNAVAILABLE', 'Hesap silme işlemi için kullanılamıyor.');
    if (guard && user.passwordHash !== guard.expectedPasswordHash)
      throw conflict(
        'DELETION_REAUTH_STALE',
        'Hesabın doğrulama bilgileri değişti. Güncel şifrenle yeniden doğrula.',
      );
    const busy = [...this.generations.values()].some(
      (item) =>
        item.userId === userId &&
        !(DELETION_IDLE_STATUSES as readonly string[]).includes(item.status),
    );
    if (busy || (this.wallets.get(userId)?.reserved ?? 0) > 0)
      throw conflict(
        'ACCOUNT_GENERATION_ACTIVE',
        'Devam eden üretim tamamlandıktan veya iptal edildikten sonra hesabını silebilirsin.',
      );
    const now = new Date();
    const accounts = [...this.authAccounts.values()].filter((item) => item.userId === userId);
    const identityHashes = [
      deletionIdentityHash(this.identitySecret, 'email', user.email),
      ...accounts.map((account) =>
        deletionIdentityHash(this.identitySecret, account.provider, account.providerAccountId),
      ),
    ];
    const record: AccountDeletionRecord = {
      userId,
      createdAt: now,
      completedAt: null,
      notBefore: new Date(now.getTime() + DELETION_GRACE_MS),
      identityHashes,
      storageKeys: [...this.assets.values()]
        .filter((asset) => asset.ownerId === userId)
        .map((asset) => asset.storageKey),
    };
    // These keyed hashes are the durable fraud-prevention registry. They contain
    // no raw e-mail/provider identifiers and survive the 30-day deletion audit row.
    for (const hash of identityHashes) this.welcomeCreditClaims.add(hash);
    this.accountDeletions.set(userId, record);
    Object.assign(user, { status: 'DELETION_PENDING', deletedAt: now, updatedAt: now });
    await this.revokeAllUserSessions(userId, 'ACCOUNT_DELETION');
    return clone(record);
  }

  async getAccountDeletion(userId: string): Promise<AccountDeletionRecord | null> {
    const record = this.accountDeletions.get(userId);
    return record ? clone(record) : null;
  }

  async restoreAccountDeletion(
    userId: string,
    now: Date,
  ): Promise<AccountDeletionRecord | null> {
    const record = this.accountDeletions.get(userId);
    const user = this.users.get(userId);
    if (
      !record ||
      record.completedAt ||
      accountDeletionRecoveryDeadline(record) <= now ||
      !user ||
      user.status !== 'DELETION_PENDING'
    )
      return null;
    Object.assign(user, {
      status: 'ACTIVE',
      deletedAt: null,
      updatedAt: now,
    });
    this.accountDeletions.delete(userId);
    return clone(record);
  }

  async listPendingAccountDeletions(now: Date, limit: number): Promise<AccountDeletionRecord[]> {
    return clone(
      [...this.accountDeletions.values()]
        .filter(
          (item) =>
            !item.completedAt && accountDeletionRecoveryDeadline(item) <= now,
        )
        .slice(0, limit),
    );
  }

  async completeAccountDeletion(userId: string): Promise<void> {
    const record = this.accountDeletions.get(userId);
    if (!record || record.completedAt) return;
    const user = this.users.get(userId);
    const generationIds = new Set(
      [...this.generations.values()]
        .filter((item) => item.userId === userId)
        .map((item) => item.id),
    );
    for (const [id, item] of this.generationOutputs)
      if (generationIds.has(item.generationId)) this.generationOutputs.delete(id);
    for (const [id, item] of this.generationMessages)
      if (generationIds.has(item.generationId)) this.generationMessages.delete(id);
    for (const id of generationIds) this.generations.delete(id);
    for (const [id, item] of this.projects) if (item.userId === userId) this.projects.delete(id);
    for (const [id, item] of this.assets) if (item.ownerId === userId) this.assets.delete(id);
    for (const [id, item] of this.transactions)
      if (item.userId === userId) {
        this.transactions.delete(id);
        if (item.idempotencyKey) this.transactionIdsByIdempotencyKey.delete(item.idempotencyKey);
      }
    for (const [id, item] of this.sessions)
      if (item.userId === userId) {
        this.sessions.delete(id);
        this.sessionIdsByRefreshHash.delete(item.refreshTokenHash);
      }
    for (const [id, item] of this.emailTokens)
      if (item.userId === userId) {
        this.emailTokens.delete(id);
        this.tokenIdsByHash.delete(item.tokenHash);
      }
    for (const [id, item] of this.authAccounts)
      if (item.userId === userId) {
        this.authAccounts.delete(id);
        this.authAccountIdsByProviderAccount.delete(
          providerAccountKey(item.provider as SocialAuthProvider, item.providerAccountId),
        );
      }
    for (const [id, item] of this.userConsents)
      if (item.userId === userId) {
        this.userConsents.delete(id);
        this.userConsentIdsByUserTypeVersion.delete(
          userConsentKey(userId, item.type, item.version),
        );
      }
    for (const [id, item] of this.pendingSocialLogins)
      if (
        item.providerEmail === user?.email ||
        record.identityHashes.includes(
          deletionIdentityHash(this.identitySecret, item.provider, item.providerAccountId),
        )
      ) {
        this.pendingSocialLogins.delete(id);
        this.pendingSocialLoginIdsByTokenHash.delete(item.tokenHash);
      }
    for (const [id, item] of this.idempotency)
      if (item.userId === userId) this.idempotency.delete(id);
    for (const [id, item] of this.supportTickets)
      if (item.userId === userId) this.supportTickets.delete(id);
    if (user) this.userIdsByEmail.delete(user.email.toLowerCase());
    this.users.delete(userId);
    this.wallets.delete(userId);
    record.storageKeys = [];
    record.completedAt = new Date();
  }

  async purgeCompletedAccountDeletions(before: Date, limit: number): Promise<number> {
    const rows = [...this.accountDeletions.values()]
      .filter((record) => Boolean(record.completedAt && record.completedAt <= before))
      .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0))
      .slice(0, Math.max(0, limit));
    for (const row of rows) this.accountDeletions.delete(row.userId);
    return rows.length;
  }

  async createSession(
    input: CreateSessionInput,
    guard?: { expectedPasswordHash: string },
  ): Promise<SessionRecord> {
    this.assertAccountWritable(input.userId);
    if (guard && this.users.get(input.userId)?.passwordHash !== guard.expectedPasswordHash)
      throw unauthorized('AUTH_INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    const now = new Date();
    const session: SessionRecord = {
      id: createId(),
      userId: input.userId,
      tokenFamilyId: input.tokenFamilyId ?? createId(),
      refreshTokenHash: input.refreshTokenHash,
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
      appVersion: input.appVersion ?? null,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt: input.expiresAt,
      lastUsedAt: now,
      rotatedAt: null,
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
    };
    this.sessions.set(session.id, session);
    this.sessionIdsByRefreshHash.set(session.refreshTokenHash, session.id);
    return clone(session);
  }

  async getSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRecord | null> {
    const id = this.sessionIdsByRefreshHash.get(refreshTokenHash);
    const session = id ? this.sessions.get(id) : undefined;
    return session ? clone(session) : null;
  }

  async getSessionById(id: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(id);
    return session ? clone(session) : null;
  }

  async rotateSession(sessionId: string, next: CreateSessionInput): Promise<SessionRecord> {
    const current = this.sessions.get(sessionId);
    if (!current) throw notFound('SESSION_NOT_FOUND', 'Oturum bulunamadı.');
    this.assertAccountWritable(current.userId);
    const now = new Date();
    if (current.revokedAt || current.expiresAt <= now)
      throw unauthorized(
        'AUTH_REFRESH_TOKEN_REUSE',
        'Oturum güvenlik nedeniyle kapatıldı. Lütfen tekrar giriş yapın.',
      );
    current.rotatedAt = now;
    current.revokedAt = now;
    current.revokedReason = 'ROTATED';
    current.lastUsedAt = now;
    const session: SessionRecord = {
      id: createId(),
      ...next,
      userId: current.userId,
      tokenFamilyId: current.tokenFamilyId,
      deviceId: next.deviceId ?? null,
      deviceName: next.deviceName ?? null,
      platform: next.platform ?? null,
      appVersion: next.appVersion ?? null,
      ipHash: next.ipHash ?? null,
      userAgent: next.userAgent ?? null,
      lastUsedAt: now,
      rotatedAt: null,
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
    };
    this.sessions.set(session.id, session);
    this.sessionIdsByRefreshHash.set(session.refreshTokenHash, session.id);
    return clone(session);
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) return;
    session.revokedAt = new Date();
    session.revokedReason = reason;
  }

  async revokeTokenFamily(tokenFamilyId: string, reason: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.tokenFamilyId === tokenFamilyId && !session.revokedAt) {
        session.revokedAt = new Date();
        session.revokedReason = reason;
      }
    }
  }

  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = new Date();
        session.revokedReason = reason;
      }
    }
  }

  async listSessions(userId: string): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
      .map(clone);
  }

  async createEmailToken(
    input: Omit<EmailTokenRecord, 'id' | 'usedAt' | 'createdAt'>,
  ): Promise<EmailTokenRecord> {
    const token: EmailTokenRecord = {
      id: createId(),
      ...input,
      usedAt: null,
      createdAt: new Date(),
    };
    this.emailTokens.set(token.id, token);
    this.tokenIdsByHash.set(token.tokenHash, token.id);
    return clone(token);
  }

  async replaceEmailToken(
    input: Omit<EmailTokenRecord, 'id' | 'usedAt' | 'createdAt'>,
  ): Promise<EmailTokenRecord> {
    for (const [id, token] of this.emailTokens) {
      if (token.userId !== input.userId || token.type !== input.type) continue;
      this.emailTokens.delete(id);
      this.tokenIdsByHash.delete(token.tokenHash);
    }
    return this.createEmailToken(input);
  }

  async consumeEmailToken(
    tokenHash: string,
    type: EmailTokenType,
  ): Promise<EmailTokenRecord | null> {
    const id = this.tokenIdsByHash.get(tokenHash);
    const token = id ? this.emailTokens.get(id) : undefined;
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) return null;
    token.usedAt = new Date();
    return clone(token);
  }

  async completePasswordReset(
    tokenHash: string,
    passwordHash: string,
  ): Promise<PasswordResetCompletionResult> {
    const now = new Date();
    const tokenId = this.tokenIdsByHash.get(tokenHash);
    const token = tokenId ? this.emailTokens.get(tokenId) : undefined;
    if (!token || token.type !== 'RESET_PASSWORD' || token.usedAt || token.expiresAt <= now)
      return 'INVALID_TOKEN';

    const user = this.users.get(token.userId);
    if (!user || user.deletedAt || ['DELETION_PENDING', 'DELETED'].includes(user.status))
      return 'ACCOUNT_UNAVAILABLE';
    if (user.status === 'SUSPENDED') return 'ACCOUNT_SUSPENDED';

    // There are no awaits below this point. These in-memory mutations therefore
    // form one event-loop critical section, matching the Prisma transaction.
    user.passwordHash = passwordHash;
    user.updatedAt = now;
    for (const candidate of this.emailTokens.values()) {
      if (candidate.userId === user.id && candidate.type === 'RESET_PASSWORD' && !candidate.usedAt)
        candidate.usedAt = now;
    }
    for (const session of this.sessions.values()) {
      if (session.userId === user.id && !session.revokedAt) {
        session.revokedAt = now;
        session.revokedReason = 'PASSWORD_RESET';
      }
    }
    return 'COMPLETED';
  }

  async completeEmailVerification(
    userId: string,
    tokenHash: string,
    maxFailedAttempts: number,
    welcomeCreditAbuseHash: string,
  ): Promise<EmailVerificationCompletionResult> {
    const now = new Date();
    const user = this.users.get(userId);
    if (!user || user.deletedAt || ['DELETION_PENDING', 'DELETED'].includes(user.status))
      return { status: 'ACCOUNT_UNAVAILABLE', welcomeCreditsGranted: false };
    if (user.status === 'SUSPENDED')
      return { status: 'ACCOUNT_SUSPENDED', welcomeCreditsGranted: false };
    if (user.emailVerifiedAt || user.status !== 'PENDING_VERIFICATION')
      return { status: 'INVALID_TOKEN', welcomeCreditsGranted: false };
    const token = [...this.emailTokens.values()]
      .filter(
        (candidate) =>
          candidate.userId === userId &&
          candidate.type === 'VERIFY_EMAIL' &&
          !candidate.usedAt &&
          candidate.expiresAt > now,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    if (!token || token.failedAttempts >= maxFailedAttempts)
      return { status: 'INVALID_TOKEN', welcomeCreditsGranted: false };
    if (token.tokenHash !== tokenHash) {
      token.failedAttempts += 1;
      if (token.failedAttempts >= maxFailedAttempts) token.usedAt = now;
      return { status: 'INVALID_TOKEN', welcomeCreditsGranted: false };
    }
    token.usedAt = now;
    user.emailVerifiedAt = now;
    user.status = 'ACTIVE';
    user.updatedAt = now;

    const wasDeleted = this.wasDeleted([
      deletionIdentityHash(this.identitySecret, 'email', user.email),
    ]);
    const existingWelcome = [...this.transactions.values()].some(
      (transaction) =>
        transaction.userId === userId &&
        transaction.referenceType === WELCOME_CREDIT_REFERENCE_TYPE,
    );
    const wallet = this.wallets.get(userId);
    const shouldGrant =
      Boolean(wallet) &&
      !wasDeleted &&
      !existingWelcome &&
      !this.welcomeCreditClaims.has(welcomeCreditAbuseHash);
    if (shouldGrant && wallet) {
      this.welcomeCreditClaims.add(welcomeCreditAbuseHash);
      wallet.available += WELCOME_CREDIT_AMOUNT;
      wallet.lifetimeEarned += WELCOME_CREDIT_AMOUNT;
      wallet.version += 1;
      wallet.updatedAt = now;
      this.recordTransaction({
        userId,
        type: 'BONUS',
        amount: WELCOME_CREDIT_AMOUNT,
        availableAfter: wallet.available,
        reservedAfter: wallet.reserved,
        referenceType: WELCOME_CREDIT_REFERENCE_TYPE,
        referenceId: null,
        idempotencyKey: welcomeCreditIdempotencyKey(userId),
        description: 'BirKare AI hoş geldin kredisi',
      });
    }
    return { status: 'VERIFIED', welcomeCreditsGranted: shouldGrant };
  }

  async invalidateEmailTokens(userId: string, type: EmailTokenType): Promise<void> {
    const usedAt = new Date();
    for (const token of this.emailTokens.values()) {
      if (token.userId === userId && token.type === type && !token.usedAt) token.usedAt = usedAt;
    }
  }

  async createAsset(input: CreateAssetInput): Promise<AssetRecord> {
    if (input.ownerId) this.assertAccountWritable(input.ownerId);
    const now = new Date();
    const asset: AssetRecord = {
      id: input.id ?? createId(),
      ownerId: input.ownerId,
      type: input.type,
      status: 'PENDING_UPLOAD',
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      width: null,
      height: null,
      isPrivate: true,
      retentionUntil: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.assets.set(asset.id, asset);
    return clone(asset);
  }

  async getAssetById(id: string): Promise<AssetRecord | null> {
    const asset = this.assets.get(id);
    return asset ? clone(asset) : null;
  }

  async updateAsset(
    id: string,
    input: Partial<
      Pick<AssetRecord, 'status' | 'storageKey' | 'sha256' | 'width' | 'height' | 'deletedAt'>
    >,
  ): Promise<AssetRecord> {
    const asset = this.assets.get(id);
    if (!asset) throw notFound('ASSET_NOT_FOUND', 'Görsel bulunamadı.');
    Object.assign(asset, input, { updatedAt: new Date() });
    return clone(asset);
  }

  async getCatalog(): Promise<CatalogSnapshot> {
    return clone(catalogFixtures);
  }

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    this.assertAccountWritable(input.userId);
    const now = new Date();
    const project: ProjectRecord = {
      id: createId(),
      userId: input.userId,
      title: input.title,
      mode: input.mode,
      status: 'DRAFT',
      sourceAssetId: input.sourceAssetId,
      sceneTemplateId: input.sceneTemplateId,
      stylePresetId: input.stylePresetId,
      featuredPersonId: input.featuredPersonId,
      composition: input.composition,
      aspectRatio: input.aspectRatio,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.projects.set(project.id, project);
    return clone(project);
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    const project = this.projects.get(id);
    return project ? clone(project) : null;
  }

  async listProjects(
    userId: string,
    input: { cursor?: string; limit: number; favoriteOnly?: boolean },
  ): Promise<{ items: ProjectRecord[]; nextCursor: string | null; hasMore: boolean }> {
    const all = [...this.projects.values()]
      .filter(
        (project) =>
          project.userId === userId &&
          !project.deletedAt &&
          (!input.favoriteOnly || project.isFavorite),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const start = input.cursor
      ? Math.max(0, all.findIndex((project) => project.id === input.cursor) + 1)
      : 0;
    const slice = all.slice(start, start + input.limit + 1);
    const hasMore = slice.length > input.limit;
    const items = (hasMore ? slice.slice(0, -1) : slice).map(clone);
    return { items, hasMore, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async updateProject(
    id: string,
    input: Partial<
      Pick<
        ProjectRecord,
        | 'title'
        | 'status'
        | 'sceneTemplateId'
        | 'stylePresetId'
        | 'featuredPersonId'
        | 'composition'
        | 'aspectRatio'
        | 'isFavorite'
        | 'deletedAt'
      >
    >,
  ): Promise<ProjectRecord> {
    const project = this.projects.get(id);
    if (!project) throw notFound('PROJECT_NOT_FOUND', 'Proje bulunamadı.');
    Object.assign(project, input, { updatedAt: new Date() });
    return clone(project);
  }

  async createGeneration(input: CreateGenerationInput): Promise<GenerationRecord> {
    const now = new Date();
    const generationId = input.id ?? createId();
    const generationInputs = (
      input.inputs?.length
        ? input.inputs
        : [{ assetId: input.sourceAssetId, role: 'PRIMARY_USER' as const, sortOrder: 0 }]
    ).map((item) => ({
      id: createId(),
      generationId,
      assetId: item.assetId,
      role: item.role,
      sortOrder: item.sortOrder,
      createdAt: now,
    }));
    const generation: GenerationRecord = {
      id: generationId,
      userId: input.userId,
      projectId: input.projectId,
      parentGenerationId: input.parentGenerationId,
      sourceAssetId: input.sourceAssetId,
      status: 'QUEUED',
      stage: 'QUEUE_WAIT',
      progress: 25,
      quality: input.quality,
      requestedImageCount: input.requestedImageCount,
      aspectRatio: input.aspectRatio,
      preserveFace: input.preserveFace,
      preserveClothes: input.preserveClothes,
      recipe: input.recipe,
      userInstruction: input.userInstruction,
      compiledPrompt: input.compiledPrompt ?? null,
      promptVersion: input.promptVersion ?? null,
      provider: input.provider,
      model: input.model,
      providerRequestId: null,
      providerUsage: null,
      reservedCredits: input.reservedCredits,
      chargedCredits: 0,
      refundedCredits: 0,
      failureCode: null,
      failureMessage: null,
      retryCount: 0,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      inputs: generationInputs,
      outputs: [],
    };
    this.generations.set(generation.id, generation);
    return clone(generation);
  }

  async getGenerationById(id: string): Promise<GenerationRecord | null> {
    const generation = this.generations.get(id);
    if (!generation) return null;
    generation.outputs = [...this.generationOutputs.values()]
      .filter((output) => output.generationId === id)
      .sort((a, b) => a.variantIndex - b.variantIndex)
      .map(clone);
    return clone(generation);
  }

  async listProjectGenerations(projectId: string): Promise<GenerationRecord[]> {
    const records = [...this.generations.values()]
      .filter((generation) => generation.projectId === projectId && !generation.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.all(
      records.map((record) => this.getGenerationById(record.id) as Promise<GenerationRecord>),
    );
  }

  async updateGeneration(
    id: string,
    input: Partial<
      Omit<
        GenerationRecord,
        'id' | 'userId' | 'projectId' | 'sourceAssetId' | 'createdAt' | 'inputs' | 'outputs'
      >
    >,
  ): Promise<GenerationRecord> {
    const generation = this.generations.get(id);
    if (!generation) throw notFound('GENERATION_NOT_FOUND', 'Üretim bulunamadı.');
    if (
      input.status &&
      TERMINAL_GENERATION_STATUSES.has(generation.status) &&
      input.status !== generation.status
    ) {
      return (await this.getGenerationById(id))!;
    }
    Object.assign(generation, input, { updatedAt: new Date() });
    return (await this.getGenerationById(id))!;
  }

  async addGenerationOutput(
    input: Omit<GenerationOutputRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationOutputRecord> {
    if (!this.generations.has(input.generationId))
      throw notFound('GENERATION_NOT_FOUND', 'Üretim bulunamadı.');
    const existing = [...this.generationOutputs.values()].find(
      (output) =>
        output.generationId === input.generationId && output.variantIndex === input.variantIndex,
    );
    if (existing) return clone(existing);
    const output: GenerationOutputRecord = { id: createId(), ...input, createdAt: new Date() };
    this.generationOutputs.set(output.id, output);
    return clone(output);
  }

  async selectGenerationOutput(generationId: string, outputId: string): Promise<void> {
    let matched = false;
    for (const output of this.generationOutputs.values()) {
      if (output.generationId === generationId) {
        output.selected = output.id === outputId;
        if (output.selected) matched = true;
      }
    }
    if (!matched) throw notFound('GENERATION_OUTPUT_NOT_FOUND', 'Üretim çıktısı bulunamadı.');
  }

  async addGenerationMessage(
    input: Omit<GenerationMessageRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationMessageRecord> {
    const message: GenerationMessageRecord = { id: createId(), ...input, createdAt: new Date() };
    this.generationMessages.set(message.id, message);
    return clone(message);
  }

  async listGenerationMessages(generationId: string): Promise<GenerationMessageRecord[]> {
    return [...this.generationMessages.values()]
      .filter((message) => message.generationId === generationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async getWallet(userId: string): Promise<CreditWalletRecord> {
    const wallet = this.wallets.get(userId);
    if (!wallet) throw notFound('WALLET_NOT_FOUND', 'Kredi cüzdanı bulunamadı.');
    return clone(wallet);
  }

  async reserveCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<{ wallet: CreditWalletRecord; reservationId: string }> {
    this.assertAccountWritable(input.userId);
    const wallet = this.wallets.get(input.userId);
    if (!wallet) throw notFound('WALLET_NOT_FOUND', 'Kredi cüzdanı bulunamadı.');
    if (input.idempotencyKey) {
      const existingId = this.transactionIdsByIdempotencyKey.get(input.idempotencyKey);
      const existing = existingId ? this.transactions.get(existingId) : undefined;
      if (existing) {
        if (
          existing.userId !== input.userId ||
          existing.type !== 'GENERATION_RESERVATION' ||
          existing.referenceType !== 'GENERATION' ||
          existing.referenceId !== input.generationId
        ) {
          throw conflict(
            'IDEMPOTENCY_KEY_REUSED',
            'Bu Idempotency-Key farklı bir kredi işlemiyle zaten kullanıldı.',
          );
        }
        return { wallet: clone(wallet), reservationId: existing.id };
      }
    }
    if (wallet.unlimited) {
      const reservation = this.recordTransaction({
        userId: input.userId,
        type: 'GENERATION_RESERVATION',
        amount: 0,
        availableAfter: wallet.available,
        reservedAfter: wallet.reserved,
        referenceType: 'GENERATION',
        referenceId: input.generationId,
        idempotencyKey: input.idempotencyKey ?? null,
        description: 'Sınırsız hesap üretim rezervasyonu',
      });
      return { wallet: clone(wallet), reservationId: reservation.id };
    }
    if (wallet.available < input.amount) {
      throw conflict(
        'GENERATION_INSUFFICIENT_CREDITS',
        'Bu üretim için yeterli krediniz bulunmuyor.',
        { required: input.amount, available: wallet.available },
      );
    }
    wallet.available -= input.amount;
    wallet.reserved += input.amount;
    wallet.version += 1;
    wallet.updatedAt = new Date();
    const reservation = this.recordTransaction({
      userId: input.userId,
      type: 'GENERATION_RESERVATION',
      amount: -input.amount,
      availableAfter: wallet.available,
      reservedAfter: wallet.reserved,
      referenceType: 'GENERATION',
      referenceId: input.generationId,
      idempotencyKey: input.idempotencyKey ?? null,
      description: 'Üretim kredi rezervasyonu',
    });
    return { wallet: clone(wallet), reservationId: reservation.id };
  }

  async captureCredits(input: CreditSettlementInput): Promise<CreditSettlementResult> {
    return this.adjustReservedCredits(input, 'capture');
  }

  async releaseCredits(
    input: CreditSettlementInput & {
      reason?: string;
    },
  ): Promise<CreditSettlementResult> {
    return this.adjustReservedCredits(input, 'release');
  }

  private adjustReservedCredits(
    input: CreditSettlementInput & { reason?: string },
    action: 'capture' | 'release',
  ): CreditSettlementResult {
    const wallet = this.wallets.get(input.userId);
    if (!wallet) throw notFound('WALLET_NOT_FOUND', 'Kredi cüzdanı bulunamadı.');
    const generation = this.generations.get(input.generationId) ?? null;
    const reservation = this.findActiveReservation(input.userId, input.generationId);
    if (!reservation) {
      return {
        wallet: clone(wallet),
        applied: false,
        outcome: this.findReservationSettlement(input.userId, input.generationId),
        generation: generation ? clone(generation) : null,
      };
    }
    if (
      input.finalization &&
      (!generation ||
        (TERMINAL_GENERATION_STATUSES.has(generation.status) &&
          generation.status !== input.finalization.status))
    ) {
      return {
        wallet: clone(wallet),
        applied: false,
        outcome: 'PENDING',
        generation: generation ? clone(generation) : null,
      };
    }
    const amount = Math.abs(reservation.amount);
    if (wallet.reserved < amount)
      throw conflict('CREDIT_RESERVATION_NOT_FOUND', 'Kredi rezervasyonu bulunamadı.');
    if (amount > 0) {
      wallet.reserved -= amount;
      if (action === 'capture') wallet.lifetimeSpent += amount;
      else wallet.available += amount;
      wallet.version += 1;
      wallet.updatedAt = new Date();
    }
    reservation.status = 'REVERSED';
    this.recordTransaction({
      userId: input.userId,
      type: action === 'capture' ? 'GENERATION_CAPTURE' : 'GENERATION_RELEASE',
      amount: action === 'capture' ? -amount : amount,
      availableAfter: wallet.available,
      reservedAfter: wallet.reserved,
      referenceType: 'GENERATION',
      referenceId: input.generationId,
      description:
        input.reason ??
        (action === 'capture'
          ? 'Üretim kredisi kesinleştirildi'
          : 'Başarısız veya iptal edilen üretimin kredisi iade edildi'),
    });
    if (input.finalization && generation) {
      Object.assign(generation, input.finalization, { updatedAt: new Date() });
    }
    return {
      wallet: clone(wallet),
      applied: true,
      outcome: action === 'capture' ? 'CAPTURED' : 'RELEASED',
      generation: generation ? clone(generation) : null,
    };
  }

  async grantCredits(input: GrantCreditsInput): Promise<{
    wallet: CreditWalletRecord;
    transaction: CreditTransactionRecord;
    created: boolean;
  }> {
    this.assertAccountWritable(input.userId);
    const wallet = this.wallets.get(input.userId);
    if (!wallet) throw notFound('WALLET_NOT_FOUND', 'Kredi cüzdanı bulunamadı.');
    const existingId = this.transactionIdsByIdempotencyKey.get(input.idempotencyKey);
    const existing = existingId ? this.transactions.get(existingId) : undefined;
    if (existing) {
      if (
        existing.userId !== input.userId ||
        existing.type !== input.type ||
        existing.referenceType !== input.referenceType ||
        existing.referenceId !== input.referenceId
      ) {
        throw conflict(
          'IDEMPOTENCY_KEY_REUSED',
          'Bu Idempotency-Key farklı bir kredi işlemiyle zaten kullanıldı.',
        );
      }
      return { wallet: clone(wallet), transaction: clone(existing), created: false };
    }
    wallet.available += input.amount;
    wallet.lifetimeEarned += input.amount;
    wallet.version += 1;
    wallet.updatedAt = new Date();
    const transaction = this.recordTransaction({
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      availableAfter: wallet.available,
      reservedAfter: wallet.reserved,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      description: input.description ?? null,
    });
    return { wallet: clone(wallet), transaction: clone(transaction), created: true };
  }

  async listCreditTransactions(userId: string): Promise<CreditTransactionRecord[]> {
    return [...this.transactions.values()]
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  }

  async getIdempotency(route: string, key: string): Promise<IdempotencyRecord | null> {
    const record = this.idempotency.get(`${route}:${key}`);
    if (!record || record.expiresAt <= new Date()) return null;
    return clone(record);
  }

  async putIdempotency(
    input: Omit<IdempotencyRecord, 'id' | 'createdAt'>,
  ): Promise<IdempotencyRecord> {
    const mapKey = `${input.route}:${input.key}`;
    const existing = this.idempotency.get(mapKey);
    if (existing) return clone(existing);
    const record: IdempotencyRecord = { id: createId(), ...input, createdAt: new Date() };
    this.idempotency.set(mapKey, record);
    return clone(record);
  }

  async claimSupportTicket(
    input: CreateSupportTicketInput,
  ): Promise<{ ticket: SupportTicketRecord; created: boolean }> {
    const key = `${input.userId}\u0000${input.idempotencyKey}`;
    const existing = this.supportTickets.get(key);
    if (existing) return { ticket: clone(existing), created: false };
    const now = new Date();
    const ticket: SupportTicketRecord = {
      ...input,
      id: createId(),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    };
    this.supportTickets.set(key, ticket);
    return { ticket: clone(ticket), created: true };
  }

  async getSupportTicket(userId: string, ticketId: string): Promise<SupportTicketRecord | null> {
    const ticket = [...this.supportTickets.values()].find(
      (entry) => entry.userId === userId && entry.id === ticketId,
    );
    return ticket ? clone(ticket) : null;
  }

  async completeSupportTicketDelivery(
    userId: string,
    ticketId: string,
    status: 'SENT' | 'UNCONFIRMED',
  ): Promise<SupportTicketRecord> {
    const ticket = [...this.supportTickets.values()].find(
      (entry) => entry.userId === userId && entry.id === ticketId,
    );
    if (!ticket) throw notFound('SUPPORT_TICKET_NOT_FOUND', 'Destek talebi bulunamadı.');
    if (ticket.status === 'PENDING')
      Object.assign(ticket, {
        status,
        updatedAt: new Date(),
        sentAt: status === 'SENT' ? new Date() : null,
      });
    return clone(ticket);
  }

  private recordUserConsents(userId: string, inputs: CreateUserConsentInput[]): void {
    const createdAt = new Date();
    for (const input of inputs) {
      const key = userConsentKey(userId, input.type, input.version);
      if (this.userConsentIdsByUserTypeVersion.has(key))
        throw conflict('CONSENT_ALREADY_RECORDED', 'Bu onay zaten kaydedilmiş.');
      const record: UserConsentRecord = {
        id: createId(),
        userId,
        ...input,
        createdAt,
      };
      this.userConsents.set(record.id, record);
      this.userConsentIdsByUserTypeVersion.set(key, record.id);
    }
  }

  private recordTransaction(
    input: Omit<
      CreditTransactionRecord,
      'id' | 'status' | 'createdAt' | 'completedAt' | 'idempotencyKey'
    > & { idempotencyKey?: string | null },
  ): CreditTransactionRecord {
    if (input.idempotencyKey && this.transactionIdsByIdempotencyKey.has(input.idempotencyKey)) {
      throw conflict('CREDIT_TRANSACTION_ALREADY_APPLIED', 'Bu kredi işlemi daha önce uygulanmış.');
    }
    const record: CreditTransactionRecord = {
      id: createId(),
      ...input,
      idempotencyKey: input.idempotencyKey ?? null,
      status: 'COMPLETED',
      createdAt: new Date(),
      completedAt: new Date(),
    };
    this.transactions.set(record.id, record);
    if (record.idempotencyKey) {
      this.transactionIdsByIdempotencyKey.set(record.idempotencyKey, record.id);
    }
    return record;
  }

  private findActiveReservation(
    userId: string,
    generationId: string,
  ): CreditTransactionRecord | undefined {
    return [...this.transactions.values()].find(
      (transaction) =>
        transaction.userId === userId &&
        transaction.type === 'GENERATION_RESERVATION' &&
        transaction.referenceType === 'GENERATION' &&
        transaction.referenceId === generationId &&
        transaction.status === 'COMPLETED',
    );
  }

  private findReservationSettlement(
    userId: string,
    generationId: string,
  ): CreditSettlementResult['outcome'] {
    const settlement = [...this.transactions.values()]
      .filter(
        (transaction) =>
          transaction.userId === userId &&
          (transaction.type === 'GENERATION_CAPTURE' ||
            transaction.type === 'GENERATION_RELEASE') &&
          transaction.referenceType === 'GENERATION' &&
          transaction.referenceId === generationId &&
          transaction.status === 'COMPLETED',
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    if (!settlement) return 'NOT_FOUND';
    return settlement.type === 'GENERATION_CAPTURE' ? 'CAPTURED' : 'RELEASED';
  }
}
