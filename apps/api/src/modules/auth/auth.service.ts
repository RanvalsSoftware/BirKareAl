import type { BirKareConfig } from '@birkare/config';
import {
  ACCOUNT_DELETION_RECOVERY_DAYS,
  accountDeletionRecoveryDeadline,
  type BirKareRepository,
  type CreateUserConsentInput,
  type SessionRecord,
  type UserRecord,
} from '@birkare/database';
import type {
  LoginInput,
  RefreshInput,
  RegisterInput,
  SocialLoginInput,
  SocialProfileCompletionInput,
  SocialRegistrationInput,
  ConfirmAccountDeletionLinkInput,
} from '@birkare/contracts';
import {
  ApiError,
  badRequest,
  conflict,
  createOpaqueToken,
  forbidden,
  hashStable,
  hashToken,
  unauthorized,
  unavailable,
} from '@birkare/shared';
import { PasswordService } from '../../services/password.service.js';
import { TokenService } from '../../services/token.service.js';
import {
  accountDeletionMail,
  authMail,
  DisabledMailService,
  mailUnavailable,
  type MailService,
} from '../../services/mail.service.js';
import type { GoogleIdentityVerifier } from './google-id-token.service.js';
import type { AppleIdentityVerifier } from './apple-id-token.service.js';
import type { SocialAuthProvider } from '@birkare/database';
import { randomInt } from 'node:crypto';
import { EmailSecurityService } from './email-security.service.js';
import { assertKnownRegistrationProvider } from './email-provider-policy.js';

export type AuthRequestContext = {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
  ip?: string;
  userAgent?: string;
};

export type PublicUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  locale: string;
  role: UserRecord['role'];
  status: UserRecord['status'];
  emailVerified: boolean;
  createdAt: Date;
};

export type AuthSessionResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  session: { id: string; expiresAt: Date };
};

export type RegistrationResponse = {
  verificationRequired: true;
  developmentVerificationToken?: string;
};

export type SocialProfileCompletionRequiredResponse = {
  needsProfileCompletion: true;
  /** Short-lived, one-time opaque handoff; no provider token is retained. */
  pendingToken: string;
  profile: { email: string; firstName: string | null; lastName: string | null };
};

export type DeletionRecoveryRequiredResponse = {
  deletionRecoveryRequired: true;
  recoveryUntil: string;
  recoveryDays: number;
};

export type GoogleLoginResponse =
  | AuthSessionResponse
  | SocialProfileCompletionRequiredResponse
  | DeletionRecoveryRequiredResponse;
export type SocialLoginResponse = GoogleLoginResponse;

type VerifiedSocialIdentity = {
  subject: string;
  email: string;
  givenName?: string;
  familyName?: string;
};

const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  locale: user.locale,
  role: user.role,
  status: user.status,
  emailVerified: Boolean(user.emailVerifiedAt),
  createdAt: user.createdAt,
});

const addDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_DELETION_LINK_TTL_MS = 30 * 60 * 1000;
const EMAIL_VERIFICATION_MAX_FAILED_ATTEMPTS = 5;
const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const createEmailVerificationCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');
const LEGAL_CONSENT_VERSION = '2026-09-04';

type RequiredConsentInput = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  aiDisclosureAccepted: boolean;
  ageConfirmed: boolean;
  ownImageOrPermissionConfirmed: boolean;
};

function createRequiredConsentRecords(
  consent: RequiredConsentInput,
  source: CreateUserConsentInput['source'],
): CreateUserConsentInput[] {
  const required = [
    { accepted: consent.termsAccepted, type: 'TERMS' },
    { accepted: consent.privacyAccepted, type: 'PRIVACY' },
    { accepted: consent.aiDisclosureAccepted, type: 'AI_DISCLOSURE' },
    { accepted: consent.ageConfirmed, type: 'AGE_CONFIRMATION' },
    { accepted: consent.ownImageOrPermissionConfirmed, type: 'IMAGE_RIGHTS' },
  ] as const;
  if (required.some((item) => !item.accepted)) {
    throw badRequest('AUTH_CONSENT_REQUIRED', 'Devam etmek için tüm zorunlu onaylar gereklidir.');
  }
  const acceptedAt = new Date();
  return required.map((item) => ({ type: item.type, version: LEGAL_CONSENT_VERSION, source, acceptedAt }));
}

