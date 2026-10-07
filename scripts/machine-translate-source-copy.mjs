import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, placeholders } from './language-kit-shared.mjs';

// Translates only developer-owned static UI copy. Never send environment
// files, user content, photos, API payloads or credentials to this endpoint.
const file = path.join(root, 'apps/mobile/src/i18n/locales/copy-en.json');
const dictionary = JSON.parse(await readFile(file, 'utf8'));
const missing = Object.entries(dictionary).filter(([, value]) => !String(value).trim());
const endpoint = 'https://translate.googleapis.com/translate_a/single';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function protect(value) {
  const replacements = [];
  const protectedValue = value.replace(
    /\{\{\s*[^}]+?\s*\}\}|https?:\/\/[^\s)]+|BirKare(?: AI| Studio)?|`[^`]+`/g,
    (match) => {
      const token = `ZXQSAFE${String(replacements.length).padStart(3, '0')}QXZ`;
      replacements.push([token, match]);
      return token;
    },
  );
  return { protectedValue, replacements };
}

function restore(value, replacements) {
  return replacements.reduce(
    (result, [token, original]) => result.replaceAll(token, original),
    value,
  );
}

async function translate(value) {
  const url = new URL(endpoint);
  for (const [key, item] of Object.entries({ client: 'gtx', sl: 'tr', tl: 'en', dt: 't', q: value })) {
    url.searchParams.set(key, item);
  }
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`translation request returned ${response.status}`);
      const payload = await response.json();
      const translated = payload?.[0]?.map((part) => part?.[0] ?? '').join('').trim();
      if (!translated) throw new Error('translation response was empty');
      return translated;
    } catch (error) {
      lastError = error;
      await sleep(attempt * 750);
    }
  }
  throw lastError;
}

console.log(`Translating ${missing.length} new Turkish source entries to English.`);
for (let index = 0; index < missing.length; index += 1) {
  const [key] = missing[index];
  const { protectedValue, replacements } = protect(key);
  const value = restore(await translate(protectedValue), replacements);
  if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(key))) {
    throw new Error(`Placeholder mismatch for ${JSON.stringify(key)}`);
  }
  dictionary[key] = value;
  if ((index + 1) % 10 === 0 || index + 1 === missing.length) {
    await writeFile(file, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');
    console.log(`${index + 1}/${missing.length}`);
  }
  await sleep(80);
}
