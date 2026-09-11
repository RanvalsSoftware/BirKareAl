import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(file(name), 'utf8');
const write = (name, value) => {
  fs.mkdirSync(path.dirname(file(name)), { recursive: true });
  fs.writeFileSync(file(name), value.endsWith('\n') ? value : `${value}\n`);
};
const replaceRequired = (value, search, replacement, label) => {
  if (!value.includes(search)) throw new Error(`Patch point not found: ${label}`);
  return value.replace(search, replacement);
};

// ---------------------------------------------------------------------------
// Mobile public RevenueCat build configuration
// ---------------------------------------------------------------------------
write(
  'apps/mobile/config/revenuecat.cjs',
  `// RevenueCat public SDK keys only. Never put an sk_ secret here.
const ENTITLEMENT_ID = 'create_an_app_called_birkare_pro';
const OFFERING_ID = 'birkare_pro';
const DEVELOPMENT_TEST_KEY = 'test_jemSfADmikBxJuxsDsxIIdWMdec';
const DEFAULT_IOS_PUBLIC_KEY = 'appl_MbKttQjNGBgBFiVaQUnwzZHgOce';

function resolveRevenueCatConfig(values) {
  const appEnv = values.EXPO_PUBLIC_APP_ENV?.trim() || 'development';
  const buildProfile = values.EAS_BUILD_PROFILE?.trim() || '';
  const targetPlatform =
    values.EAS_BUILD_PLATFORM?.trim() ||
    (values.BIRKARE_IOS_RELEASE === '1'
      ? 'ios'
      : values.BIRKARE_ANDROID_RELEASE === '1'
        ? 'android'
        : '');
  const release =
    appEnv !== 'development' ||
    ['production', 'staging'].includes(buildProfile) ||
    values.BIRKARE_RELEASE_BUILD === '1' ||
    Boolean(targetPlatform);

  function validate(value, prefix, name) {
    if (!value) return '';
    if (value.startsWith('sk_')) throw new Error(\`\${name} must be a public SDK key, never a secret API key.\`);
    if (value.startsWith('test_')) {
      if (release) throw new Error('RevenueCat Test Store keys cannot be used in store builds.');
      return value;
    }
    if (!value.startsWith(prefix)) throw new Error(\`\${name} must use the \${prefix} platform public key.\`);
    return value;
  }

  const iosApiKey = validate(
    values.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
      (release ? DEFAULT_IOS_PUBLIC_KEY : DEVELOPMENT_TEST_KEY),
    'appl_',
    'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  );
  const androidApiKey = validate(
    values.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ||
      (release ? '' : DEVELOPMENT_TEST_KEY),
    'goog_',
    'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  );

  if (targetPlatform === 'ios' && !iosApiKey)
    throw new Error('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is required for an iOS store build.');
  if (targetPlatform === 'android' && !androidApiKey)
    throw new Error('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is required for an Android store build.');

  return {
    appEnv,
    entitlementId: ENTITLEMENT_ID,
    offeringId: values.EXPO_PUBLIC_REVENUECAT_OFFERING_ID?.trim() || OFFERING_ID,
    iosApiKey,
    androidApiKey,
  };
}

module.exports = { ENTITLEMENT_ID, OFFERING_ID, resolveRevenueCatConfig };
`,
);

write(
  'apps/mobile/config/revenuecat.d.cts',
  `export const ENTITLEMENT_ID: 'create_an_app_called_birkare_pro';
export const OFFERING_ID: 'birkare_pro';
export type RevenueCatPublicConfig = {
  appEnv: string;
  entitlementId: string;
  offeringId: string;
  iosApiKey: string;
  androidApiKey: string;
};
export function resolveRevenueCatConfig(
  values: Record<string, string | undefined>,
): RevenueCatPublicConfig;
`,
);