function requireEligibleUser(user: UserRecord): void {
  if (user.status === 'SUSPENDED')
    throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
  if (user.deletedAt || user.status === 'DELETION_PENDING' || user.status === 'DELETED')
    throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');
}

function ensureAdult(dateOfBirth?: string): Date | null {
  if (!dateOfBirth) return null;
  const value = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime())) throw new Error('Geçersiz doğum tarihi.');
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - 18);
  if (value > threshold)
    throw forbidden('AUTH_AGE_RESTRICTED', 'BirKare AI şu an yalnızca 18 yaş ve üzeri kullanıcılar içindir.');
  return value;
}

export class AuthService {
  constructor(
    private readonly repository: BirKareRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly config: Pick<BirKareConfig, 'REFRESH_TOKEN_TTL_DAYS' | 'AUTH_DEV_MODE' | 'NODE_ENV'> &
      Partial<Pick<BirKareConfig, 'MAIL_APP_SCHEME' | 'ACCOUNT_DELETION_WEB_URL'>>,
    private readonly googleIdentityVerifier: GoogleIdentityVerifier,
    private readonly mailService: MailService = new DisabledMailService(),
    private readonly appleIdentityVerifier?: AppleIdentityVerifier,
    private readonly emailSecurityService?: EmailSecurityService,
  ) {}

  async register(input: RegisterInput, context: AuthRequestContext): Promise<RegistrationResponse> {
    // This policy affects NEW accounts only, not existing-account login or recovery.
    assertKnownRegistrationProvider(input.email, this.config.NODE_ENV);
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRegistrationAllowed(input.email, {
      ip: context.ip,
      deviceId: input.deviceId,
    });
    const dateOfBirth = ensureAdult(input.dateOfBirth);
    const consents = createRequiredConsentRecords(input.consent, 'PASSWORD_REGISTRATION');
    const user = await this.repository.createUser({
      email: normalizeEmail(input.email),
      passwordHash: await this.passwordService.hash(input.password),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      locale: input.locale,
      dateOfBirth,
      consents,
    });
    const verificationCode = createEmailVerificationCode();
    await this.repository.replaceEmailToken({
      userId: user.id,
      type: 'VERIFY_EMAIL',
      tokenHash: this.passwordService.hashEmailVerificationCode(user.email, verificationCode),
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });
    try {
      await this.sendAuthEmail('verification', user.email, verificationCode);
    } catch {
      throw new ApiError({
        statusCode: 503,
        code: 'AUTH_VERIFICATION_DELIVERY_FAILED',
        message: 'Hesabınız oluşturuldu ancak doğrulama e-postası gönderilemedi. Doğrulama ekranından e-postayı yeniden gönderin.',
        expose: true,
      });
    }
    return {
      verificationRequired: true,
      ...(this.allowDevelopmentTokens() ? { developmentVerificationToken: verificationCode } : {}),
    };
  }

