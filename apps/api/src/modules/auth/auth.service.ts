import type { BirKareConfig } from '@birkare/config';
import {
  ACCOUNT_DELETION_RECOVERY_DAYS,
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

export type GoogleLoginResponse = AuthSessionResponse | SocialProfileCompletionRequiredResponse;
export type SocialLoginResponse = AuthSessionResponse | SocialProfileCompletionRequiredResponse;

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
const createEmailVerificationCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, '0');
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
  return required.map((item) => ({
    type: item.type,
    version: LEGAL_CONSENT_VERSION,
    source,
    acceptedAt,
  }));
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
    throw forbidden(
      'AUTH_AGE_RESTRICTED',
      'BirKare AI şu an yalnızca 18 yaş ve üzeri kullanıcılar içindir.',
    );
  return value;
}

export class AuthService {
  constructor(
    private readonly repository: BirKareRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly config: Pick<
      BirKareConfig,
      'REFRESH_TOKEN_TTL_DAYS' | 'AUTH_DEV_MODE' | 'NODE_ENV'
    > &
      Partial<Pick<BirKareConfig, 'MAIL_APP_SCHEME' | 'ACCOUNT_DELETION_WEB_URL'>>,
    private readonly googleIdentityVerifier: GoogleIdentityVerifier,
    private readonly mailService: MailService = new DisabledMailService(),
    private readonly appleIdentityVerifier?: AppleIdentityVerifier,
    private readonly emailSecurityService?: EmailSecurityService,
  ) {}

