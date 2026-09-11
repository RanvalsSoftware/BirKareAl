import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resolve = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(resolve(name), 'utf8');
const write = (name, value) => fs.writeFileSync(resolve(name), value.endsWith('\n') ? value : `${value}\n`);

await import('./apply-revenuecat-completion-v2.mjs');

{
  const name = 'apps/mobile/src/features/billing/revenuecat-client.test.ts';
  let source = read(name);
  source = source.replace("identifier: 'default',", "identifier: 'birkare_pro',");
  source = source.replace(
    "getOfferings: vi.fn(async () => ({ current: offering, all: { default: offering } })),",
    "getOfferings: vi.fn(async () => ({ current: offering, all: { birkare_pro: offering } })),",
  );
  if (!source.includes("offeringId: 'birkare_pro',")) {
    source = source.replace(
      '    entitlementId,\n    unavailableReason,',
      "    entitlementId,\n    offeringId: 'birkare_pro',\n    unavailableReason,",
    );
  }
  write(name, source);
}

{
  const name = 'packages/database/src/memory.repository.ts';
  let source = read(name);
  const methodPattern = new RegExp(
    'async grantCredits\\([\\s\\S]*?\\n  \\}\\n\\n  async reserveCredits',
    'm',
  );
  const method = source.match(methodPattern)?.[0] ?? '';
  const transactionField = method.match(/Array\.from\(this\.(\w+)\.values\(\)\)/)?.[1];
  if (transactionField) {
    const declarationPattern = new RegExp(
      `(?:private|protected)[^\\n]*\\b${transactionField}\\b[^\\n]*`,
    );
    const declaration = source.match(declarationPattern)?.[0] ?? '';
    if (declaration && !declaration.includes('new Map')) {
      source = source.replace(
        `Array.from(this.${transactionField}.values())`,
        `this.${transactionField}`,
      );
      source = source.replace(
        `this.${transactionField}.set(transaction.id, structuredClone(transaction));`,
        `this.${transactionField}.push(structuredClone(transaction));`,
      );
    }
  }
  write(name, source);
}

{
  const name = 'apps/api/src/modules/support/support.routes.test.ts';
  if (fs.existsSync(resolve(name))) {
    write(name, read(name).replaceAll("'PASSWORD_RESET'", "'RESET_PASSWORD'"));
  }
}

console.log('RevenueCat completion v4 patch applied.');
