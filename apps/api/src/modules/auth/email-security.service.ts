import { createHmac } from 'node:crypto';
import { resolveMx as nodeResolveMx } from 'node:dns/promises';
import { Redis } from 'ioredis';
import { isValid as isMailcheckerValid } from 'mailchecker';
import {
  RateLimiterMemory,
  RateLimiterRedis,
  type RateLimiterLike,
  type RateLimiterRes,
} from 'rate-limiter-flexible';
import type { BirKareConfig } from '@birkare/config';
import { emailAbuseFingerprint, welcomeCreditAbuseHash } from '@birkare/database';
import { ApiError, badRequest, unavailable } from '@birkare/shared';
import { assertKnownRegistrationProvider, registrationEmailDomain } from './email-provider-policy.js';

const MX_CACHE_TTL_SECONDS = 24 * 60 * 60;
const HARD_DNS_ERRORS = new Set(['ENODATA', 'ENODOMAIN', 'ENOTFOUND', 'NXDOMAIN']);

export type EmailSecurityContext = {
  ip?: string;
  deviceId?: string;
};

type EmailSecurityConfig = Pick<
  BirKareConfig,
  | 'NODE_ENV'
  | 'REDIS_URL'
  | 'PASSWORD_PEPPER'
  | 'EMAIL_DOMAIN_ALLOWLIST'
  | 'EMAIL_DOMAIN_BLOCKLIST'
>;

type Resolver = (domain: string) => Promise<Array<{ exchange: string; priority: number }>>;
const normalizeEmail = (email: string): string => email.trim().toLowerCase();
export { emailAbuseFingerprint };

export class EmailSecurityService {
  private readonly redis: Redis | null;
  private readonly limiters: Record<string, RateLimiterLike>;
  private readonly allowlist: Set<string>;
  private readonly blocklist: Set<string>;
  private readonly mxMemoryCache = new Map<string, { valid: boolean; expiresAt: number }>();

  private constructor(
    private readonly config: EmailSecurityConfig,
    private readonly resolveMx: Resolver,
    redis: Redis | null,
  ) {
    this.redis = redis;
    this.allowlist = new Set(config.EMAIL_DOMAIN_ALLOWLIST.map((domain) => domain.trim().toLowerCase()));
    this.blocklist = new Set(config.EMAIL_DOMAIN_BLOCKLIST.map((domain) => domain.trim().toLowerCase()));
    const limiter = (name: string, points: number, duration: number): RateLimiterLike => {
      const common = { keyPrefix: `birkare_email_${name}`, points, duration };
      return redis
        ? new RateLimiterRedis({ ...common, storeClient: redis, rejectIfRedisNotReady: true })
        : new RateLimiterMemory(common);
    };
    this.limiters = {
      registerIp: limiter('register_ip', 10, 60 * 60),
      registerEmail: limiter('register_email', 3, 60 * 60),
      loginEmail: limiter('login_email', 10, 15 * 60),
      loginIp: limiter('login_ip', 50, 15 * 60),
      recoveryEmail: limiter('recovery_email', 5, 60 * 60),
      recoveryIp: limiter('recovery_ip', 20, 60 * 60),
      resendEmail: limiter('resend_email', 5, 60 * 60),
      resendIp: limiter('resend_ip', 20, 60 * 60),
      resendDevice: limiter('resend_device', 10, 60 * 60),
      resendCooldown: limiter('resend_cooldown', 1, 60),
      verifyEmail: limiter('verify_email', 8, 10 * 60),
      verifyIp: limiter('verify_ip', 30, 10 * 60),
    };
  }

  static async create(
    config: EmailSecurityConfig,
    options: { resolveMx?: Resolver; connectRedis?: boolean } = {},
  ): Promise<EmailSecurityService> {
    let redis: Redis | null = null;
    if (config.REDIS_URL && options.connectRedis !== false) {
      redis = new Redis(config.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      try {
        await redis.connect();
        await redis.ping();
      } catch {
        redis.disconnect();
        throw unavailable(
          'AUTH_SECURITY_STORE_UNAVAILABLE',
          'Kimlik doğrulama güvenlik servisi geçici olarak kullanılamıyor.',
        );
      }
    }
    return new EmailSecurityService(config, options.resolveMx ?? nodeResolveMx, redis);
  }

  async close(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => this.redis?.disconnect());
  }

