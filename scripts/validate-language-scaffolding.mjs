import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { kitPath, root, sourceCopy, targets } from './language-kit-shared.mjs';

const source = await sourceCopy();
const expectedKeys = Object.keys(source).sort();
const requiredIosKeys = [
  'NSCameraUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'NSPhotoLibraryAddUsageDescription',
];
const commonNamedKeys = [
  'language.title',
  'language.subtitle',
  'language.system',
  'language.systemHint',
  'language.saved',
  'language.saveFailed',
  'language.retry',
  'language.back',
  'errors.generic',
  'errors.network',
];
const errors = [];

for (const target of targets) {
  const native = JSON.parse(
    await readFile(path.join(root, 'apps', 'mobile', 'locales', `${target.language}.json`), 'utf8'),
  );
  for (const key of requiredIosKeys) {
    if (typeof native.ios?.[key] !== 'string' || native.ios[key].trim() === '') {
      errors.push(`${target.locale}: missing native iOS value ${key}`);
    }
  }
  if (native.android?.app_name !== 'BirKare AI') {
    errors.push(`${target.locale}: Android app_name must remain BirKare AI`);
  }

  const named = JSON.parse(
    await readFile(
      path.join(root, 'apps', 'mobile', 'src', 'i18n', 'locales', `${target.language}.json`),
      'utf8',
    ),
  );
  const pluralKeys =
    target.language === 'ar' ? ['zero', 'one', 'two', 'few', 'many', 'other'] : ['one', 'other'];
  for (const key of [
    ...commonNamedKeys,
    ...pluralKeys.flatMap((suffix) => [`credits_${suffix}`, `images_${suffix}`]),
  ]) {
    if (typeof named[key] !== 'string' || named[key].trim() === '') {
      errors.push(`${target.locale}: missing named message ${key}`);
    }
  }

  const kit = JSON.parse(await readFile(kitPath(target.locale), 'utf8'));
  const kitKeys = (kit.entries ?? []).map((entry) => entry.key).sort();
  if (JSON.stringify(kitKeys) !== JSON.stringify(expectedKeys)) {
    errors.push(`${target.locale}: reviewer kit is stale; run pnpm prepare:language-kits`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated candidate scaffolding for ${targets.length} languages and ${expectedKeys.length} copy entries each.`,
  );
}
