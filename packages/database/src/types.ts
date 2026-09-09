import type {
  AssetStatus,
  AssetType,
  AspectRatio,
  GenerationQuality,
  GenerationStatus,
  ProjectMode,
} from '@birkare/shared';
import type { CatalogFeaturedPerson, CatalogItem } from '@birkare/shared';
import type { BeautySettings, GenderTransformation, TrendPreset } from '@birkare/shared';

export type UserRole = 'USER' | 'SUPPORT' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus =
  'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING' | 'DELETED';
export type AuthProvider = 'PASSWORD' | 'GOOGLE' | 'APPLE';
export type SocialAuthProvider = Exclude<AuthProvider, 'PASSWORD'>;
export type ConsentType =
  'TERMS' | 'PRIVACY' | 'AI_DISCLOSURE' | 'AGE_CONFIRMATION' | 'IMAGE_RIGHTS';
export type ConsentSource = 'PASSWORD_REGISTRATION' | 'SOCIAL_REGISTRATION';
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DELETION_PENDING' | 'DELETED';

export type UserPreferences = {
  keepSourcePhotos: boolean;
  marketingEmail: boolean;
  pushEnabled: boolean;
  reducedMotion: boolean;
  glassEffects?: boolean;
  theme?: 'dark';
  defaultAspectRatio: AspectRatio;
  defaultQuality: GenerationQuality;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  locale: string;
  countryCode: string | null;
  dateOfBirth: Date | null;
  lastLoginAt: Date | null;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type SessionRecord = {
  id: string;
  userId: string;
  tokenFamilyId: string;
  refreshTokenHash: string;
  deviceId: string | null;
  deviceName: string | null;
  platform: string | null;
  appVersion: string | null;
  ipHash: string | null;
  userAgent: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
};

/**
 * Persistent mapping from an external identity provider's immutable subject
 * (`providerAccountId`) to one BirKare user. Provider email is descriptive
 * only; sign-in resolution always uses the immutable provider subject.
 */
export type AuthAccountRecord = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerAccountId: string;
  providerEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Short-lived, single-use social registration handoff. The provider ID token
 * itself is intentionally not retained; only verified claims and a hash of a
 * random opaque client handoff token are stored.
 */
export type PendingSocialLoginRecord = {
  id: string;
  tokenHash: string;
  provider: SocialAuthProvider;
  providerAccountId: string;
  providerEmail: string;
  givenName: string | null;
  familyName: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

/**
 * An immutable audit record. A row exists only when the corresponding
 * required consent was affirmatively accepted at the listed policy version.
 */
export type UserConsentRecord = {
  id: string;
  userId: string;
  type: ConsentType;
  version: string;
  source: ConsentSource;
  acceptedAt: Date;
  createdAt: Date;
};

export type EmailTokenType = 'VERIFY_EMAIL' | 'RESET_PASSWORD';
export type AccountDeletionRecord = {
  userId: string;
  identityHashes: string[];
  storageKeys: string[];
  notBefore: Date;
  completedAt: Date | null;
  createdAt: Date;
};
export type EmailTokenRecord = {
  id: string;
  userId: string;
  type: EmailTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type AssetRecord = {
  id: string;
  ownerId: string | null;
  type: AssetType;
  status: AssetStatus;
  storageProvider: 'local' | 'r2';
  storageKey: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  sha256: string | null;
  width: number | null;
  height: number | null;
  isPrivate: boolean;
  retentionUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  title: string | null;
  mode: ProjectMode;
  status: ProjectStatus;
  sourceAssetId: string | null;
  sceneTemplateId: string | null;
  stylePresetId: string | null;
  featuredPersonId: string | null;
  composition: string | null;
  aspectRatio: AspectRatio;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type GenerationOutputRecord = {
  id: string;
  generationId: string;
  assetId: string;
  variantIndex: number;
  selected: boolean;
  watermarkApplied: boolean;
  disclosureType: string | null;
  createdAt: Date;
};

/**
 * A server-validated snapshot of the choices that produced a generation.
 * Keeping this on the generation (rather than only on the mutable project)
 * makes queue retries deterministic and prevents a later UI selection from
 * changing an already submitted job.
 */
export type GenerationRecipe = {
  version: 1;
  /**
   * Server-validated catalog choices captured when the job was submitted.
   *
   * This is optional only for rows created before selection snapshots were
   * introduced. New generations must carry it so an edit to the mutable
   * project cannot change the scene, filter, or character of a queued job.
   */
  selection?: {
    sceneTemplateId: string | null;
    stylePresetId: string | null;
    featuredPersonId: string | null;
  };
  filterIntensity: number;
  beauty?: BeautySettings;
  transformation?: GenderTransformation;
  trendPreset?: TrendPreset;
  composition: {
    shotType: 'CLOSE_SELFIE' | 'PORTRAIT' | 'HALF_BODY' | 'FULL_BODY';
    cameraAngle: 'EYE_LEVEL' | 'SLIGHTLY_LOW' | 'SLIGHTLY_HIGH';
    subjectPosition: 'CENTER' | 'LEFT' | 'RIGHT';
    backgroundDepth: 'SHALLOW' | 'BALANCED' | 'DEEP';
    secondarySubjectPosition?: 'LEFT' | 'RIGHT' | 'SLIGHTLY_BEHIND' | 'BACKGROUND';
  };
  character:
    { mode: 'FICTIONAL' } | { mode: 'LICENSED_REFERENCE'; referenceAssetId: string } | null;
};

export type GenerationMessageRecord = {
  id: string;
  generationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: Date;
};

export type GenerationRecord = {
  id: string;
  userId: string;
  projectId: string;
  parentGenerationId: string | null;
  sourceAssetId: string;
  status: GenerationStatus;
  stage: string | null;
  progress: number;
  quality: GenerationQuality;
  requestedImageCount: number;
  aspectRatio: AspectRatio;
  preserveFace: boolean;
  preserveClothes: boolean;
  recipe: GenerationRecipe | null;
  userInstruction: string | null;
  compiledPrompt: string | null;
  promptVersion: string | null;
  provider: string;
  model: string;
  providerRequestId: string | null;
  reservedCredits: number;
  chargedCredits: number;
  refundedCredits: number;
  failureCode: string | null;
  failureMessage: string | null;
  retryCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  outputs: GenerationOutputRecord[];
};

export type CreditWalletRecord = {
  id: string;
  userId: string;
  available: number;
  reserved: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditTransactionRecord = {
  id: string;
  userId: string;
  type:
    | 'PURCHASE'
    | 'SUBSCRIPTION_GRANT'
    | 'GENERATION_RESERVATION'
    | 'GENERATION_CAPTURE'
    | 'GENERATION_RELEASE'
    | 'REFUND'
    | 'BONUS'
    | 'ADMIN_ADJUSTMENT'
    | 'CHARGEBACK';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  amount: number;
  availableAfter: number | null;
  reservedAfter: number | null;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  description: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

export type IdempotencyRecord = {
  id: string;
  userId: string | null;
  route: string;
  key: string;
  requestHash: string;
  responseCode: number | null;
  responseBody: unknown;
  expiresAt: Date;
  createdAt: Date;
};

export type SupportTicketRecord = {
  id: string;
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
  category: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'UNCONFIRMED';
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
};
export type CreateSupportTicketInput = Omit<SupportTicketRecord, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'sentAt'>;

export type CatalogSnapshot = {
  scenes: CatalogItem[];
  filters: CatalogItem[];
  styles: CatalogItem[];
  featuredPeople: CatalogFeaturedPerson[];
};

export type CreateUserConsentInput = Omit<UserConsentRecord, 'id' | 'userId' | 'createdAt'>;
export type CreateUserInput = Pick<
  UserRecord,
  'email' | 'passwordHash' | 'firstName' | 'lastName' | 'locale' | 'dateOfBirth'
> & { consents: CreateUserConsentInput[] };
export type CreateSessionInput = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  tokenFamilyId?: string;
  deviceId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
};
export type CreateVerifiedSocialUserInput = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  locale: string;
  dateOfBirth: Date;
  provider: SocialAuthProvider;
  providerAccountId: string;
  providerEmail: string;
  consents: CreateUserConsentInput[];
};
export type LinkAuthAccountInput = {
  userId: string;
  provider: SocialAuthProvider;
  providerAccountId: string;
  providerEmail: string;
};
export type CreatePendingSocialLoginInput = Omit<
  PendingSocialLoginRecord,
  'id' | 'consumedAt' | 'createdAt'
>;
export type CreateAssetInput = Pick<
  AssetRecord,
  | 'ownerId'
  | 'type'
  | 'storageProvider'
  | 'storageKey'
  | 'originalName'
  | 'mimeType'
  | 'sizeBytes'
  | 'sha256'
> & { id?: string };
export type CreateProjectInput = Pick<
  ProjectRecord,
  | 'userId'
  | 'title'
  | 'mode'
  | 'sourceAssetId'
  | 'sceneTemplateId'
  | 'stylePresetId'
  | 'featuredPersonId'
  | 'composition'
  | 'aspectRatio'
>;
export type CreateGenerationInput = Pick<
  GenerationRecord,
  | 'userId'
  | 'projectId'
  | 'sourceAssetId'
  | 'parentGenerationId'
  | 'quality'
  | 'requestedImageCount'
  | 'aspectRatio'
  | 'preserveFace'
  | 'preserveClothes'
  | 'recipe'
  | 'userInstruction'
  | 'provider'
  | 'model'
  | 'reservedCredits'
> & { id?: string };

export interface BirKareRepository {
  readonly kind: 'memory' | 'prisma';
  readiness(): Promise<{ ready: boolean; detail?: string }>;
  disconnect(): Promise<void>;

  createUser(input: CreateUserInput): Promise<UserRecord>;
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserByAuthAccount(
    provider: SocialAuthProvider,
    providerAccountId: string,
  ): Promise<UserRecord | null>;
  createVerifiedSocialUser(input: CreateVerifiedSocialUserInput): Promise<UserRecord>;
  linkAuthAccount(input: LinkAuthAccountInput): Promise<void>;
  createPendingSocialLogin(input: CreatePendingSocialLoginInput): Promise<PendingSocialLoginRecord>;
  consumePendingSocialLogin(
    tokenHash: string,
    provider: SocialAuthProvider,
  ): Promise<PendingSocialLoginRecord | null>;
  purgePendingSocialLogins(input: { before: Date; limit: number }): Promise<number>;
  listUserConsents(userId: string): Promise<UserConsentRecord[]>;
  listAuthProviders(userId: string): Promise<AuthProvider[]>;
  requestAccountDeletion(
    userId: string,
    guard?: { expectedPasswordHash: string },
  ): Promise<AccountDeletionRecord>;
  listPendingAccountDeletions(now: Date, limit: number): Promise<AccountDeletionRecord[]>;
  completeAccountDeletion(userId: string): Promise<void>;
  updateUser(
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
  ): Promise<UserRecord>;

  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  getSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRecord | null>;
  rotateSession(sessionId: string, next: CreateSessionInput): Promise<SessionRecord>;
  revokeSession(sessionId: string, reason: string): Promise<void>;
  revokeTokenFamily(tokenFamilyId: string, reason: string): Promise<void>;
  revokeAllUserSessions(userId: string, reason: string): Promise<void>;
  listSessions(userId: string): Promise<SessionRecord[]>;

  createEmailToken(
    input: Omit<EmailTokenRecord, 'id' | 'usedAt' | 'createdAt'>,
  ): Promise<EmailTokenRecord>;
  consumeEmailToken(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null>;

  createAsset(input: CreateAssetInput): Promise<AssetRecord>;
  getAssetById(id: string): Promise<AssetRecord | null>;
  updateAsset(
    id: string,
    input: Partial<Pick<AssetRecord, 'status' | 'sha256' | 'width' | 'height' | 'deletedAt'>>,
  ): Promise<AssetRecord>;

  getCatalog(): Promise<CatalogSnapshot>;

  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  listProjects(
    userId: string,
    input: { cursor?: string; limit: number; favoriteOnly?: boolean },
  ): Promise<{ items: ProjectRecord[]; nextCursor: string | null; hasMore: boolean }>;
  updateProject(
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
  ): Promise<ProjectRecord>;

  createGeneration(input: CreateGenerationInput): Promise<GenerationRecord>;
  getGenerationById(id: string): Promise<GenerationRecord | null>;
  listProjectGenerations(projectId: string): Promise<GenerationRecord[]>;
  updateGeneration(
    id: string,
    input: Partial<
      Omit<
        GenerationRecord,
        'id' | 'userId' | 'projectId' | 'sourceAssetId' | 'createdAt' | 'outputs'
      >
    >,
  ): Promise<GenerationRecord>;
  addGenerationOutput(
    input: Omit<GenerationOutputRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationOutputRecord>;
  selectGenerationOutput(generationId: string, outputId: string): Promise<void>;
  addGenerationMessage(
    input: Omit<GenerationMessageRecord, 'id' | 'createdAt'>,
  ): Promise<GenerationMessageRecord>;
  listGenerationMessages(generationId: string): Promise<GenerationMessageRecord[]>;

  getWallet(userId: string): Promise<CreditWalletRecord>;
  reserveCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<{ wallet: CreditWalletRecord; reservationId: string }>;
  captureCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
  }): Promise<CreditWalletRecord>;
  releaseCredits(input: {
    userId: string;
    generationId: string;
    amount: number;
    reason?: string;
  }): Promise<CreditWalletRecord>;
  listCreditTransactions(userId: string): Promise<CreditTransactionRecord[]>;

  getIdempotency(route: string, key: string): Promise<IdempotencyRecord | null>;
  putIdempotency(input: Omit<IdempotencyRecord, 'id' | 'createdAt'>): Promise<IdempotencyRecord>;
  /** Only created=true owns the first and only automatic delivery attempt. */
  claimSupportTicket(input: CreateSupportTicketInput): Promise<{ ticket: SupportTicketRecord; created: boolean }>;
  getSupportTicket(userId: string, ticketId: string): Promise<SupportTicketRecord | null>;
  completeSupportTicketDelivery(userId: string, ticketId: string, status: 'SENT' | 'UNCONFIRMED'): Promise<SupportTicketRecord>;
}