write(
  'apps/mobile/config/revenuecat.test.ts',
  `import { describe, expect, it } from 'vitest';
import { ENTITLEMENT_ID, OFFERING_ID, resolveRevenueCatConfig } from './revenuecat.cjs';

describe('RevenueCat public build configuration', () => {
  it('uses Test Store defaults only in development', () => {
    const config = resolveRevenueCatConfig({});
    expect(config.iosApiKey).toMatch(/^test_/);
    expect(config.androidApiKey).toBe(config.iosApiKey);
    expect(config.entitlementId).toBe(ENTITLEMENT_ID);
    expect(config.offeringId).toBe(OFFERING_ID);
  });

  it('uses BirKare iOS public key for an iOS store build', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'staging',
      BIRKARE_IOS_RELEASE: '1',
    });
    expect(config.iosApiKey).toMatch(/^appl_/);
    expect(config.androidApiKey).toBe('');
  });

  it('supports distinct platform public SDK keys', () => {
    const config = resolveRevenueCatConfig({
      EXPO_PUBLIC_APP_ENV: 'production',
      EAS_BUILD_PLATFORM: 'android',
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_example',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_example',
    });
    expect(config.iosApiKey).toBe('appl_example');
    expect(config.androidApiKey).toBe('goog_example');
  });

  it('rejects Test Store keys in release builds', () => {
    expect(() =>
      resolveRevenueCatConfig({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_wrong',
      }),
    ).toThrow(/Test Store/);
  });

  it('requires a Google public key for Android store builds', () => {
    expect(() =>
      resolveRevenueCatConfig({
        EXPO_PUBLIC_APP_ENV: 'staging',
        BIRKARE_ANDROID_RELEASE: '1',
      }),
    ).toThrow(/ANDROID_API_KEY/);
  });

  it('rejects secret and swapped platform keys', () => {
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'sk_never_public' }),
    ).toThrow(/secret/);
    expect(() =>
      resolveRevenueCatConfig({ EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'goog_wrong' }),
    ).toThrow(/appl_/);
  });
});
`,
);

// ---------------------------------------------------------------------------
// Select the exact BirKare offering instead of silently using an unrelated one.
// ---------------------------------------------------------------------------
{
  const name = 'apps/mobile/src/features/billing/revenuecat-client.ts';
  let source = read(name);
  if (!source.includes('offeringId: string;')) {
    source = replaceRequired(
      source,
      `  entitlementId: string;\n`,
      `  entitlementId: string;\n  offeringId: string;\n`,
      'RevenueCat ClientOptions offeringId',
    );
  }
  const oldRead = `      const offerings = await sdkModule!.default.getOfferings();\n      if (current(version, userId)) {\n        publish({\n          offering: offerings.current,\n          error: offerings.current\n            ? null\n            : 'RevenueCat’te bu uygulama için geçerli bir offering bulunamadı. Ürünleri bağlayıp current offering seçin.',\n        });\n      }`;
  const newRead = `      const offerings = await sdkModule!.default.getOfferings();\n      const selected = offerings.all[options.offeringId] ??\n        (offerings.current?.identifier === options.offeringId ? offerings.current : null);\n      if (current(version, userId)) {\n        publish({\n          offering: selected,\n          error: selected\n            ? null\n            : \`RevenueCat’te \\"\${options.offeringId}\\" offering bulunamadı. Paket bağlantılarını ve current offering ayarını kontrol edin.\`,\n        });\n      }`;
  if (!source.includes('offerings.all[options.offeringId]')) {
    source = replaceRequired(source, oldRead, newRead, 'exact RevenueCat offering selection');
  }
  write(name, source);
}

