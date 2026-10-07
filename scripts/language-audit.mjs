import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Translation review inventory only. Never reads credentials, environment files,
// user data, provider tokens, pictures, or files outside the mobile source roots.
const roots = ['apps/mobile/app', 'apps/mobile/src'];
const candidates = new Map();
const rawJsxText = [];
const turkish =
  /[çğıöşüÇĞİÖŞÜ]|\b(?:Devam|Kaydet|Geri|Vazgeç|Tamam|Profil|Kredi|Krediler|Hesap|Hesab|Sil|Destek|Oturum|Galeri|Abonelik|Yenile|Ayarlar|Filtre|Filtreler|Sahne|Proje|Projeler|Paylaş|Bilgi|Tarih|veya|için|ile|bir|olarak)\b/u;
const props = new Set([
  'title',
  'subtitle',
  'label',
  'description',
  'detail',
  'text',
  'body',
  'heading',
  'placeholder',
  'hint',
  'message',
  'caption',
  'accessibilityLabel',
  'accessibilityHint',
  'loadingLabel',
  'emptyTitle',
  'emptyDescription',
]);
const walk = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(directory, e.name)) : [path.join(directory, e.name)],
    );
// Canonical Turkish legal text is published in the app as supplied; these
// authoritative documents are deliberately not machine-translated through UI copy dictionaries.
for (const filename of roots
  .flatMap(walk)
  .filter(
    (p) => {
      const normalized = p.replaceAll('\\', '/');
      return (
        /\.tsx?$/.test(normalized) &&
        !/\.(?:test|spec)\.|\/i18n\//.test(normalized) &&
        !normalized.endsWith('/features/legal/privacy-notice.ts')
      );
    },
  )) {
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function visit(node) {
    let text;
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      text = node.text.replace(/\s+/g, ' ').trim();
    else if (ts.isTemplateExpression(node))
      text =
        node.head.text +
        node.templateSpans.map((span, i) => `{{p${i}}}` + span.literal.text).join('');
    if (text && text.length > 1 && text.length < 5000) {
      if (ts.isJsxText(node) && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(text)) {
        rawJsxText.push({ text, filename });
      }
      const parent = node.parent;
      const prop =
        ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent)
          ? parent.name.getText(source).replace(/['"]/g, '')
          : '';
      const display = ts.isJsxText(node) || props.has(prop);
      const translationCall =
        ts.isCallExpression(parent) &&
        parent.arguments[0] === node &&
        /^(?:copy|tr|translateCopy|t)$/.test(parent.expression.getText(source));
      if (
        (translationCall || turkish.test(text) || (display && /[A-Za-z]/.test(text))) &&
        !text.startsWith('/') &&
        !/^#[0-9A-Fa-f]{3,8}$/.test(text) &&
        !text.includes('.apps.googleusercontent.com') &&
        !/^https?:/.test(text)
      ) {
        const item = candidates.get(text) ?? { text, files: new Set() };
        item.files.add(filename.replaceAll('\\', '/'));
        candidates.set(text, item);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const messages = [...candidates.values()].map((x) => ({ text: x.text, files: [...x.files] }));
if (process.argv.includes('--check')) {
  const directory = 'apps/mobile/src/i18n/locales';
  const load = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
  const english = {
    ...load('copy-en.json'),
    ...load('supplemental-en.json'),
    ...load('ui-en.json'),
  };
  const localized = {
    de: load('copy-de.json'),
    es: load('copy-es.json'),
    ar: load('copy-ar.json'),
  };
  const inventory = JSON.parse(fs.readFileSync('apps/mobile/src/i18n/copy-inventory.json', 'utf8'));
  const inventoryKeys = new Set(inventory.map((item) => item.text));
  const placeholders = (value) =>
    [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)]
      .map((match) => match[1])
      .sort()
      .join('|');
  const errors = [];
  for (const { text, files } of messages) {
    if (!inventoryKeys.has(text))
      errors.push(`stale inventory: ${JSON.stringify(text)} (${files.join(', ')})`);
    if (typeof english[text] !== 'string' || !english[text].trim())
      errors.push(`missing en: ${JSON.stringify(text)}`);
    for (const [language, dictionary] of Object.entries(localized)) {
      if (typeof dictionary[text] !== 'string' || !dictionary[text].trim())
        errors.push(`missing ${language}: ${JSON.stringify(text)}`);
      else if (placeholders(dictionary[text]) !== placeholders(text))
        errors.push(`placeholder mismatch ${language}: ${JSON.stringify(text)}`);
    }
  }
  const brandOnly = new Set(['BirKare', 'BirKare AI', 'BirKare Studio', 'AI', 'PRO', 'ΛI']);
  for (const item of rawJsxText) {
    if (!brandOnly.has(item.text))
      errors.push(`raw JSX copy: ${JSON.stringify(item.text)} (${item.filename})`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Validated ${messages.length} source copy entries in en, de, es and ar across ${new Set(messages.flatMap((item) => item.files)).size} UI modules.`,
    );
  }
} else if (process.argv.includes('--sync')) {
  const inventoryPath = 'apps/mobile/src/i18n/copy-inventory.json';
  const englishPath = 'apps/mobile/src/i18n/locales/copy-en.json';
  const inventory = messages
    .map(({ text, files }) => ({ text, files: files.sort() }))
    .sort((a, b) => a.text.localeCompare(b.text));
  const english = JSON.parse(fs.readFileSync(englishPath, 'utf8'));
  for (const { text } of inventory) english[text] ??= '';
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(
    englishPath,
    `${JSON.stringify(Object.fromEntries(Object.entries(english).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`,
  );
  console.log(`Synchronized ${inventory.length} static copy entries.`);
} else {
  console.log('I18N_STATIC_COPY_COUNT=' + messages.length);
  for (const item of messages) console.log(JSON.stringify(item));
}
