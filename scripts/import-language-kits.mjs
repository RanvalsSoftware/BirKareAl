import { readFile, writeFile } from 'node:fs/promises';
import { kitPath, outputPath, targets } from './language-kit-shared.mjs';

await import('./validate-language-kits.mjs');
await new Promise((resolve) => setImmediate(resolve));
if (process.exitCode)
  throw new Error('Language kits are incomplete; no runtime catalogue was written.');

for (const target of targets) {
  const kit = JSON.parse(await readFile(kitPath(target.locale), 'utf8'));
  const dictionary = Object.fromEntries(
    kit.entries.map((entry) => [entry.key, entry.translation.trim()]),
  );
  await writeFile(outputPath(target.language), `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');
  console.log(`${target.locale}: imported ${kit.entries.length} validated translations`);
}