// ---------------------------------------------------------------------------
// Pass offering ID and perform server reconciliation after CustomerInfo changes.
// ---------------------------------------------------------------------------
{
  const name = 'apps/mobile/src/features/billing/revenuecat.tsx';
  let source = read(name);
  if (!source.includes("import { apiRequest } from '@/api/client';")) {
    source = source.replace(
      `import { useQueryClient } from '@tanstack/react-query';\n`,
      `import { useQueryClient } from '@tanstack/react-query';\nimport { apiRequest } from '@/api/client';\n`,
    );
  }
  if (!source.includes('offeringId: config?.offeringId')) {
    source = source.replace(
      `  entitlementId,\n  unavailableReason: unavailableReason(),`,
      `  entitlementId,\n  offeringId: config?.offeringId ?? 'birkare_pro',\n  unavailableReason: unavailableReason(),`,
    );
  }
  const oldInvalidate = `        // Read the authoritative backend wallet; never add credits on-device.\n        void queryClient\n          .invalidateQueries({\n            queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, state.userId ?? undefined),\n          })\n          .catch(() => undefined);`;
  const newInvalidate = `        // Reconcile the signed-in App User ID on the server. The phone never\n        // grants credits; RevenueCat REST verification and idempotent backend\n        // records remain authoritative. A webhook normally arrives first, while\n        // this call recovers delayed or missed delivery.\n        void apiRequest('/v1/billing/sync', { method: 'POST' })\n          .catch(() => undefined)\n          .finally(() =>\n            queryClient\n              .invalidateQueries({\n                queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, state.userId ?? undefined),\n              })\n              .catch(() => undefined),\n          );`;
  if (!source.includes("apiRequest('/v1/billing/sync'")) {
    source = replaceRequired(source, oldInvalidate, newInvalidate, 'backend RevenueCat reconciliation');
  }
  write(name, source);
}

// ---------------------------------------------------------------------------
// Compact entry card. The actual paywall is the custom /pro React Native route.
// ---------------------------------------------------------------------------
write(
  'apps/mobile/src/features/billing/SubscriptionCard.tsx',
  `import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { ProBadge } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useRevenueCat } from './revenuecat';
import type { BillingResult } from './revenuecat-client';

function notify(result: BillingResult, restoring = false) {
  if (result.kind === 'cancelled') return;
  if (result.kind === 'pending' || result.kind === 'error') {
    Alert.alert(result.kind === 'pending' ? 'Onay bekleniyor' : 'BirKare Pro', result.message);
    return;
  }
  Alert.alert(
    'BirKare Pro',
    result.isPro
      ? restoring
        ? 'Pro erişimin başarıyla geri yüklendi.'
        : 'Pro erişimin aktif.'
      : 'Bu hesap için aktif Pro hakkı bulunamadı.',
  );
}

export function SubscriptionCard() {
  const billing = useRevenueCat();
  const { refresh } = billing;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const expiration = billing.entitlement?.expirationDate;
  const expires =
    expiration && Number.isFinite(Date.parse(expiration))
      ? new Date(expiration).toLocaleDateString('tr-TR')
      : null;

  return (
    <LinearGradient colors={['#17120A', '#111111', '#171022']} style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={billing.isPro ? 'crown' : 'sparkles'} size={27} color={colors.accentYellow} />
      </View>
      <View style={styles.copy}>
        <ProBadge label={billing.isPro ? 'BirKare Pro · Aktif' : 'BirKare Pro'} />
        <Text style={styles.title}>
          {billing.isPro ? 'Pro özelliklerin hazır' : 'Hayalindeki kareye daha güçlü adım at.'}
        </Text>
        <Text style={styles.detail}>
          {billing.isPro
            ? expires
              ? `${billing.entitlement?.willRenew ? 'Yenileme' : 'Erişim bitişi'}: ${expires}`
              : 'Ömür boyu Pro erişimi'
            : 'Premium sahneler, gelişmiş filtreler ve Pro üretim araçları.'}
        </Text>
        {billing.isTestStore ? <Text style={styles.test}>TEST ORTAMI · Gerçek ücret alınmaz.</Text> : null}
        {billing.error ? <Text style={styles.warning}>{billing.error}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={billing.busy}
          onPress={() =>
            billing.isPro
              ? void billing.presentCustomerCenter().then((result) => notify(result))
              : router.push('/pro' as never)
          }
          style={[styles.primary, billing.busy && styles.disabled]}
        >
          <Text style={styles.primaryText}>{billing.isPro ? 'Yönet' : 'Pro’yu incele'}</Text>
          <Ionicons name="arrow-forward" size={17} color="#050505" />
        </Pressable>
        {billing.isPro ? (
          <Pressable
            accessibilityRole="button"
            disabled={billing.busy}
            onPress={() => void billing.restore().then((result) => notify(result, true))}
            style={styles.restore}
          >
            <Text style={styles.restoreText}>Geri yükle</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(255,196,0,0.34)', ...shadows.yellow },
  iconWrap: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentYellowSoft, marginBottom: 14 },
  copy: { gap: 7 },
  title: { ...typography.h3, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  test: { ...typography.overline, color: colors.accentYellow, marginTop: 2 },
  warning: { ...typography.caption, color: colors.warning },
  actions: { marginTop: 16, gap: 5 },
  primary: { minHeight: 50, borderRadius: 15, backgroundColor: colors.accentYellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { ...typography.label, color: '#050505', fontWeight: '900' },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { ...typography.label, color: colors.accentYellow },
  disabled: { opacity: 0.45 },
});
`,
);

