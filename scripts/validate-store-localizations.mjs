import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listings = [
  ['tr-TR', 'docs/store-metadata.tr.json'],
  ['en-US', 'docs/store-metadata.en-US.json'],
  ['de-DE', 'docs/store-metadata.de-DE.json'],
  ['es-ES', 'docs/store-metadata.es-ES.json'],
  ['ar', 'docs/store-metadata.ar.json'],
];

const limits = {
  'appStore.name': 30,
  'appStore.subtitle': 30,
  'appStore.promotionalText': 170,
  'appStore.keywords': 100,
  'appStore.description': 4000,
  'appStore.whatsNew': 4000,
  'googlePlay.name': 30,
  'googlePlay.shortDescription': 80,
  'googlePlay.fullDescription': 4000,
  'googlePlay.releaseNotes': 500,
};

function valueAt(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

const errors = [];
for (const [expectedLocale, relativePath] of listings) {
  const fullPath = path.join(root, relativePath);
  const listing = JSON.parse(await readFile(fullPath, 'utf8'));
  if (listing.locale !== expectedLocale) {
    errors.push(
      `${relativePath}: locale must be ${expectedLocale}, received ${String(listing.locale)}`,
    );
  }

  for (const [field, maximum] of Object.entries(limits)) {
    const value = valueAt(listing, field);
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`${relativePath}: ${field} is required`);
      continue;
    }
    if ([...value].length > maximum) {
      errors.push(`${relativePath}: ${field} is ${[...value].length}/${maximum} characters`);
    }
    if (/\[[A-Z0-9_ -]+\]/u.test(value)) {
      errors.push(`${relativePath}: ${field} still contains a placeholder`);
    }
  }

  if (
    !listing.appStore.description.includes(
      'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
    )
  ) {
    errors.push(`${relativePath}: appStore.description must contain the standard Apple EULA link`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${listings.length} localized store listings (tr-TR, en-US, de-DE, es-ES, ar).`,
  );
}
