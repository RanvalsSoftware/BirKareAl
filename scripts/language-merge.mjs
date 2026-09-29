import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Compile human-reviewed, bundled translations. No network, service credentials
// or user content is read. English gaps fail instead of pretending translation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'apps/mobile/src/i18n');
const target = path.join(base, 'locales/copy-en.json');
const dictionary = JSON.parse(fs.readFileSync(target, 'utf8'));
const placeholders = value => [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m => m[1]).sort();
const files = fs.readdirSync(path.join(base, 'reviewed')).filter(f=>/^en-[\w-]+\.json$/.test(f)).sort();
for (const file of files) {
  const entries = JSON.parse(fs.readFileSync(path.join(base,'reviewed',file),'utf8'));
  for (const [key, value] of Object.entries(entries)) {
    assert.equal(typeof value, 'string', `${file}: translation must be a string`);
    assert.ok(value.trim(), `${file}: empty translation: ${key}`);
    assert.deepEqual(placeholders(value), placeholders(key), `${file}: interpolation mismatch: ${key}`);
    dictionary[key] = value;
  }
}
const missing = Object.entries(dictionary).filter(([,value])=>typeof value!=='string'||!value.trim());
for (const [key] of missing) console.error('MISSING_EN '+JSON.stringify(key));
assert.equal(missing.length,0,`${missing.length} English messages are missing`);
const text = JSON.stringify(Object.fromEntries(Object.entries(dictionary).sort(([a],[b])=>a.localeCompare(b,'en'))),null,2)+'\n';
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target,'utf8'),text,'Run node scripts/language-merge.mjs to compile reviewed resources');
else fs.writeFileSync(target,text);
console.log(`ENGLISH_RESOURCES_COMPLETE=${Object.keys(dictionary).length}`);