// Add the modal route.
{
  const name = 'apps/mobile/app/_layout.tsx';
  let source = read(name);
  if (!source.includes('name="pro"')) {
    source = replaceRequired(
      source,
      `          <Stack.Screen name="legal"\n            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}\n          />`,
      `          <Stack.Screen name="legal"\n            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}\n          />\n          <Stack.Screen\n            name="pro"\n            options={{\n              presentation: 'fullScreenModal',\n              animation: reducedMotion ? 'none' : 'slide_from_bottom',\n            }}\n          />`,
      'custom Pro route',
    );
  }
  write(name, source);
}

// Correct the credit estimate to the shared STANDARD cost of four credits.
{
  const name = 'apps/mobile/app/(tabs)/credits.tsx';
  let source = read(name);
  source = source.replace(
    'Math.floor(availableCredits / 3)',
    'Math.floor(availableCredits / 4)',
  );
  write(name, source);
}

// ---------------------------------------------------------------------------
// Backend environment schema
// ---------------------------------------------------------------------------
{
  const name = 'packages/config/src/index.ts';
  let source = read(name);
  if (!source.includes('REVENUECAT_ENABLED:')) {
    const insertion = `  APPLE_BUNDLE_ID: OptionalEnvString(z.string().trim().min(3).max(255)),\n\n  // RevenueCat verification is server-only. Public SDK keys never belong here.\n  REVENUECAT_ENABLED: BooleanFromEnv.default('false'),\n  REVENUECAT_SECRET_API_KEY: OptionalEnvString(z.string().trim().min(10)),\n  REVENUECAT_WEBHOOK_AUTH_TOKEN: OptionalEnvString(z.string().trim().min(24)),\n  REVENUECAT_ENTITLEMENT_ID: z.string().trim().min(1).default('create_an_app_called_birkare_pro'),\n  REVENUECAT_OFFERING_ID: z.string().trim().min(1).default('birkare_pro'),\n  REVENUECAT_MONTHLY_PRODUCT_IDS: z.string().default('monthly,com.birkareai.pro.monthly'),\n  REVENUECAT_ANNUAL_PRODUCT_IDS: z.string().default('yearly,com.birkareai.pro.yearly'),\n  REVENUECAT_LIFETIME_PRODUCT_IDS: z.string().default('lifetime,com.birkareai.pro.lifetime'),\n  REVENUECAT_MONTHLY_CREDITS: z.coerce.number().int().min(0).max(100000).default(80),\n  REVENUECAT_ANNUAL_MONTHLY_CREDITS: z.coerce.number().int().min(0).max(100000).default(100),\n  REVENUECAT_LIFETIME_CREDITS: z.coerce.number().int().min(0).max(100000).default(200),\n  REVENUECAT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),\n  REVENUECAT_CACHE_TTL_MS: z.coerce.number().int().min(0).max(300000).default(30000),`;
    source = replaceRequired(
      source,
      `  APPLE_BUNDLE_ID: OptionalEnvString(z.string().trim().min(3).max(255)),`,
      insertion,
      'server RevenueCat config fields',
    );
  }
  if (!source.includes('REVENUECAT_ENABLED=true requires')) {
    const marker = `  if (config.AI_PROVIDER === 'openai' && !config.OPENAI_API_KEY) {`;
    const validation = `  if (\n    config.REVENUECAT_ENABLED &&\n    (!config.REVENUECAT_SECRET_API_KEY || !config.REVENUECAT_WEBHOOK_AUTH_TOKEN)\n  ) {\n    throw new Error(\n      'REVENUECAT_ENABLED=true requires REVENUECAT_SECRET_API_KEY and REVENUECAT_WEBHOOK_AUTH_TOKEN.',\n    );\n  }\n`;
    source = replaceRequired(source, marker, `${validation}${marker}`, 'server RevenueCat config validation');
  }
  write(name, source);
}

