import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const p = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(p(name), 'utf8');
const write = (name, value) => {
  fs.mkdirSync(path.dirname(p(name)), { recursive: true });
  fs.writeFileSync(p(name), value.endsWith('\n') ? value : `${value}\n`);
};

// Pre-patch points that vary slightly across Expo/router revisions so the main
// deterministic patcher can remain strict about every other safety-critical edit.
{
  const name = 'apps/mobile/app/_layout.tsx';
  let source = read(name);
  if (!source.includes('name="pro"')) {
    const legal = /([ \t]*<Stack\.Screen\s*\n\s*name="legal"[\s\S]*?\n\s*\/>)/m;
    const match = source.match(legal);
    if (!match) throw new Error('Could not locate legal Stack.Screen for /pro insertion');
    source = source.replace(
      legal,
      `${match[1]}\n          <Stack.Screen\n            name="pro"\n            options={{\n              presentation: 'fullScreenModal',\n              animation: reducedMotion ? 'none' : 'slide_from_bottom',\n            }}\n          />`,
    );
    write(name, source);
  }
}

{
  const name = 'packages/database/src/memory.repository.ts';
  let source = read(name);
  if (!source.includes('GrantCreditsInput')) {
    const importPattern = /import type \{([\s\S]*?)\} from '\.\/types\.js';/m;
    if (!importPattern.test(source)) throw new Error('Memory repository type import was not found');
    source = source.replace(
      importPattern,
      (all, imports) => `import type {${imports}  GrantCreditsInput,\n  GrantCreditsResult,\n} from './types.js';`,
    );
    write(name, source);
  }
}

await import('./apply-revenuecat-completion.mjs');

// The public webhook must be declared before JWT middleware. Store prices stay
// on the native SDK and are never fabricated by this endpoint.
write(
  'apps/api/src/modules/billing/billing.routes.ts',
  `import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';
import { createRevenueCatService, type RevenueCatWebhookEvent } from './revenuecat.service.js';

export function createBillingRouter(deps: ApiDependencies): Router {
  const router = Router();
  const revenueCat = createRevenueCatService({ config: deps.config, repository: deps.repository });

  router.post(
    '/revenuecat/webhook',
    asyncHandler(async (req, res) => {
      const result = await revenueCat.processWebhook(
        req.header('authorization'),
        req.body as RevenueCatWebhookEvent,
      );
      sendSuccess(res, req.requestId, result);
    }),
  );

  router.use(requireAuth(deps.tokenService, deps.repository));

  router.get('/wallet', asyncHandler(async (req, res) => {
    sendSuccess(res, req.requestId, await deps.repository.getWallet(req.auth!.userId));
  }));

  router.get('/transactions', asyncHandler(async (req, res) => {
    sendSuccess(res, req.requestId, {
      items: await deps.repository.listCreditTransactions(req.auth!.userId),
    });
  }));

  router.get('/subscription', asyncHandler(async (req, res) => {
    sendSuccess(res, req.requestId, await revenueCat.readStatus(req.auth!.userId));
  }));

  router.post('/sync', asyncHandler(async (req, res) => {
    revenueCat.clearUserCache(req.auth!.userId);
    const subscription = await revenueCat.readStatus(req.auth!.userId, true);
    const wallet = await deps.repository.getWallet(req.auth!.userId);
    sendSuccess(res, req.requestId, { subscription, wallet });
  }));

  router.get('/products', asyncHandler(async (req, res) => {
    sendSuccess(res, req.requestId, {
      entitlementId: deps.config.REVENUECAT_ENTITLEMENT_ID,
      offeringId: deps.config.REVENUECAT_OFFERING_ID,
      pricingSource: 'revenuecat_mobile_sdk',
      items: [
        {
          id: 'pro.monthly',
          packageIdentifier: '$rc_monthly',
          creditsPerPeriod: deps.config.REVENUECAT_MONTHLY_CREDITS,
          testStoreProductId: 'monthly',
          platformProductIds: { ios: 'com.birkareai.pro.monthly' },
        },
        {
          id: 'pro.annual',
          packageIdentifier: '$rc_annual',
          creditsPerMonth: deps.config.REVENUECAT_ANNUAL_MONTHLY_CREDITS,
          testStoreProductId: 'yearly',
          platformProductIds: { ios: 'com.birkareai.pro.yearly' },
        },
        {
          id: 'pro.lifetime',
          packageIdentifier: '$rc_lifetime',
          oneTimeCredits: deps.config.REVENUECAT_LIFETIME_CREDITS,
          testStoreProductId: 'lifetime',
          platformProductIds: { ios: 'com.birkareai.pro.lifetime' },
        },
      ],
    });
  }));

  return router;
}
`,
);

