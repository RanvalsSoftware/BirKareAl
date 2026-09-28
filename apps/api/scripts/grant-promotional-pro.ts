import { getConfig } from '@birkare/config';
import { createRepository } from '@birkare/database';
import { createLogger } from '@birkare/logger';

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';

function emailsFromArgs(): string[] {
  const values = process.argv.slice(2).map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!values.length) {
    throw new Error(
      'En az bir e-posta verin: pnpm --filter @birkare/api admin:grant-pro -- user@example.com',
    );
  }
  return [...new Set(values)];
}

async function grantRevenueCatLifetime(input: {
  apiKey: string;
  userId: string;
  entitlementId: string;
}): Promise<void> {
  const response = await fetch(
    `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(input.userId)}/entitlements/${encodeURIComponent(input.entitlementId)}/promotional`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration: 'lifetime' }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const safeBody = await response.text().catch(() => '');
    throw new Error(
      `RevenueCat promotional entitlement başarısız: HTTP ${response.status}${safeBody ? ' · ' + safeBody.slice(0, 300) : ''}`,
    );
  }
}

async function main(): Promise<void> {
  const config = getConfig();
  if (!config.REVENUECAT_ENABLED) throw new Error('REVENUECAT_ENABLED=true olmalıdır.');
  const apiKey = config.REVENUECAT_SECRET_API_KEY?.trim();
  if (!apiKey?.startsWith('sk_')) {
    throw new Error('REVENUECAT_SECRET_API_KEY server-side Secret API key (sk_...) olmalıdır.');
  }

  const logger = createLogger({ ...config, APP_NAME: `${config.APP_NAME} Admin` });
  const repository = await createRepository(config, logger);
  try {
    for (const email of emailsFromArgs()) {
      const user = await repository.getUserByEmail(email);
      if (!user || user.deletedAt || user.status !== 'ACTIVE') {
        throw new Error(`Aktif kullanıcı bulunamadı: ${email}`);
      }

      await grantRevenueCatLifetime({
        apiKey,
        userId: user.id,
        entitlementId: config.REVENUECAT_ENTITLEMENT_ID,
      });

      await repository.grantCredits({
        userId: user.id,
        amount: config.REVENUECAT_MONTHLY_CREDITS,
        type: 'ADMIN_ADJUSTMENT',
        referenceType: 'PROMOTIONAL_PRO',
        referenceId: config.REVENUECAT_ENTITLEMENT_ID,
        idempotencyKey: `admin:promotional-pro:${user.id}:v1`,
        description: 'BirKare Pro promosyon erişimi başlangıç kredisi',
      });

      logger.info(
        { userId: user.id, email },
        'Promotional BirKare Pro erişimi ve başlangıç kredisi verildi.',
      );
    }
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
  console.error(message.replace(/Bearer\s+[^\s]+/gi, 'Bearer <redacted>'));
  process.exit(1);
});