  async register(input: RegisterInput, context: AuthRequestContext): Promise<RegistrationResponse> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRegistrationAllowed(input.email, {
      ip: context.ip,
      deviceId: input.deviceId,
    });
    const dateOfBirth = ensureAdult(input.dateOfBirth);
    const consents = createRequiredConsentRecords(input.consent, 'PASSWORD_REGISTRATION');
    const user = await this.repository.createUser({
      email: input.email,
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
      // The pending account exists; never pretend SMTP delivered its code.
      // A resend can recover without creating another account or credit grant.
      throw new ApiError({
        statusCode: 503,
        code: 'AUTH_VERIFICATION_DELIVERY_FAILED',
        message:
          'Hesabınız oluşturuldu ancak doğrulama e-postası gönderilemedi. Doğrulama ekranından e-postayı yeniden gönderin.',
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
    const user = await this.repository.getUserByEmail(input.email);
    if (
      !user ||
      !user.passwordHash ||
      !(await this.passwordService.verify(user.passwordHash, input.password))
    ) {
      throw unauthorized('AUTH_INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }
    const eligibleUser = await this.resolveLoginUser(user, input.recoverDeletion);
    if (!eligibleUser.emailVerifiedAt)
      throw forbidden(
        'AUTH_EMAIL_NOT_VERIFIED',
        'Devam etmek için e-posta adresinizi doğrulamanız gerekiyor.',
      );
    const updatedUser = await this.repository.updateUser(eligibleUser.id, { lastLoginAt: new Date() });
    const session = await this.createSession(updatedUser, input, context, user.passwordHash);
    return this.toAuthResponse(updatedUser, session.session, session.refreshToken);
  }

  async refresh(input: RefreshInput, context: AuthRequestContext): Promise<AuthSessionResponse> {
    const session = await this.repository.getSessionByRefreshHash(hashToken(input.refreshToken));
    if (!session) throw unauthorized('AUTH_INVALID_REFRESH_TOKEN');
    if (session.revokedAt) {
      await this.repository.revokeTokenFamily(session.tokenFamilyId, 'REFRESH_TOKEN_REUSE');
      throw unauthorized(
        'AUTH_REFRESH_TOKEN_REUSE',
        'Oturum güvenlik nedeniyle kapatıldı. Lütfen tekrar giriş yapın.',
      );
    }
    if (session.expiresAt <= new Date()) {
      await this.repository.revokeSession(session.id, 'EXPIRED');
      throw unauthorized('AUTH_REFRESH_TOKEN_EXPIRED');
    }
    const user = await this.repository.getUserById(session.userId);
    if (!user) throw unauthorized('AUTH_INVALID_REFRESH_TOKEN');
    requireEligibleUser(user);
    const rawRefreshToken = createOpaqueToken();
    const nextSession = await this.repository
      .rotateSession(session.id, {
        userId: user.id,
        refreshTokenHash: hashToken(rawRefreshToken),
        expiresAt: addDays(this.config.REFRESH_TOKEN_TTL_DAYS),
        deviceId: input.deviceId ?? session.deviceId ?? undefined,
        deviceName: input.deviceName ?? session.deviceName ?? undefined,
        platform: input.platform ?? session.platform ?? undefined,
        appVersion: input.appVersion ?? session.appVersion ?? undefined,
        ipHash: context.ip ? hashStable(context.ip) : session.ipHash,
        userAgent: context.userAgent ?? session.userAgent ?? undefined,
      })
      .catch(async (error: unknown) => {
        // A concurrent replay can pass the service's first read; the repository
        // compare-and-set still detects it. Revoke the winning child as well.
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'AUTH_REFRESH_TOKEN_REUSE'
        )
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

  async forgotPassword(
    email: string,
    context: AuthRequestContext = {},
  ): Promise<{ developmentResetToken?: string }> {
    // Disabled delivery fails equally for known/unknown addresses. SMTP failures
    // below have an identical public response to avoid account enumeration.
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRecoveryAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (
      !user ||
      user.deletedAt ||
      user.status === 'DELETION_PENDING' ||
      user.status === 'DELETED' ||
      user.status === 'SUSPENDED'
    )
      return {};
    const resetToken = createOpaqueToken();
    await this.repository.replaceEmailToken({
      userId: user.id,
      type: 'RESET_PASSWORD',
      tokenHash: hashToken(resetToken),
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    try {
      await this.sendAuthEmail('password-reset', user.email, resetToken);
    } catch {
      // SMTP adapter records a sanitized operational event. Anonymous callers
      // receive only "request accepted / delivery unconfirmed", never "sent".
    }
    return this.allowDevelopmentTokens() ? { developmentResetToken: resetToken } : {};
  }

  async requestAccountDeletionLink(
    email: string,
    context: AuthRequestContext = {},
  ): Promise<{ developmentDeletionToken?: string }> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertRecoveryAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') return {};

    const token = createOpaqueToken();
    await this.repository.replaceEmailToken({
      userId: user.id,
      type: 'DELETE_ACCOUNT',
      tokenHash: hashToken(token),
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + ACCOUNT_DELETION_LINK_TTL_MS),
    });

    try {
      await this.mailService.send(
        accountDeletionMail({
          email: user.email,
          token,
          webUrl:
            this.config.ACCOUNT_DELETION_WEB_URL ??
            'https://ai.ranvals.com/birkare/hesap-silme/',
        }),
      );
    } catch {
      // Deliberately hide delivery/account existence from the public endpoint.
    }

    return this.allowDevelopmentTokens() ? { developmentDeletionToken: token } : {};
  }

  async confirmAccountDeletionLink(input: ConfirmAccountDeletionLinkInput): Promise<{
    deletionRequested: true;
    cleanupNotBefore: string;
    recoveryUntil: string;
    reversible: true;
  }> {
    const token = await this.repository.consumeEmailToken(
      hashToken(input.token),
      'DELETE_ACCOUNT',
    );
    if (!token) {
      throw unauthorized(
        'AUTH_INVALID_DELETION_TOKEN',
        'Hesap silme bağlantısı geçersiz, kullanılmış veya süresi dolmuş.',
      );
    }

    const user = await this.repository.getUserById(token.userId);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap silme işlemi için kullanılamıyor.');
    }

    void input.reason;
    void input.details;
    const record = await this.repository.requestAccountDeletion(user.id);
    return {
      deletionRequested: true,
      cleanupNotBefore: record.notBefore.toISOString(),
      recoveryUntil: record.notBefore.toISOString(),
      reversible: true,
    };
  }

  async resendVerification(
    email: string,
    context: AuthRequestContext = {},
  ): Promise<{ developmentVerificationToken?: string }> {
    this.requireMailAvailability();
    await this.emailSecurityService?.assertResendAllowed(email, context);
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.emailVerifiedAt || user.deletedAt || user.status !== 'PENDING_VERIFICATION')
      return {};
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
      // Same outward response for absent, ineligible and undeliverable accounts.
    }
    return this.allowDevelopmentTokens() ? { developmentVerificationToken: verificationCode } : {};
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const result = await this.repository.completePasswordReset(
      hashToken(token),
      await this.passwordService.hash(password),
    );
    if (result === 'INVALID_TOKEN')
      throw unauthorized(
        'AUTH_INVALID_RESET_TOKEN',
        'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
      );
    if (result === 'ACCOUNT_SUSPENDED')
      throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
    if (result === 'ACCOUNT_UNAVAILABLE')
      throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');
  }

  async verifyEmail(email: string, code: string, context: AuthRequestContext = {}): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    await this.emailSecurityService?.assertVerificationAllowed(normalizedEmail, context);
    if (!/^\d{6}$/.test(code))
      throw unauthorized(
        'AUTH_INVALID_VERIFICATION_TOKEN',
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
      );
    const tokenHash = this.passwordService.hashEmailVerificationCode(normalizedEmail, code);
    const expectedUser = await this.repository.getUserByEmail(normalizedEmail);
    if (!expectedUser)
      throw unauthorized(
        'AUTH_INVALID_VERIFICATION_TOKEN',
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
      );
    requireEligibleUser(expectedUser);
    const result = await this.repository.completeEmailVerification(
      expectedUser.id,
      tokenHash,
      EMAIL_VERIFICATION_MAX_FAILED_ATTEMPTS,
      this.emailSecurityService?.abuseKeyHash(normalizedEmail) ?? hashStable(normalizedEmail),
    );
    if (result.status === 'ACCOUNT_SUSPENDED')
      throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
    if (result.status === 'ACCOUNT_UNAVAILABLE')
      throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');
    if (result.status !== 'VERIFIED')
      throw unauthorized(
        'AUTH_INVALID_VERIFICATION_TOKEN',
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
      );
  }

  /**
   * Creates a BirKare session from a verified Google ID token. We resolve
   * identities by Google's immutable `sub`, never by a mutable display name or
   * an unverified e-mail address.
   */
  async googleLogin(
    input: SocialLoginInput,
    context: AuthRequestContext,
  ): Promise<GoogleLoginResponse> {
    const identity = await this.googleIdentityVerifier.verify(input.idToken);
    return this.loginWithVerifiedSocialIdentity('GOOGLE', identity, input, context);
  }

  async appleLogin(
    input: SocialLoginInput,
    context: AuthRequestContext,
  ): Promise<SocialLoginResponse> {
    if (!this.appleIdentityVerifier) {
      throw unavailable(
        'AUTH_APPLE_NOT_CONFIGURED',
        'Apple ile giriş henüz bu ortam için yapılandırılmadı.',
      );
    }
    const identity = await this.appleIdentityVerifier.verify(input.idToken);
    return this.loginWithVerifiedSocialIdentity(
      'APPLE',
      {
        ...identity,
        ...(input.firstName ? { givenName: input.firstName } : {}),
        ...(input.lastName ? { familyName: input.lastName } : {}),
      },
      input,
      context,
    );
  }

  private async loginWithVerifiedSocialIdentity(
    provider: SocialAuthProvider,
    identity: VerifiedSocialIdentity,
    input: SocialLoginInput,
    context: AuthRequestContext,
  ): Promise<SocialLoginResponse> {
    const linkedUser = await this.repository.getUserByAuthAccount(provider, identity.subject);
    if (linkedUser) return this.createSocialSession(linkedUser, input, context);

    // Deliberately do not auto-link a social identity to a pre-existing
    // password account merely because the email strings match.
    const existingEmailUser = await this.repository.getUserByEmail(identity.email);
    if (existingEmailUser) {
      throw conflict(
        'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED',
        'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.',
      );
    }

    const pendingToken = createOpaqueToken();
    await this.repository.createPendingSocialLogin({
      tokenHash: hashToken(pendingToken),
      provider,
      providerAccountId: identity.subject,
      providerEmail: identity.email,
      givenName: identity.givenName ?? null,
      familyName: identity.familyName ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return {
      needsProfileCompletion: true,
      pendingToken,
      profile: {
        email: identity.email,
        firstName: identity.givenName ?? null,
        lastName: identity.familyName ?? null,
      },
    };
  }

  /**
   * Consumes a one-time social handoff after the user accepts the legal terms
   * and submits their date of birth. The provider ID token never crosses this
   * route and is never written to storage.
   */
  async completeSocialRegistration(
    input: SocialProfileCompletionInput,
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    const dateOfBirth = ensureAdult(input.dateOfBirth);
    if (!dateOfBirth) {
      throw badRequest('AUTH_SOCIAL_PROFILE_REQUIRED', 'Doğum tarihi gereklidir.');
    }
    const pendingTokenHash = hashToken(input.pendingToken);
    const pending =
      (await this.repository.consumePendingSocialLogin(pendingTokenHash, 'GOOGLE')) ??
      (await this.repository.consumePendingSocialLogin(pendingTokenHash, 'APPLE'));
    if (!pending) {
      throw unauthorized(
        'AUTH_SOCIAL_PENDING_TOKEN_INVALID',
        'Sosyal kayıt oturumu geçersiz veya süresi dolmuş. Lütfen yeniden sosyal giriş yapın.',
      );
    }

    const linkedUser = await this.repository.getUserByAuthAccount(
      pending.provider,
      pending.providerAccountId,
    );
    if (linkedUser) return this.createSocialSession(linkedUser, input, context);

    const existingEmailUser = await this.repository.getUserByEmail(pending.providerEmail);
    if (existingEmailUser) {
      throw conflict(
        'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED',
        'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.',
      );
    }

    const user = await this.createSocialUser(
      pending.provider,
      {
        subject: pending.providerAccountId,
        email: pending.providerEmail,
        ...(pending.givenName ? { givenName: pending.givenName } : {}),
        ...(pending.familyName ? { familyName: pending.familyName } : {}),
      },
      input,
      dateOfBirth,
    );
    return this.createSocialSession(user, input, context);
  }

  /**
   * Requires an existing BirKare session, so an ID token cannot silently take
   * over a password account that merely shares its e-mail address.
   */
  async linkGoogle(userId: string, input: SocialLoginInput): Promise<{ linked: true }> {
    const [identity, user] = await Promise.all([
      this.googleIdentityVerifier.verify(input.idToken),
      this.repository.getUserById(userId),
    ]);
    if (!user) throw unauthorized('AUTH_UNAUTHORIZED');
    requireEligibleUser(user);

    if (user.email !== identity.email) {
      throw conflict(
        'AUTH_SOCIAL_EMAIL_MISMATCH',
        'Yalnızca mevcut hesabınızla aynı e-posta adresine ait Google hesabı bağlanabilir.',
      );
    }

    const owner = await this.repository.getUserByAuthAccount('GOOGLE', identity.subject);
    if (owner && owner.id !== user.id) {
      throw conflict('AUTH_SOCIAL_ALREADY_LINKED', 'Bu Google hesabı başka bir hesaba bağlı.');
    }
    if (!owner) {
      await this.repository.linkAuthAccount({
        userId: user.id,
        provider: 'GOOGLE',
        providerAccountId: identity.subject,
        providerEmail: identity.email,
      });
    }
    return { linked: true };
  }

  private async resolveLoginUser(
    user: UserRecord,
    recoverDeletion = false,
  ): Promise<UserRecord> {
    if (user.status === 'SUSPENDED')
      throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');

    if (user.status === 'DELETION_PENDING' || user.deletedAt) {
      const now = new Date();
      const deletion = await this.repository.getAccountDeletion(user.id);
      if (!deletion || deletion.completedAt || deletion.notBefore <= now) {
        throw forbidden(
          'AUTH_ACCOUNT_UNAVAILABLE',
          'Hesabın geri alma süresi sona ermiş veya kalıcı silme işlemi başlamış.',
        );
      }
      if (!recoverDeletion) {
        throw conflict(
          'AUTH_ACCOUNT_DELETION_PENDING',
          'Hesabın silinmek üzere bekliyor. Geri alma süresi dolmadan hesabını yeniden etkinleştirebilirsin.',
          {
            recoveryUntil: deletion.notBefore.toISOString(),
            recoveryDays: ACCOUNT_DELETION_RECOVERY_DAYS,
          },
        );
      }
      const restored = await this.repository.restoreAccountDeletion(user.id, now);
      if (!restored) {
        throw conflict(
          'AUTH_ACCOUNT_DELETION_RECOVERY_EXPIRED',
          'Hesabın geri alma süresi sona ermiş. Kalıcı silme işlemi devam ediyor.',
        );
      }
      const activeUser = await this.repository.getUserById(user.id);
      if (!activeUser || activeUser.status !== 'ACTIVE' || activeUser.deletedAt) {
        throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Hesap yeniden etkinleştirilemedi.');
      }
      return activeUser;
    }

    if (user.status === 'DELETED')
      throw forbidden('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap kullanılamıyor.');

    return user;
  }

  private async createSession(
    user: UserRecord,
    input: Partial<AuthRequestContext>,
    context: AuthRequestContext,
    expectedPasswordHash?: string,
  ): Promise<{ session: SessionRecord; refreshToken: string }> {
    const refreshToken = createOpaqueToken();
    const session = await this.repository.createSession(
      {
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: addDays(this.config.REFRESH_TOKEN_TTL_DAYS),
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        platform: input.platform,
        appVersion: input.appVersion,
        ipHash: context.ip ? hashStable(context.ip) : undefined,
        userAgent: context.userAgent,
      },
      expectedPasswordHash ? { expectedPasswordHash } : undefined,
    );
    return { session, refreshToken };
  }

  private async createSocialUser(
    provider: SocialAuthProvider,
    identity: VerifiedSocialIdentity,
    registration: SocialRegistrationInput,
    dateOfBirth = ensureAdult(registration.dateOfBirth),
  ): Promise<UserRecord> {
    if (!dateOfBirth) {
      throw badRequest('AUTH_SOCIAL_PROFILE_REQUIRED', 'Doğum tarihi gereklidir.');
    }

    try {
      return await this.repository.createVerifiedSocialUser({
        email: identity.email,
        firstName: registration.firstName || identity.givenName || null,
        lastName: registration.lastName || identity.familyName || null,
        locale: registration.locale,
        dateOfBirth,
        provider,
        providerAccountId: identity.subject,
        providerEmail: identity.email,
        consents: createRequiredConsentRecords(registration.consent, 'SOCIAL_REGISTRATION'),
        welcomeCreditAbuseHash: this.emailSecurityService?.abuseKeyHash(identity.email),
      });
    } catch (error) {
      // A concurrent request can create the same provider mapping between our
      // initial lookup and the insert. Resolve that safe race to the one
      // account rather than creating duplicate sessions or accounts.
      const linkedUser = await this.repository.getUserByAuthAccount(provider, identity.subject);
      if (linkedUser) return linkedUser;

      const existingEmailUser = await this.repository.getUserByEmail(identity.email);
      if (existingEmailUser) {
        throw conflict(
          'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED',
          'Bu e-posta ile bir hesap zaten var. Önce mevcut hesabınla giriş yapıp sosyal hesabını bağla.',
        );
      }
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

  private async toAuthResponse(
    user: UserRecord,
    session: SessionRecord,
    refreshToken: string,
  ): Promise<AuthSessionResponse> {
    const access = await this.tokenService.issueAccessToken(user, session.id);
    return {
      user: toPublicUser(user),
      ...access,
      refreshToken,
      session: { id: session.id, expiresAt: session.expiresAt },
    };
  }

  private allowDevelopmentTokens(): boolean {
    return (
      this.config.AUTH_DEV_MODE &&
      (this.config.NODE_ENV === 'development' || this.config.NODE_ENV === 'test')
    );
  }

  private requireMailAvailability(): void {
    if (!this.mailService.enabled && !this.allowDevelopmentTokens()) throw mailUnavailable();
  }

  private async sendAuthEmail(
    kind: 'verification' | 'password-reset',
    email: string,
    token: string,
  ): Promise<void> {
    if (!this.mailService.enabled && this.allowDevelopmentTokens()) return;
    await this.mailService.send(
      authMail({ kind, email, token, scheme: this.config.MAIL_APP_SCHEME }),
    );
  }
}

export { toPublicUser };
