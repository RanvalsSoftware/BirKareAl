import { resolve } from 'node:path';
import { z } from 'zod';

const BooleanFromEnv = z.enum(['true', 'false']).transform((value) => value === 'true');
const OptionalEnvString = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );

// OAuth client IDs identify public app registrations; they are not secrets.
// Keeping the configured BirKare clients as defaults lets a fresh development
// environment verify tokens without copying IDs into a local .env. Deployments
// may always override them with their own values.
const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  '197394599682-vnlj6rrm6iq3nshtnikohohiq0q9gpa2.apps.googleusercontent.com';
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '197394599682-a7897p3rt9i9ocgbmou6pbf1p3hjrepv.apps.googleusercontent.com';
const DefaultedGoogleClientId = (fallback: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim() : fallback),
    z.string().trim().min(20).max(512),
  );

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().trim().min(1).max(80).default('BirKare AI'),
  APP_SLUG: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default('birkare-ai'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  TRUST_PROXY: BooleanFromEnv.default('false'),

  DATABASE_PROVIDER: z.enum(['memory', 'prisma']).default('memory'),
  DATABASE_URL: OptionalEnvString(z.string().url()),
  REDIS_URL: OptionalEnvString(z.string().url()),
  QUEUE_DRIVER: z.enum(['memory', 'bullmq']).default('memory'),
  GENERATION_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  OPENAI_MAX_JOBS_PER_WINDOW: z.coerce.number().int().min(1).max(1000).default(10),
  OPENAI_RATE_WINDOW_MS: z.coerce.number().int().min(1000).max(3_600_000).default(60_000),

  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  LOCAL_STORAGE_PATH: z.string().min(1).default('.local-storage'),
  R2_ENDPOINT: OptionalEnvString(z.string().url()),
  R2_BUCKET: OptionalEnvString(z.string().min(3).max(63)),
  R2_ACCESS_KEY_ID: OptionalEnvString(z.string().min(1)),
  R2_SECRET_ACCESS_KEY: OptionalEnvString(z.string().min(1)),

  JWT_ISSUER: z.string().url().default('http://localhost:3001'),
  JWT_USER_AUDIENCE: z.string().min(1).default('birkare-mobile'),
  JWT_ACCESS_SECRET: OptionalEnvString(z.string().min(32)),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  PASSWORD_PEPPER: OptionalEnvString(z.string().min(16)),
  AUTH_DEV_MODE: BooleanFromEnv.default('true'),
  EMAIL_DOMAIN_ALLOWLIST: z.string().default('privaterelay.appleid.com'),
  EMAIL_DOMAIN_BLOCKLIST: z.string().default(''),

  // Transactional e-mail stays entirely server-side. Disabled is safe locally;
  // password registration/reset fail closed without SMTP or explicit dev tokens.
  MAIL_DRIVER: z.enum(['disabled', 'smtp']).default('disabled'),
  SMTP_HOST: OptionalEnvString(
    z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9.-]+$/)
      .max(253),
  ),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .refine((port) => port === 465 || port === 587)
    .default(587),
  SMTP_SECURE: BooleanFromEnv.default('false'),
  SMTP_USER: OptionalEnvString(z.string().trim().email().max(254)),
  SMTP_PASSWORD: OptionalEnvString(z.string().min(1).max(2048)),
  MAIL_FROM_EMAIL: OptionalEnvString(z.string().trim().email().max(254)),
  MAIL_FROM_NAME: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[^\r\n]+$/)
    .default('BirKare AI'),
  MAIL_APP_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]{1,40}$/)
    .default('birkareai'),
  ACCOUNT_DELETION_WEB_URL: z
    .string()
    .url()
    .default('https://ai.ranvals.com/birkare/hesap-silme/'),
  SUPPORT_EMAIL: z.string().trim().email().max(254).default('birkareal@ranvals.com'),

  // OAuth client IDs identify the applications allowed to mint an identity
  // token for BirKare. They are identifiers, not secrets; OAuth client
  // secrets and signing keys must never be exposed to the mobile app.
  GOOGLE_IOS_CLIENT_ID: DefaultedGoogleClientId(DEFAULT_GOOGLE_IOS_CLIENT_ID),
  GOOGLE_ANDROID_CLIENT_ID: OptionalEnvString(z.string().trim().min(20).max(512)),
  GOOGLE_WEB_CLIENT_ID: DefaultedGoogleClientId(DEFAULT_GOOGLE_WEB_CLIENT_ID),
  APPLE_BUNDLE_ID: OptionalEnvString(z.string().trim().min(3).max(255)),

  // RevenueCat public SDK keys stay in Expo config. The REST secret and
  // webhook authorization token below are backend-only and are used to turn a
  // verified entitlement into server-side Pro access and idempotent credits.
  REVENUECAT_ENABLED: BooleanFromEnv.default('false'),
  REVENUECAT_SECRET_API_KEY: OptionalEnvString(z.string().trim().min(10).max(2048)),
  REVENUECAT_WEBHOOK_AUTH_TOKEN: OptionalEnvString(z.string().trim().min(24).max(2048)),
  REVENUECAT_WEBHOOK_SIGNING_SECRET: OptionalEnvString(z.string().trim().min(32).max(2048)),
  REVENUECAT_ENTITLEMENT_ID: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .default('create_an_app_called_birkare_pro'),
  REVENUECAT_OFFERING_ID: z.string().trim().min(1).max(128).default('birkare_pro'),
  REVENUECAT_MONTHLY_PRODUCT_IDS: z
    .string()
    .trim()
    .min(1)
    .default('monthly,com.birkareai.pro.monthly'),
  REVENUECAT_ANNUAL_PRODUCT_IDS: z
    .string()
    .trim()
    .min(1)
    .default('yearly,com.birkareai.pro.yearly'),
  REVENUECAT_LIFETIME_PRODUCT_IDS: z
    .string()
    .trim()
    .min(1)
    .default('lifetime,com.birkareai.pro.lifetime'),
  REVENUECAT_MONTHLY_CREDITS: z.coerce.number().int().min(0).max(100_000).default(80),
  REVENUECAT_ANNUAL_MONTHLY_CREDITS: z.coerce.number().int().min(0).max(100_000).default(80),
  REVENUECAT_LIFETIME_CREDITS: z.coerce.number().int().min(0).max(100_000).default(200),
  REVENUECAT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(8_000),
  REVENUECAT_CACHE_TTL_MS: z.coerce.number().int().min(0).max(300_000).default(30_000),

  OPENAI_API_KEY: OptionalEnvString(z.string().min(10)),
  OPENAI_TEXT_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  /** Fast/default lane: previews, filters, trends and ordinary scene work. */
  OPENAI_IMAGE_MODEL: z.string().min(1).default('gpt-image-2.5-flare'),
  /** Precision lane: beauty, gender presentation, Pro portrait and character identity work. */
  OPENAI_IMAGE_PREMIUM_MODEL: z.string().min(1).default('gpt-image-2.5-sunburst'),
  OPENAI_MODERATION_MODEL: z.string().min(1).default('omni-moderation-latest'),
  AI_PROVIDER: z.enum(['fake', 'openai', 'disabled']).default('fake'),
  ENABLE_INLINE_WORKER: BooleanFromEnv.default('true'),
  DISABLE_ALL_GENERATION: BooleanFromEnv.default('false'),
  ALLOW_LOCAL_STORAGE: BooleanFromEnv.default('false'),
});