  async ready(): Promise<boolean> {
    if (!this.redis) return true;
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  abuseKeyHash(email: string): string {
    return welcomeCreditAbuseHash(this.config.PASSWORD_PEPPER, email);
  }

  async assertRegistrationAllowed(email: string, context: EmailSecurityContext): Promise<void> {
    await this.consume(this.limiters.registerIp!, context.ip ?? 'unknown', 'AUTH_REGISTER_RATE_LIMITED');
    await this.consume(this.limiters.registerEmail!, email, 'AUTH_REGISTER_RATE_LIMITED');
    await this.validateRegistrationEmail(email);
  }

  async assertResendAllowed(email: string, context: EmailSecurityContext): Promise<void> {
    await this.consume(this.limiters.resendCooldown!, email, 'AUTH_RESEND_COOLDOWN');
    await this.consume(this.limiters.resendEmail!, email, 'AUTH_RESEND_RATE_LIMITED');
    await this.consume(this.limiters.resendIp!, context.ip ?? 'unknown', 'AUTH_RESEND_RATE_LIMITED');
    if (context.deviceId)
      await this.consume(this.limiters.resendDevice!, context.deviceId, 'AUTH_RESEND_RATE_LIMITED');
  }

  async assertLoginAllowed(email: string, context: EmailSecurityContext): Promise<void> {
    // Existing identities retain access even if their provider is no longer allowed for signup.
    await this.consume(this.limiters.loginEmail!, email, 'AUTH_LOGIN_RATE_LIMITED');
    await this.consume(this.limiters.loginIp!, context.ip ?? 'unknown', 'AUTH_LOGIN_RATE_LIMITED');
  }

  async assertRecoveryAllowed(email: string, context: EmailSecurityContext): Promise<void> {
    await this.consume(this.limiters.recoveryEmail!, email, 'AUTH_RECOVERY_RATE_LIMITED');
    await this.consume(this.limiters.recoveryIp!, context.ip ?? 'unknown', 'AUTH_RECOVERY_RATE_LIMITED');
  }

  async assertVerificationAllowed(email: string, context: EmailSecurityContext): Promise<void> {
    await this.consume(this.limiters.verifyEmail!, email, 'AUTH_VERIFICATION_RATE_LIMITED');
    await this.consume(this.limiters.verifyIp!, context.ip ?? 'unknown', 'AUTH_VERIFICATION_RATE_LIMITED');
  }

  async validateRegistrationEmail(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const domain = registrationEmailDomain(email);
    if (this.blocklist.has(domain)) {
      throw badRequest('EMAIL_DOMAIN_BLOCKED', 'Bu e-posta alan adıyla kayıt oluşturulamıyor.');
    }
    // Manual allowlisting can correct a disposable-list false positive, but
    // NEVER widens the fixed provider policy or bypasses ownership verification.
    if (!this.allowlist.has(domain) && !isMailcheckerValid(email)) {
      throw badRequest('DISPOSABLE_EMAIL_NOT_ALLOWED', 'Geçici e-posta adresleriyle kayıt oluşturulamıyor.');
    }
    assertKnownRegistrationProvider(email, this.config.NODE_ENV);
    if (this.config.NODE_ENV === 'test' && domain.endsWith('.test')) return;
    await this.assertMx(domain);
  }

  private async assertMx(domain: string): Promise<void> {
    try {
      const cached = await this.readMxCache(domain);
      if (cached !== null) {
        if (!cached) this.throwMissingMx();
        return;
      }
      const records = await this.resolveMx(domain);
      const valid = records.some(
        (record) => typeof record.exchange === 'string' && record.exchange.trim() !== '' && record.exchange !== '.',
      );
      await this.writeMxCache(domain, valid);
      if (!valid) this.throwMissingMx();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
      if (HARD_DNS_ERRORS.has(code)) {
        await this.writeMxCache(domain, false);
        this.throwMissingMx();
      }
      throw unavailable(
        'EMAIL_DOMAIN_CHECK_TEMPORARILY_UNAVAILABLE',
        'E-posta alan adı şu an doğrulanamıyor. Lütfen kısa süre sonra tekrar deneyin.',
      );
    }
  }

  private throwMissingMx(): never {
    throw badRequest('EMAIL_DOMAIN_NOT_DELIVERABLE', 'Bu e-posta alan adı ileti kabul etmiyor.');
  }

  private async readMxCache(domain: string): Promise<boolean | null> {
    if (this.redis) {
      const cached = await this.redis.get(`email:mx:${this.hashKey(domain)}`);
      if (cached === '1') return true;
      if (cached === '0') return false;
      return null;
    }
    const cached = this.mxMemoryCache.get(domain);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.mxMemoryCache.delete(domain);
      return null;
    }
    return cached.valid;
  }

  private async writeMxCache(domain: string, valid: boolean): Promise<void> {
    if (this.redis) {
      await this.redis.set(`email:mx:${this.hashKey(domain)}`, valid ? '1' : '0', 'EX', MX_CACHE_TTL_SECONDS);
      return;
    }
    this.mxMemoryCache.set(domain, { valid, expiresAt: Date.now() + MX_CACHE_TTL_SECONDS * 1000 });
  }

  private async consume(limiter: RateLimiterLike, rawKey: string, code: string): Promise<void> {
    try {
      await limiter.consume(this.hashKey(rawKey));
    } catch (reason) {
      if (this.isRateLimitResult(reason)) {
        throw new ApiError({
          statusCode: 429,
          code,
          message: 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.',
          details: { retryAfterSeconds: Math.max(1, Math.ceil(reason.msBeforeNext / 1000)) },
        });
      }
      throw unavailable('AUTH_SECURITY_STORE_UNAVAILABLE', 'Kimlik doğrulama güvenlik servisi geçici olarak kullanılamıyor.');
    }
  }

  private isRateLimitResult(value: unknown): value is RateLimiterRes {
    return Boolean(value && typeof value === 'object' && 'msBeforeNext' in value && typeof value.msBeforeNext === 'number');
  }

  private hashKey(value: string): string {
    return createHmac('sha256', this.config.PASSWORD_PEPPER).update(value.trim().toLowerCase()).digest('hex');
  }
}