// ---------------------------------------------------------------------------
// Database contract and Prisma idempotency
// ---------------------------------------------------------------------------
{
  const name = 'packages/database/src/types.ts';
  let source = read(name);
  if (!source.includes('export type GrantCreditsInput')) {
    const marker = `export type IdempotencyRecord = {`;
    const types = `export type GrantCreditsInput = {\n  userId: string;\n  amount: number;\n  type: 'PURCHASE' | 'SUBSCRIPTION_GRANT' | 'BONUS' | 'ADMIN_ADJUSTMENT' | 'REFUND' | 'CHARGEBACK';\n  referenceType: string;\n  referenceId: string;\n  idempotencyKey: string;\n  description?: string;\n};\n\nexport type GrantCreditsResult = {\n  wallet: CreditWalletRecord;\n  transaction: CreditTransactionRecord;\n  created: boolean;\n};\n\n`;
    source = replaceRequired(source, marker, `${types}${marker}`, 'GrantCredits types');
  }
  if (!source.includes('grantCredits(input: GrantCreditsInput)')) {
    source = replaceRequired(
      source,
      `  getWallet(userId: string): Promise<CreditWalletRecord>;\n`,
      `  getWallet(userId: string): Promise<CreditWalletRecord>;\n  grantCredits(input: GrantCreditsInput): Promise<GrantCreditsResult>;\n`,
      'grantCredits repository contract',
    );
  }
  write(name, source);
}