  async login(input: LoginInput, context: AuthRequestContext): Promise<AuthSessionResponse> {
    await this.emailSecurityService?.assertLoginAllowed(input.email, context);
    const user = await this.repository.getUserByEmail(normalizeEmail(input.email));
    if (!user || !user.passwordHash || !(await this.passwordService.verify(user.passwordHash, input.password))) {
      throw unauthorized('AUTH_INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }
    const eligibleUser = await this.resolveLoginUser(user, input.recoverDeletion);
    if (!eligibleUser.emailVerifiedAt)
      throw forbidden('AUTH_EMAIL_NOT_VERIFIED', 'Devam etmek için e-posta adresinizi doğrulamanız gerekiyor.');
    const updatedUser = await this.repository.updateUser(eligibleUser.id, { lastLoginAt: new Date() });
    const session = await this.createSession(updatedUser, input, context, user.passwordHash);
    return this.toAuthResponse(updatedUser, session.session, session.refreshToken);
  }

  async refresh(input: RefreshInput, context: AuthRequestContext): Promise<AuthSessionResponse> {
    const session = await this.repository.getSessionByRefreshHash(hashToken(input.refreshToken));
    if (!session) throw unauthorized('AUTH_INVALID_REFRESH_TOKEN');
    if (session.revokedAt) {
      await this.repository.revokeTokenFamily(session.tokenFamilyId, 'REFRESH_TOKEN_REUSE');
      throw unauthorized('AUTH_REFRESH_TOKEN_REUSE', 'Oturum güvenlik nedeniyle kapatıldı. Lütfen tekrar giriş yapın.');
    }
    if (session.expiresAt <= new Date()) {
      await this.repository.revokeSession(session.id, 'EXPIRED');
      throw unauthorized('AUTH_REFRESH_TOKEN_EXPIRED');
    }
    const user = await this.repository.getUserById(session.userId);
    if (!user) throw unauthorized('AUTH_INVALID_REFRESH_TOKEN');
    requireEligibleUser(user);
    const rawRefreshToken = createOpaqueToken();
    const nextSession = await this.repository.rotateSession(session.id, {
      userId: user.id,
      refreshTokenHash: hashToken(rawRefreshToken),
      expiresAt: addDays(this.config.REFRESH_TOKEN_TTL_DAYS),
      deviceId: input.deviceId ?? session.deviceId ?? undefined,
      deviceName: input.deviceName ?? session.deviceName ?? undefined,
      platform: input.platform ?? session.platform ?? undefined,
      appVersion: input.appVersion ?? session.appVersion ?? undefined,
      ipHash: context.ip ? hashStable(context.ip) : session.ipHash,
      userAgent: context.userAgent ?? session.userAgent ?? undefined,
    }).catch(async (error: unknown) => {
      // A concurrent replay may pass the first read. The repository CAS is authoritative.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'AUTH_REFRESH_TOKEN_REUSE')
        await this.repository.revokeTokenFamily(session.tokenFamilyId, 'REFRESH_TOKEN_REUSE');
      throw error;
    });
    const access = await this.tokenService.issueAccessToken(user, nextSession.id);
    return {
      user: toPublicUser(user),
      ...access,
      refreshToken: rawRefreshToken,
      session: { id: nextSession.id, expiresAt: nextSession.expiresAt },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.repository.getSessionByRefreshHash(hashToken(refreshToken));
    if (session) await this.repository.revokeSession(session.id, 'LOGOUT');
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repository.revokeAllUserSessions(userId, 'LOGOUT_ALL');
  }

  async forgotPassword(email: string, context: AuthRequestContext = {}): Promise<{ developmentResetToken?: string }> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRecoveryAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.deletedAt || user.status === 'DELETION_PENDING' || user.status === 'DELETED' || user.status === 'SUSPENDED') return {};
    const resetToken = createOpaqueToken();
    await this.repository.replaceEmailToken({
      userId: user.id, type: 'RESET_PASSWORD', tokenHash: hashToken(resetToken), failedAttempts: 0,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    try {
      await this.sendAuthEmail('password-reset', user.email, resetToken);
    } catch {
      // Public responses never disclose whether an address exists or delivery succeeded.
    }
    return this.allowDevelopmentTokens() ? { developmentResetToken: resetToken } : {};
  }

  async requestAccountDeletionLink(email: string, context: AuthRequestContext = {}): Promise<{ developmentDeletionToken?: string }> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRecoveryAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') return {};
    const token = createOpaqueToken();
    await this.repository.replaceEmailToken({
      userId: user.id, type: 'DELETE_ACCOUNT', tokenHash: hashToken(token), failedAttempts: 0,
      expiresAt: new Date(Date.now() + ACCOUNT_DELETION_LINK_TTL_MS),
    });
    try {
      await this.mailService.send(accountDeletionMail({
        email: user.email,
        token,
        webUrl: this.config.ACCOUNT_DELETION_WEB_URL ?? 'https://ai.ranvals.com/birkare/hesap-silme/',
      }));
    } catch {
      // Deliberately hide delivery/account existence from the public endpoint.
    }
    return this.allowDevelopmentTokens() ? { developmentDeletionToken: token } : {};
  }

  async confirmAccountDeletionLink(input: ConfirmAccountDeletionLinkInput): Promise<{
    deletionRequested: true; cleanupNotBefore: string; recoveryUntil: string; reversible: true;
  }> {
    const token = await this.repository.consumeEmailToken(hashToken(input.token), 'DELETE_ACCOUNT');
    if (!token) throw unauthorized('AUTH_INVALID_DELETION_TOKEN', 'Hesap silme bağlantısı geçersiz, kullanılmış veya süresi dolmuş.');
    const user = await this.repository.getUserById(token.userId);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap silme işlemi için kullanılamıyor.');
    }
    void input.reason;
    void input.details;
    const record = await this.repository.requestAccountDeletion(user.id);
    const recoveryUntil = accountDeletionRecoveryDeadline(record).toISOString();
    return { deletionRequested: true, cleanupNotBefore: recoveryUntil, recoveryUntil, reversible: true };
  }

  async resendVerification(email: string, context: AuthRequestContext = {}): Promise<{ developmentVerificationToken?: string }> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertResendAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.emailVerifiedAt || user.deletedAt || user.status !== 'PENDING_VERIFICATION') return {};
    const verificationCode = createEmailVerificationCode();
    await this.repository.replaceEmailToken({
      userId: user.id, type: 'VERIFY_EMAIL',
      tokenHash: this.passwordService.hashEmailVerificationCode(user.email, verificationCode), failedAttempts: 0,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });
    try {
      await this.sendAuthEmail('verification', user.email, verificationCode);
    } catch {
      // Same outward response for absent, ineligible and undeliverable accounts.
    }
    return this.allowDevelopmentTokens() ? { developmentVerificationToken: verificationCode } : {};
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const result = await this.repository.completePasswordReset(hashToken(token), await this.passwordService.hash(password));
    if (result === 'INVALID_TOKEN') throw unauthorized('AUTH_INVALID_RESET_TOKEN', 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
    if (result === 'ACCOUNT_SUSPENDED') throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
    if (result === 'ACCOUNT_UNAVAILABLE') throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');
  }