export type BirKareConfig = Omit<
  z.infer<typeof RawEnvSchema>,
  | 'CORS_ORIGINS'
  | 'LOCAL_STORAGE_PATH'
  | 'JWT_ACCESS_SECRET'
  | 'PASSWORD_PEPPER'
  | 'EMAIL_DOMAIN_ALLOWLIST'
  | 'EMAIL_DOMAIN_BLOCKLIST'
> & {
  CORS_ORIGINS: string[];
  LOCAL_STORAGE_PATH: string;
  JWT_ACCESS_SECRET: string;
  PASSWORD_PEPPER: string;
  EMAIL_DOMAIN_ALLOWLIST: string[];
  EMAIL_DOMAIN_BLOCKLIST: string[];
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): BirKareConfig {
  if (source.EXPO_PUBLIC_OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY yalnızca server environment içinde tanımlanmalıdır.');
  }
  if (source.EXPO_PUBLIC_SMTP_PASSWORD?.trim()) {
    throw new Error('SMTP_PASSWORD yalnızca server environment içinde tanımlanmalıdır.');
  }
  if (
    source.EXPO_PUBLIC_REVENUECAT_SECRET_API_KEY?.trim() ||
    source.EXPO_PUBLIC_REVENUECAT_WEBHOOK_AUTH_TOKEN?.trim() ||
    source.EXPO_PUBLIC_REVENUECAT_WEBHOOK_SIGNING_SECRET?.trim()
  ) {
    throw new Error(
      'RevenueCat secret ve webhook token yalnızca server environment içinde tanımlanmalıdır.',
    );
  }
  const parsed = RawEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Geçersiz ortam yapılandırması: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`,
    );
  }

  const config = parsed.data;
  if (config.MAIL_DRIVER === 'smtp') {
    if (
      !config.SMTP_HOST ||
      !config.SMTP_USER ||
      !config.SMTP_PASSWORD ||
      !config.MAIL_FROM_EMAIL
    ) {
      throw new Error(
        'MAIL_DRIVER=smtp iken SMTP_HOST, SMTP_USER, SMTP_PASSWORD ve MAIL_FROM_EMAIL zorunludur.',
      );
    }
    if (config.SMTP_SECURE !== (config.SMTP_PORT === 465)) {
      throw new Error(
        'SMTP için port 465 ile SMTP_SECURE=true, port 587 ile SMTP_SECURE=false kullanılmalıdır.',
      );
    }
  }
  const isProductionLike = config.NODE_ENV === 'production' || config.NODE_ENV === 'staging';
  if (config.DATABASE_PROVIDER === 'prisma' && !config.DATABASE_URL) {
    throw new Error('DATABASE_PROVIDER=prisma iken DATABASE_URL zorunludur.');
  }
  if (config.QUEUE_DRIVER === 'bullmq' && !config.REDIS_URL) {
    throw new Error('QUEUE_DRIVER=bullmq iken REDIS_URL zorunludur.');
  }
  if (
    config.STORAGE_DRIVER === 'r2' &&
    (!config.R2_ENDPOINT ||
      !config.R2_BUCKET ||
      !config.R2_ACCESS_KEY_ID ||
      !config.R2_SECRET_ACCESS_KEY)
  ) {
    throw new Error('STORAGE_DRIVER=r2 iken R2 bağlantı değişkenleri zorunludur.');
  }
  if (
    isProductionLike &&
    config.STORAGE_DRIVER === 'r2' &&
    config.R2_ENDPOINT &&
    new URL(config.R2_ENDPOINT).protocol !== 'https:'
  ) {
    throw new Error('Production ve staging ortamında R2_ENDPOINT HTTPS kullanmalıdır.');
  }
  if (config.AI_PROVIDER === 'openai' && !config.OPENAI_API_KEY) {
    throw new Error('AI_PROVIDER=openai iken OPENAI_API_KEY zorunludur.');
  }
  if (
    config.REVENUECAT_ENABLED &&
    (!config.REVENUECAT_SECRET_API_KEY || !config.REVENUECAT_WEBHOOK_AUTH_TOKEN)
  ) {
    throw new Error(
      'REVENUECAT_ENABLED=true iken REVENUECAT_SECRET_API_KEY ve REVENUECAT_WEBHOOK_AUTH_TOKEN zorunludur.',
    );
  }
  if (
    isProductionLike &&
    config.REVENUECAT_ENABLED &&
    !config.REVENUECAT_SECRET_API_KEY?.startsWith('sk_')
  ) {
    throw new Error(
      'Production ortamında REVENUECAT_SECRET_API_KEY için RevenueCat Secret API key (sk_...) kullanılmalıdır.',
    );
  }
  if (isProductionLike && config.REVENUECAT_ENABLED && !config.REVENUECAT_WEBHOOK_SIGNING_SECRET) {
    throw new Error(
      'Production ortamında RevenueCat webhook HMAC doğrulaması için REVENUECAT_WEBHOOK_SIGNING_SECRET zorunludur.',
    );
  }
  if (isProductionLike && !config.JWT_ACCESS_SECRET) {
    throw new Error('Production ortamında JWT_ACCESS_SECRET zorunludur.');
  }
  if (isProductionLike && (!config.PASSWORD_PEPPER || config.PASSWORD_PEPPER.length < 32)) {
    throw new Error('Production ortamında PASSWORD_PEPPER (en az 32 karakter) zorunludur.');
  }
  if (
    isProductionLike &&
    config.JWT_ACCESS_SECRET &&
    config.PASSWORD_PEPPER &&
    config.JWT_ACCESS_SECRET === config.PASSWORD_PEPPER
  ) {
    throw new Error('JWT_ACCESS_SECRET ve PASSWORD_PEPPER birbirinden farklı olmalıdır.');
  }
  if (isProductionLike && new URL(config.JWT_ISSUER).protocol !== 'https:') {
    throw new Error('Production ve staging ortamında JWT_ISSUER HTTPS kullanmalıdır.');
  }
  if (isProductionLike && new URL(config.ACCOUNT_DELETION_WEB_URL).protocol !== 'https:') {
    throw new Error(
      'Production ve staging ortamında ACCOUNT_DELETION_WEB_URL HTTPS kullanmalıdır.',
    );
  }
  if (isProductionLike) {
    const origins = config.CORS_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      origins.length === 0 ||
      origins.some((origin) => {
        if (origin === '*') return true;
        try {
          return new URL(origin).protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      throw new Error(
        'Production ve staging ortamında CORS_ORIGINS yalnızca açık HTTPS origin değerleri içermelidir.',
      );
    }
  }
  if (isProductionLike && config.DATABASE_PROVIDER !== 'prisma') {
    throw new Error('Production ortamında in-memory repository kullanılamaz.');
  }
  if (isProductionLike && config.QUEUE_DRIVER !== 'bullmq') {
    throw new Error('Production ortamında BullMQ/Redis kuyruğu zorunludur.');
  }
  if (isProductionLike && config.STORAGE_DRIVER !== 'r2' && !config.ALLOW_LOCAL_STORAGE) {
    throw new Error(
      'Production ortamında private R2 storage zorunludur; tek host kurulumu için ALLOW_LOCAL_STORAGE=true ayarlanmalıdır.',
    );
  }
  if (isProductionLike && config.AUTH_DEV_MODE) {
    throw new Error('Production ortamında AUTH_DEV_MODE=false olmalıdır.');
  }

  return {
    ...config,
    JWT_ACCESS_SECRET:
      config.JWT_ACCESS_SECRET ?? 'development-only-secret-change-before-production-0001',
    PASSWORD_PEPPER: config.PASSWORD_PEPPER ?? 'development-only-pepper-change-before-production',
    CORS_ORIGINS: config.CORS_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    EMAIL_DOMAIN_ALLOWLIST: config.EMAIL_DOMAIN_ALLOWLIST.split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    EMAIL_DOMAIN_BLOCKLIST: config.EMAIL_DOMAIN_BLOCKLIST.split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    LOCAL_STORAGE_PATH: resolve(config.LOCAL_STORAGE_PATH),
  };
}

export const getConfig = (): BirKareConfig => loadConfig();
