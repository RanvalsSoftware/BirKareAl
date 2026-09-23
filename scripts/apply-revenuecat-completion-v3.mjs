import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const p = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(p(name), 'utf8');
const write = (name, value) =>
  fs.writeFileSync(p(name), value.endsWith('\n') ? value : `${value}\n`);

await import('./apply-revenuecat-completion-v2.mjs');

// The lifecycle fixture must use the same exact offering ID that production
// selection now requires.
{
  const name = 'apps/mobile/src/features/billing/revenuecat-client.test.ts';
  let source = read(name);
  source = source.replace(`identifier: 'default',`, `identifier: 'birkare_pro',`);
  source = source.replace(
    `getOfferings: vi.fn(async () => ({ current: offering, all: { default: offering } })),`,
    `getOfferings: vi.fn(async () => ({ current: offering, all: { birkare_pro: offering } })),`,
  );
  if (!source.includes(`offeringId: 'birkare_pro',`)) {
    source = source.replace(
      `    entitlementId,\n    unavailableReason,`,
      `    entitlementId,\n    offeringId: 'birkare_pro',\n    unavailableReason,`,
    );
  }
  write(name, source);
}

// Adapt the generated memory method if this repository stores transactions in
// an array rather than a Map. The patch remains idempotent for either layout.
{
  const name = 'packages/database/src/memory.repository.ts';
  let source = read(name);
  const method = source.match(/async grantCredits\([\s\S]*?\n  }\n\n  async reserveCredits/m)?.[0];
  if (method) {
    const transactionField = method.match(/Array\.from\(this\.(\w+)\.values\(\)\)/)?.[1];
    if (transactionField) {
      const declaration =
        source.match(
          new RegExp(`(?:private|protected)[^\\n]*\\b${transactionField}\\b[^\\n]*`),
        )?.[0] ?? '';
      if (!declaration.includes('new Map')) {
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
  }
  write(name, source);
}

// Keep API tests compiling with the canonical email token enum used by the
// implementation. This is an unrelated pre-existing typo surfaced by CI.
{
  const name = 'apps/api/src/modules/support/support.routes.test.ts';
  if (fs.existsSync(p(name))) {
    write(name, read(name).replaceAll("'PASSWORD_RESET'", "'RESET_PASSWORD'"));
  }
}

console.log('RevenueCat completion v3 patch applied.');