  async verifyEmail(email: string, code: string, context: AuthRequestContext = {}): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    await this.emailSecurityService?.assertVerificationAllowed(normalizedEmail, context);
    if (!/^\d{6}$/.test(code)) throw unauthorized('AUTH_INVALID_VERIFICATION_TOKEN', 'Doğrulama kodu geçersiz veya süresi dolmuş.');
    const tokenHash = this.passwordService.hashEmailVerificationCode(normalizedEmail, code);
    const expectedUser = await this.repository.getUserByEmail(normalizedEmail);
    if (!expectedUser) throw unauthorized('AUTH_INVALID_VERIFICATION_TOKEN', 'Doğrulama kodu geçersiz veya süresi dolmuş.');
    requireEligibleUser(expectedUser);
    const result = await this.repository.completeEmailVerification(
      expectedUser.id, tokenHash, EMAIL_VERIFICATION_MAX_FAILED_ATTEMPTS,
      this.emailSecurityService?.abuseKeyHash(normalizedEmail) ?? hashStable(normalizedEmail),
    );
    if (result.status === 'ACCOUNT_SUSPENDED') throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
    if (result.status === 'ACCOUNT_UNAVAILABLE') throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');
    if (result.status !== 'VERIFIED') throw unauthorized('AUTH_INVALID_VERIFICATION_TOKEN', 'Doğrulama kodu geçersiz veya süresi dolmuş.');
  }

  async googleLogin(input: SocialLoginInput, context: AuthRequestContext): Promise<GoogleLoginResponse> {
    const identity = await this.googleIdentityVerifier.verify(input.idToken);
    return this.loginWithVerifiedSocialIdentity('GOOGLE', identity, input, context);
  }

  async appleLogin(input: SocialLoginInput, context: AuthRequestContext): Promise<SocialLoginResponse> {
    if (!this.appleIdentityVerifier) throw unavailable('AUTH_APPLE_NOT_CONFIGURED', 'Apple ile giriş henüz bu ortam için yapılandırılmadı.');
    const identity = await this.appleIdentityVerifier.verify(input.idToken);
    return this.loginWithVerifiedSocialIdentity('APPLE', {
      ...identity,
      ...(input.firstName ? { givenName: input.firstName } : {}),
      ...(input.lastName ? { familyName: input.lastName } : {}),
    }, input, context);
  }

  private async loginWithVerifiedSocialIdentity(
    provider: SocialAuthProvider,
    identity: VerifiedSocialIdentity,
    input: SocialLoginInput,
    context: AuthRequestContext,
  ): Promise<SocialLoginResponse> {
    // Resolve the verified immutable subject BEFORE the new-signup domain gate.
    // Otherwise existing corporate users and deletion recovery would be locked out.
    const linkedUser = await this.repository.getUserByAuthAccount(provider, identity.subject);
    if (linkedUser) {
      if (linkedUser.status === 'SUSPENDED' || linkedUser.status === 'DELETED') requireEligibleUser(linkedUser);
      if (!input.recoverDeletion) {
        const recovery = await this.deletionRecoveryResponse(linkedUser);
        if (recovery) return recovery;
      }
      return this.createSocialSession(linkedUser, input, context);
    }
    const existingEmailUser = await this.repository.getUserByEmail(identity.email);
    if (existingEmailUser) {
      // Never turn email equality into a provider/account ownership proof.
      throw conflict('AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED', 'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.');
    }
    assertKnownRegistrationProvider(identity.email, this.config.NODE_ENV);
    await this.emailSecurityService?.assertRegistrationAllowed(identity.email, {
      ip: context.ip, deviceId: input.deviceId,
    });
    const pendingToken = createOpaqueToken();
    await this.repository.createPendingSocialLogin({
      tokenHash: hashToken(pendingToken), provider, providerAccountId: identity.subject,
      providerEmail: identity.email, givenName: identity.givenName ?? null, familyName: identity.familyName ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return {
      needsProfileCompletion: true, pendingToken,
      profile: { email: identity.email, firstName: identity.givenName ?? null, lastName: identity.familyName ?? null },
    };
  }

  async completeSocialRegistration(input: SocialProfileCompletionInput, context: AuthRequestContext): Promise<AuthSessionResponse> {
    const dateOfBirth = ensureAdult(input.dateOfBirth);
    if (!dateOfBirth) throw badRequest('AUTH_SOCIAL_PROFILE_REQUIRED', 'Doğum tarihi gereklidir.');
    const pendingTokenHash = hashToken(input.pendingToken);
    const pending =
      (await this.repository.consumePendingSocialLogin(pendingTokenHash, 'GOOGLE')) ??
      (await this.repository.consumePendingSocialLogin(pendingTokenHash, 'APPLE'));
    if (!pending) throw unauthorized('AUTH_SOCIAL_PENDING_TOKEN_INVALID', 'Sosyal kayıt oturumu geçersiz veya süresi dolmuş. Lütfen yeniden sosyal giriş yapın.');
    const linkedUser = await this.repository.getUserByAuthAccount(pending.provider, pending.providerAccountId);
    if (linkedUser) return this.createSocialSession(linkedUser, input, context);
    const existingEmailUser = await this.repository.getUserByEmail(pending.providerEmail);
    if (existingEmailUser) throw conflict('AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED', 'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.');
    const user = await this.createSocialUser(pending.provider, {
      subject: pending.providerAccountId,
      email: pending.providerEmail,
      ...(pending.givenName ? { givenName: pending.givenName } : {}),
      ...(pending.familyName ? { familyName: pending.familyName } : {}),
    }, input, dateOfBirth);
    return this.createSocialSession(user, input, context);
  }

  async linkGoogle(userId: string, input: SocialLoginInput): Promise<{ linked: true }> {
    const [identity, user] = await Promise.all([
      this.googleIdentityVerifier.verify(input.idToken), this.repository.getUserById(userId),
    ]);
    if (!user) throw unauthorized('AUTH_UNAUTHORIZED');
    requireEligibleUser(user);
    if (user.email !== identity.email) throw conflict('AUTH_SOCIAL_EMAIL_MISMATCH', 'Yalnızca mevcut hesabınızla aynı e-posta adresine ait Google hesabı bağlanabilir.');
    const owner = await this.repository.getUserByAuthAccount('GOOGLE', identity.subject);
    if (owner && owner.id !== user.id) throw conflict('AUTH_SOCIAL_ALREADY_LINKED', 'Bu Google hesabı başka bir hesaba bağlı.');
    if (!owner) await this.repository.linkAuthAccount({ userId: user.id, provider: 'GOOGLE', providerAccountId: identity.subject, providerEmail: identity.email });
    return { linked: true };
  }

  private async deletionRecoveryResponse(user: UserRecord): Promise<DeletionRecoveryRequiredResponse | null> {
    // Neither a suspended nor a permanently deleted identity may enter recovery.
    if (user.status !== 'DELETION_PENDING') return null;
    const deletion = await this.repository.getAccountDeletion(user.id);
    if (deletion?.completedAt) return null;
    const recoveryUntil = deletion
      ? accountDeletionRecoveryDeadline(deletion)
      : user.deletedAt
        ? new Date(user.deletedAt.getTime() + ACCOUNT_DELETION_RECOVERY_DAYS * 24 * 60 * 60 * 1000)
        : null;
    if (!recoveryUntil || !Number.isFinite(recoveryUntil.getTime()) || recoveryUntil <= new Date()) return null;
    return { deletionRecoveryRequired: true, recoveryUntil: recoveryUntil.toISOString(), recoveryDays: ACCOUNT_DELETION_RECOVERY_DAYS };
  }

  private async resolveLoginUser(user: UserRecord, recoverDeletion = false): Promise<UserRecord> {
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') requireEligibleUser(user);
    if (user.status === 'DELETION_PENDING') {
      const recovery = await this.deletionRecoveryResponse(user);
      if (!recovery) {
        throw forbidden(
          'AUTH_ACCOUNT_DELETION_RECOVERY_UNAVAILABLE',
          'Hesabın geri alma süresi bitmiş, kalıcı silme tamamlanmış veya silme kaydı eksik. Bu işlem yeni bir mobil build ile geri alınamaz.',
        );
      }
      if (!recoverDeletion) {
        throw conflict('AUTH_ACCOUNT_DELETION_PENDING', 'Hesabın silinmek üzere bekliyor. Hesabını geri getirmek ister misin?', {
          recoveryUntil: recovery.recoveryUntil, recoveryDays: recovery.recoveryDays,
        });
      }
      // Explicit confirmation re-verifies the original password/provider token.
      // Revoked sessions are never made valid again and no welcome credit is granted.
      const restored = await this.repository.restoreAccountDeletion(user.id, new Date());
      if (!restored) throw conflict('AUTH_ACCOUNT_DELETION_RECOVERY_EXPIRED', 'Hesabın geri alma süresi sona ermiş veya hesap durumu değişmiş. Lütfen yeniden giriş yap.');
      const activeUser = await this.repository.getUserById(user.id);
      if (!activeUser || activeUser.status !== 'ACTIVE' || activeUser.deletedAt) throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Hesap yeniden etkinleştirilemedi.');
      return activeUser;
    }
    requireEligibleUser(user);
    return user;
  }

  private async createSession(
    user: UserRecord,
    input: Partial<AuthRequestContext>,
    context: AuthRequestContext,
    expectedPasswordHash?: string,
  ): Promise<{ session: SessionRecord; refreshToken: string }> {
    const refreshToken = createOpaqueToken();
    const session = await this.repository.createSession({
      userId: user.id, refreshTokenHash: hashToken(refreshToken), expiresAt: addDays(this.config.REFRESH_TOKEN_TTL_DAYS),
      deviceId: input.deviceId, deviceName: input.deviceName, platform: input.platform, appVersion: input.appVersion,
      ipHash: context.ip ? hashStable(context.ip) : undefined, userAgent: context.userAgent,
    }, expectedPasswordHash ? { expectedPasswordHash } : undefined);
    return { session, refreshToken };
  }

  private async createSocialUser(
    provider: SocialAuthProvider,
    identity: VerifiedSocialIdentity,
    registration: SocialRegistrationInput,
    dateOfBirth = ensureAdult(registration.dateOfBirth),
  ): Promise<UserRecord> {
    if (!dateOfBirth) throw badRequest('AUTH_SOCIAL_PROFILE_REQUIRED', 'Doğum tarihi gereklidir.');
    // Re-check at account creation: a handoff issued before a policy deployment
    // must not bypass the current registration policy.
    assertKnownRegistrationProvider(identity.email, this.config.NODE_ENV);
    await this.emailSecurityService?.validateRegistrationEmail(identity.email);
    try {
      return await this.repository.createVerifiedSocialUser({
        email: identity.email,
        firstName: registration.firstName || identity.givenName || null,
        lastName: registration.lastName || identity.familyName || null,
        locale: registration.locale, dateOfBirth, provider, providerAccountId: identity.subject, providerEmail: identity.email,
        consents: createRequiredConsentRecords(registration.consent, 'SOCIAL_REGISTRATION'),
        welcomeCreditAbuseHash: this.emailSecurityService?.abuseKeyHash(identity.email),
      });
    } catch (error) {
      const linkedUser = await this.repository.getUserByAuthAccount(provider, identity.subject);
      if (linkedUser) return linkedUser;
      const existingEmailUser = await this.repository.getUserByEmail(identity.email);
      if (existingEmailUser) throw conflict('AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED', 'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.');
      throw error;
    }
  }

  private async createSocialSession(
    user: UserRecord,
    input: Partial<AuthRequestContext> & { recoverDeletion?: boolean },
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    const eligibleUser = await this.resolveLoginUser(user, Boolean(input.recoverDeletion));
    const updatedUser = await this.repository.updateUser(eligibleUser.id, { lastLoginAt: new Date() });
    const session = await this.createSession(updatedUser, input, context);
    return this.toAuthResponse(updatedUser, session.session, session.refreshToken);
  }

  private async toAuthResponse(user: UserRecord, session: SessionRecord, refreshToken: string): Promise<AuthSessionResponse> {
    const access = await this.tokenService.issueAccessToken(user, session.id);
    return { user: toPublicUser(user), ...access, refreshToken, session: { id: session.id, expiresAt: session.expiresAt } };
  }

  private allowDevelopmentTokens(): boolean {
    return this.config.AUTH_DEV_MODE && (this.config.NODE_ENV === 'development' || this.config.NODE_ENV === 'test');
  }

  private requireMailAvailability(): void {
    if (!this.mailService.enabled && !this.allowDevelopmentTokens()) throw mailUnavailable();
  }

  private async sendAuthEmail(kind: 'verification' | 'password-reset', email: string, token: string): Promise<void> {
    if (!this.mailService.enabled && this.allowDevelopmentTokens()) return;
    await this.mailService.send(authMail({ kind, email, token, scheme: this.config.MAIL_APP_SCHEME }));
  }
}

export { toPublicUser };
