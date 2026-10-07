import { readFile, writeFile } from 'node:fs/promises';
import { kitPath, placeholders, targets } from './language-kit-shared.mjs';

const endpoint = 'https://translate.googleapis.com/translate_a/single';
const separator = (index) => `<<<BKSEP_${String(index).padStart(4, '0')}>>>`;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function protect(value) {
  const replacements = [];
  const protectedValue = value.replace(
    /\{\{\s*[^}]+?\s*\}\}|https?:\/\/[^\s)]+|BirKare(?: AI| Studio)?/g,
    (match) => {
      const token = `<<<BKSAFE_${String(replacements.length).padStart(3, '0')}>>>`;
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

async function translate(text, language) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries({ client: 'gtx', sl: 'en', tl: language, dt: 't', q: text })) {
    url.searchParams.set(key, value);
  }
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`translation request returned ${response.status}`);
      const payload = await response.json();
      const translated = payload?.[0]?.map((part) => part?.[0] ?? '').join('');
      if (!translated) throw new Error('translation response was empty');
      return translated;
    } catch (error) {
      lastError = error;
      await sleep(1_000 * attempt);
    }
  }
  throw lastError;
}

function batches(entries) {
  const result = [];
  let current = [];
  let size = 0;
  for (const entry of entries) {
    const nextSize = entry.source.length + 32;
    if (current.length && (current.length >= 24 || size + nextSize > 3000)) {
      result.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += nextSize;
  }
  if (current.length) result.push(current);
  return result;
}

for (const target of targets) {
  const file = kitPath(target.locale);
  const kit = JSON.parse(await readFile(file, 'utf8'));
  const missing = kit.entries.filter(
    (entry) => typeof entry.translation !== 'string' || entry.translation.trim() === '',
  );
  const work = batches(missing);
  console.log(`${target.locale}: translating ${missing.length} entries in ${work.length} batches`);

  for (let batchIndex = 0; batchIndex < work.length; batchIndex += 1) {
    const batch = work[batchIndex];
    const protectedEntries = batch.map((entry) => ({ entry, ...protect(entry.source) }));
    const input = protectedEntries
      .map((item, index) => `${item.protectedValue}${index < batch.length - 1 ? `\n${separator(index)}\n` : ''}`)
      .join('');
    const translated = await translate(input, target.language);
    const pattern = new RegExp(`\\s*${separator(0).replace('0000', '(\\d{4})')}\\s*`, 'g');
    const pieces = translated.split(pattern).filter((_, index) => index % 2 === 0);
    if (pieces.length !== batch.length) {
      throw new Error(`${target.locale}: separator mismatch in batch ${batchIndex + 1}`);
    }
    for (let index = 0; index < batch.length; index += 1) {
      const item = protectedEntries[index];
      const value = restore(pieces[index].trim(), item.replacements);
      if (!value || JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(item.entry.key))) {
        throw new Error(`${target.locale}: invalid placeholders for ${JSON.stringify(item.entry.key)}`);
      }
      item.entry.translation = value;
    }
    kit.status = 'machine-translated-needs-native-review';
    kit.translationProvider = 'Google Translate';
    await writeFile(file, `${JSON.stringify(kit, null, 2)}\n`, 'utf8');
    if ((batchIndex + 1) % 10 === 0 || batchIndex + 1 === work.length) {
      console.log(`${target.locale}: ${batchIndex + 1}/${work.length} batches complete`);
    }
    await sleep(150);
  }
}
