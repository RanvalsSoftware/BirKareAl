import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { kitPath, root, sourceCopy, targets } from './language-kit-shared.mjs';

const source = await sourceCopy();
await mkdir(path.join(root, 'docs', 'translations'), { recursive: true });

for (const target of targets) {
  let previous = {};
  try {
    const existing = JSON.parse(await readFile(kitPath(target.locale), 'utf8'));
    previous = Object.fromEntries(
      (existing.entries ?? []).map((entry) => [entry.key, entry.translation ?? '']),
    );
  } catch {
    // The first run intentionally starts with an empty reviewed translation column.
  }

  const kit = {
    schemaVersion: 1,
    locale: target.locale,
    language: target.language,
    label: target.label,
    status: 'needs-human-review',
    instructions: [
      'Translate only the translation value. Do not change key or source.',
      'Preserve every {{placeholder}} exactly, including its spelling and braces.',
      'Keep BirKare, product identifiers, URLs and user-provided content unchanged.',
      'Review short labels in the running app; context can differ from literal translation.',
      'Arabic must also pass RTL device QA before activation.',
    ],
    entries: Object.entries(source).map(([key, value]) => ({
      key,
      source: value,
      translation: previous[key] ?? '',
    })),
  };
  await writeFile(kitPath(target.locale), `${JSON.stringify(kit, null, 2)}\n`, 'utf8');
  console.log(`${target.locale}: prepared ${kit.entries.length} entries`);
}
