import { readFile } from 'node:fs/promises';
import { kitPath, placeholders, sourceCopy, targets } from './language-kit-shared.mjs';

const source = await sourceCopy();
const sourceKeys = Object.keys(source).sort();
const errors = [];

for (const target of targets) {
  const file = kitPath(target.locale);
  const kit = JSON.parse(await readFile(file, 'utf8'));
  const entries = Array.isArray(kit.entries) ? kit.entries : [];
  const keys = entries.map((entry) => entry.key).sort();
  if (JSON.stringify(keys) !== JSON.stringify(sourceKeys)) {
    errors.push(`${target.locale}: keys no longer match the current English source catalogue`);
  }
  for (const entry of entries) {
    if (typeof entry.translation !== 'string' || entry.translation.trim() === '') {
      errors.push(`${target.locale}: missing translation for ${JSON.stringify(entry.key)}`);
      continue;
    }
    if (
      JSON.stringify(placeholders(entry.translation)) !== JSON.stringify(placeholders(entry.key))
    ) {
      errors.push(`${target.locale}: placeholder mismatch for ${JSON.stringify(entry.key)}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.slice(0, 80).join('\n'));
  if (errors.length > 80) console.error(`...and ${errors.length - 80} more errors`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${targets.length} complete application translation kits.`);
}