{
  const name = 'packages/database/prisma/schema.prisma';
  let source = read(name);
  if (!source.includes('@@unique([userId, idempotencyKey])')) {
    const modelStart = source.indexOf('model CreditTransaction {');
    if (modelStart < 0) throw new Error('CreditTransaction model not found');
    const modelEnd = source.indexOf('\n}', modelStart);
    const model = source.slice(modelStart, modelEnd);
    const patched = model.replace(
      /\n(\s*@@index\(\[userId[^\n]*\)\s*)$/m,
      `\n  @@unique([userId, idempotencyKey])\n$1`,
    );
    if (patched === model) {
      source = `${source.slice(0, modelEnd)}\n  @@unique([userId, idempotencyKey])${source.slice(modelEnd)}`;
    } else {
      source = source.slice(0, modelStart) + patched + source.slice(modelEnd);
    }
  }
  write(name, source);
}

// Memory repository: discover the existing wallet/transaction Map fields.
{
  const name = 'packages/database/src/memory.repository.ts';
  let source = read(name);
  if (!source.includes('async grantCredits(')) {
    if (!source.includes("from 'node:crypto'")) {
      source = `import { randomUUID } from 'node:crypto';\n${source}`;
    } else if (!source.includes('randomUUID')) {
      source = source.replace(/import \{([^}]+)\} from 'node:crypto';/, (all, imports) =>
        `import { ${imports.trim()}, randomUUID } from 'node:crypto';`,
      );
    }
    const walletField =
      source.match(/(?:private|protected)(?: readonly)?\s+(\w+)\s*=\s*new Map<[^;\n]*CreditWalletRecord/)?.[1] ??
      source.match(/async getWallet\([\s\S]{0,900}?this\.(\w+)\.(?:get|set)\(/)?.[1];
    const transactionField =
      source.match(/(?:private|protected)(?: readonly)?\s+(\w+)\s*=\s*new Map<[^;\n]*CreditTransactionRecord/)?.[1] ??
      source.match(/async listCreditTransactions\([\s\S]{0,900}?this\.(\w+)/)?.[1];
    if (!walletField || !transactionField)
      throw new Error('Could not discover memory wallet/transaction stores');
    const marker = `  async reserveCredits(`;
    const method = `  async grantCredits(input: GrantCreditsInput): Promise<GrantCreditsResult> {\n    if (!Number.isInteger(input.amount) || input.amount === 0)\n      throw new Error('Credit grant amount must be a non-zero integer.');\n    const existing = Array.from(this.${transactionField}.values()).find(\n      (item) => item.userId === input.userId && item.idempotencyKey === input.idempotencyKey,\n    );\n    if (existing) {\n      return { wallet: await this.getWallet(input.userId), transaction: structuredClone(existing), created: false };\n    }\n    const current = await this.getWallet(input.userId);\n    const updated: CreditWalletRecord = {\n      ...current,\n      available: current.available + input.amount,\n      lifetimeEarned: current.lifetimeEarned + Math.max(0, input.amount),\n      lifetimeSpent: current.lifetimeSpent + Math.max(0, -input.amount),\n      version: current.version + 1,\n      updatedAt: new Date(),\n    };\n    if (updated.available < 0) throw new Error('Credit balance cannot become negative.');\n    this.${walletField}.set(input.userId, structuredClone(updated));\n    const transaction: CreditTransactionRecord = {\n      id: randomUUID(),\n      userId: input.userId,\n      type: input.type,\n      status: 'COMPLETED',\n      amount: input.amount,\n      availableAfter: updated.available,\n      reservedAfter: updated.reserved,\n      referenceType: input.referenceType,\n      referenceId: input.referenceId,\n      idempotencyKey: input.idempotencyKey,\n      description: input.description ?? null,\n      createdAt: new Date(),\n      completedAt: new Date(),\n    };\n    this.${transactionField}.set(transaction.id, structuredClone(transaction));\n    return { wallet: structuredClone(updated), transaction: structuredClone(transaction), created: true };\n  }\n\n`;
    source = replaceRequired(source, marker, `${method}${marker}`, 'memory grantCredits method');
  }
  if (!source.includes('GrantCreditsInput')) {
    throw new Error('memory repository type imports must include GrantCreditsInput');
  }
  write(name, source);
}

// Prisma repository method. Add missing type imports dynamically.
{
  const name = 'packages/database/src/prisma.repository.ts';
  let source = read(name);
  if (!source.includes('GrantCreditsInput')) {
    source = source.replace(
      /import type \{([\s\S]*?)\} from '\.\/types\.js';/,
      (all, imports) => `import type {${imports}  GrantCreditsInput,\n  GrantCreditsResult,\n} from './types.js';`,
    );
  }
  if (!source.includes('async grantCredits(')) {
    const marker = `  async reserveCredits(`;
    const method = `  async grantCredits(input: GrantCreditsInput): Promise<GrantCreditsResult> {\n    if (!Number.isInteger(input.amount) || input.amount === 0)\n      throw new Error('Credit grant amount must be a non-zero integer.');\n    const unique = { userId: input.userId, idempotencyKey: input.idempotencyKey };\n    const readExisting = async () => {\n      const transaction = await this.prisma.creditTransaction.findUnique({\n        where: { userId_idempotencyKey: unique },\n      });\n      if (!transaction) return null;\n      const wallet = await this.prisma.creditWallet.findUniqueOrThrow({ where: { userId: input.userId } });\n      return {\n        wallet: wallet as unknown as CreditWalletRecord,\n        transaction: transaction as unknown as CreditTransactionRecord,\n        created: false,\n      };\n    };\n    const existing = await readExisting();\n    if (existing) return existing;\n    try {\n      return await this.prisma.$transaction(async (tx) => {\n        const wallet = await tx.creditWallet.upsert({\n          where: { userId: input.userId },\n          create: {\n            userId: input.userId,\n            available: input.amount,\n            reserved: 0,\n            lifetimeEarned: Math.max(0, input.amount),\n            lifetimeSpent: Math.max(0, -input.amount),\n            version: 1,\n          },\n          update: {\n            available: { increment: input.amount },\n            lifetimeEarned: { increment: Math.max(0, input.amount) },\n            lifetimeSpent: { increment: Math.max(0, -input.amount) },\n            version: { increment: 1 },\n          },\n        });\n        if (wallet.available < 0) throw new Error('Credit balance cannot become negative.');\n        const transaction = await tx.creditTransaction.create({\n          data: {\n            userId: input.userId,\n            type: input.type,\n            status: 'COMPLETED',\n            amount: input.amount,\n            availableAfter: wallet.available,\n            reservedAfter: wallet.reserved,\n            referenceType: input.referenceType,\n            referenceId: input.referenceId,\n            idempotencyKey: input.idempotencyKey,\n            description: input.description ?? null,\n            completedAt: new Date(),\n          },\n        });\n        return {\n          wallet: wallet as unknown as CreditWalletRecord,\n          transaction: transaction as unknown as CreditTransactionRecord,\n          created: true,\n        };\n      });\n    } catch (error) {\n      if ((error as { code?: string } | null)?.code === 'P2002') {\n        const duplicate = await readExisting();\n        if (duplicate) return duplicate;\n      }\n      throw error;\n    }\n  }\n\n`;
    source = replaceRequired(source, marker, `${method}${marker}`, 'Prisma grantCredits method');
  }
  write(name, source);
}

// ---------------------------------------------------------------------------
// RevenueCat environment examples
// ---------------------------------------------------------------------------
for (const name of ['.env.example', '.env.production.example']) {
  let source = read(name);
  if (!source.includes('REVENUECAT_ENABLED=')) {
    source += `\n# RevenueCat server verification. sk_ and webhook values are server-only.\nREVENUECAT_ENABLED=false\nREVENUECAT_SECRET_API_KEY=\nREVENUECAT_WEBHOOK_AUTH_TOKEN=\nREVENUECAT_ENTITLEMENT_ID=create_an_app_called_birkare_pro\nREVENUECAT_OFFERING_ID=birkare_pro\nREVENUECAT_MONTHLY_PRODUCT_IDS=monthly,com.birkareai.pro.monthly\nREVENUECAT_ANNUAL_PRODUCT_IDS=yearly,com.birkareai.pro.yearly\nREVENUECAT_LIFETIME_PRODUCT_IDS=lifetime,com.birkareai.pro.lifetime\nREVENUECAT_MONTHLY_CREDITS=80\nREVENUECAT_ANNUAL_MONTHLY_CREDITS=100\nREVENUECAT_LIFETIME_CREDITS=200\nREVENUECAT_REQUEST_TIMEOUT_MS=8000\nREVENUECAT_CACHE_TTL_MS=30000\n`;
  }
  if (!source.includes('EXPO_PUBLIC_REVENUECAT_OFFERING_ID=')) {
    source += `\n# Mobile values are public SDK identifiers, never RevenueCat sk_ secrets.\nEXPO_PUBLIC_REVENUECAT_OFFERING_ID=birkare_pro\nEXPO_PUBLIC_REVENUECAT_IOS_API_KEY=\nEXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=\n`;
  }
  write(name, source);
}

// Fix the pre-existing enum typo that otherwise blocks API typecheck.
{
  const name = 'apps/api/src/modules/support/support.routes.test.ts';
  if (fs.existsSync(file(name))) {
    let source = read(name);
    source = source.replaceAll("'PASSWORD_RESET'", "'RESET_PASSWORD'");
    write(name, source);
  }
}

console.log('RevenueCat completion patch applied.');