// Enforce premium catalog choices immediately before the authoritative credit
// reservation and queue operation, regardless of what the client UI reports.
{
  const name = 'apps/api/src/modules/generations/generations.routes.ts';
  let source = read(name);
  if (!source.includes("from '../billing/pro-access.js'")) {
    const marker = `import type { ApiDependencies } from '../../services/dependencies.js';`;
    if (!source.includes(marker)) throw new Error('ApiDependencies import not found in generations route');
    source = source.replace(
      marker,
      `${marker}\nimport { assertProGenerationAccess } from '../billing/pro-access.js';`,
    );
  }
  if (!source.includes('await assertProGenerationAccess({')) {
    const marker = `  const pricedSelection = input.recipe.selection ?? input.project;`;
    if (!source.includes(marker)) throw new Error('Generation pricing selection point not found');
    source = source.replace(
      marker,
      `${marker}\n  await assertProGenerationAccess({\n    config: deps.config,\n    repository: deps.repository,\n    userId: input.userId,\n    project: input.project,\n    selection: pricedSelection,\n  });`,
    );
  }
  write(name, source);
}

// Document the operator-only values and exact dashboard mapping.
{
  const name = 'docs/REVENUECAT_INTEGRATION.md';
  let source = read(name);
  if (!source.includes('## 8. BirKare custom paywall ve sunucu doğrulaması')) {
    source += `\n## 8. BirKare custom paywall ve sunucu doğrulaması\n\nUygulama RevenueCat Dashboard Paywall kullanmak zorunda değildir. \`/pro\` route'u BirKare'nin siyah-altın React Native ekranını gösterir; paketler \`birkare_pro\` offering içinden alınır ve fiyatlar yalnız \`product.priceString\` üzerinden görüntülenir.\n\nDashboard eşleşmesi:\n\n- \`$rc_monthly\`: \`monthly\` + \`com.birkareai.pro.monthly\`\n- \`$rc_annual\`: \`yearly\` + \`com.birkareai.pro.yearly\`\n- \`$rc_lifetime\`: \`lifetime\` + \`com.birkareai.pro.lifetime\`\n- entitlement: \`create_an_app_called_birkare_pro\`\n\nSunucu ortamı:\n\n\`\`\`env\nREVENUECAT_ENABLED=true\nREVENUECAT_SECRET_API_KEY=sk_server_only\nREVENUECAT_WEBHOOK_AUTH_TOKEN=long-random-token\n\`\`\`\n\nRevenueCat webhook URL'si \`POST https://<api-host>/v1/billing/revenuecat/webhook\` olarak ayarlanır ve Dashboard Authorization alanına aynı webhook tokenı girilir. Mobil uygulama hiçbir zaman kredi eklemez. Webhook ve \`POST /v1/billing/sync\`, RevenueCat REST API'sini doğruladıktan sonra user + period bazlı idempotent kayıt oluşturur. Aylık plan dönem başına 80, yıllık plan aktif olduğu her ay 100, Lifetime ise yalnız ilk geçerli satın almada 200 kredi verir. Lifetime sınırsız AI üretimi değildir.\n\nKorunan Pro sahne, stil, karakter ve profesyonel portre üretimleri kuyruklanmadan önce sunucuda entitlement doğrulamasından geçer. RevenueCat erişilemiyorsa kontrol fail-closed davranır.\n`;
    write(name, source);
  }
}

console.log('RevenueCat completion v2 patch applied.');
