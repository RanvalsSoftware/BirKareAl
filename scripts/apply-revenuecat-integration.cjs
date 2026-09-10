// Temporary, idempotent feature-branch integration helper. Refuse unknown source
// layouts rather than overwriting unrelated work. Never reads or writes .env.
const fs = require('node:fs');
function edit(file, marker, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  if (!source.includes(before)) throw new Error(`Expected integration anchor missing: ${file}`);
  fs.writeFileSync(file, source.replace(before, after));
}
const packageFile = 'apps/mobile/package.json';
const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
pkg.dependencies['react-native-purchases'] = '10.9.1';
pkg.dependencies['react-native-purchases-ui'] = '10.9.1';
pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
edit('apps/mobile/app.config.ts', "import { resolveRevenueCatConfig }", "import { resolvePublicMobileConfig } from './config/public-env.cjs';", "import { resolvePublicMobileConfig } from './config/public-env.cjs';\nimport { resolveRevenueCatConfig } from './config/revenuecat.cjs';");
edit('apps/mobile/app.config.ts', "'./plugins/with-revenuecat'", "  './plugins/with-android-release-signing',", "  './plugins/with-android-release-signing',\n  './plugins/with-revenuecat',");
edit('apps/mobile/app.config.ts', 'com.android.vending.BILLING', "    package: 'com.birkareai.mobile',", "    package: 'com.birkareai.mobile',\n    permissions: ['com.android.vending.BILLING'],");
edit('apps/mobile/app.config.ts', 'revenueCat: resolveRevenueCatConfig', '    ...publicConfig,', '    ...publicConfig,\n    revenueCat: resolveRevenueCatConfig(process.env),');
edit('apps/mobile/app/_layout.tsx', "import { RevenueCatBootstrap }", "import { useReducedMotion } from '@/hooks/useReducedMotion';", "import { useReducedMotion } from '@/hooks/useReducedMotion';\nimport { RevenueCatBootstrap } from '@/features/billing/revenuecat';");
edit('apps/mobile/app/_layout.tsx', '<RevenueCatBootstrap />', '<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>', '<QueryClientProvider client={queryClient}>\n          <RevenueCatBootstrap />\n          {children}\n        </QueryClientProvider>');
const creditsFile = 'apps/mobile/app/(tabs)/credits.tsx';
let credits = fs.readFileSync(creditsFile, 'utf8');
if (!credits.includes('<SubscriptionCard />')) {
  const start = credits.indexOf('        <View style={styles.proCard}>');
  const end = credits.indexOf('        <SectionHeader title="Kredi paketleri" />');
  if (start < 0 || end <= start) throw new Error('Unknown Pro card layout; refusing to replace.');
  credits = credits.slice(0, start) + '        <SubscriptionCard />\n\n' + credits.slice(end);
  credits = credits.replace('  ProBadge,\n', '');
  credits = credits.replace("import { useAvailableCredits } from '@/features/billing/use-wallet';", "import { useAvailableCredits } from '@/features/billing/use-wallet';\nimport { SubscriptionCard } from '@/features/billing/SubscriptionCard';");
  credits = credits.replace('        <Text style={styles.restore}>Satın alımları geri yükle</Text>\n', '');
  const stylesStart = credits.indexOf('  proCard: {');
  const stylesEnd = credits.indexOf('  packList: {');
  if (stylesStart >= 0 && stylesEnd > stylesStart) credits = credits.slice(0, stylesStart) + credits.slice(stylesEnd);
  credits = credits.replace(/  restore: \{[\s\S]*?\n  \},\n/, '');
  fs.writeFileSync(creditsFile, credits);
}
