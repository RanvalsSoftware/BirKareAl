import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const targets = [
  { locale: 'de-DE', language: 'de', label: 'Deutsch' },
  { locale: 'es-ES', language: 'es', label: 'Español (España)' },
  { locale: 'ar', language: 'ar', label: 'العربية' },
];

export const kitPath = (locale) => path.join(root, 'docs', 'translations', `${locale}.copy.json`);
export const outputPath = (language) =>
  path.join(root, 'apps', 'mobile', 'src', 'i18n', 'locales', `copy-${language}.json`);

export function placeholders(value) {
  return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1]).sort();
}

export async function sourceCopy() {
  const directory = path.join(root, 'apps', 'mobile', 'src', 'i18n', 'locales');
  const files = ['copy-en.json', 'supplemental-en.json', 'ui-en.json'];
  const dictionaries = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))),
  );
  return Object.assign({}, ...dictionaries);
}
