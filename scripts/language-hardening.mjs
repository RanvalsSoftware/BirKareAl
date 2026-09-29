import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Deterministic one-time edits, limited to this feature branch by the workflow.
// Read application source only: never environment files, credentials or tokens.
const changed = [];
function edit(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) { fs.writeFileSync(file, after); changed.push(file); }
}
function exact(s, from, to) {
  if (s.includes(to)) return s;
  if (!s.includes(from)) throw new Error(`Required source anchor missing: ${from.slice(0, 70)}`);
  return s.replace(from, to);
}

edit('apps/mobile/src/i18n/engine.ts', s => {
  s = exact(s, "import englishCopy from './locales/copy-en.json';", "import englishCopy from './locales/copy-en.json';\nimport supplementalCopy from './locales/supplemental-en.json';\nconst completeEnglishCopy = { ...englishCopy, ...supplementalCopy };");
  s = s.replace('Object.keys(englishCopy)', 'Object.keys(completeEnglishCopy)').replace('copy: englishCopy', 'copy: completeEnglishCopy');
  return s;
});

edit('apps/mobile/src/api/client.ts', s => {
  if (!s.includes("import { localizedApiErrorMessage }")) s = "import { localizedApiErrorMessage } from '@/i18n/errors';\n" + s;
  s = exact(s, 'new Error(NETWORK_REQUEST_FAILED_MESSAGE)', 'new Error(translateCopy(NETWORK_REQUEST_FAILED_MESSAGE))');
  s = exact(s, "          accept: 'application/json',", "          accept: 'application/json',\n          'accept-language': getLocale(),");
  s = exact(s, "headers: { 'content-type': 'application/json' },", "headers: { 'content-type': 'application/json', 'accept-language': getLocale() },");
  s = exact(s, '    error.code = apiError?.code;', '    error.message = localizedApiErrorMessage(apiError?.code, error.message);\n    error.code = apiError?.code;');
  return s;
});

edit('apps/api/src/services/http.ts', s => {
  if (!s.includes("import { preferredRequestLanguage }")) s = "import { preferredRequestLanguage } from './request-language.js';\n" + s;
  s = exact(s, '): { ip?: string; userAgent?: string } => ({', "): { ip?: string; userAgent?: string; preferredLocale?: 'tr' | 'en' } => ({");
  return exact(s, "  userAgent: req.header('user-agent'),", "  userAgent: req.header('user-agent'),\n  preferredLocale: preferredRequestLanguage(req.header('accept-language')),");
});

edit('apps/api/src/modules/auth/auth.service.ts', s => {
  s = exact(s, 'export type AuthRequestContext = {', "export type AuthRequestContext = {\n  preferredLocale?: 'tr' | 'en';");
  s = s.replaceAll("this.sendAuthEmail('verification', user.email, verificationCode);", "this.sendAuthEmail('verification', user.email, verificationCode, context.preferredLocale ?? user.locale);");
  s = s.replaceAll("this.sendAuthEmail('password-reset', user.email, resetToken);", "this.sendAuthEmail('password-reset', user.email, resetToken, context.preferredLocale ?? user.locale);");
  s = exact(s, "private async sendAuthEmail(kind: 'verification' | 'password-reset', email: string, token: string): Promise<void>", "private async sendAuthEmail(kind: 'verification' | 'password-reset', email: string, token: string, locale?: string): Promise<void>");
  s = exact(s, 'authMail({ kind, email, token, scheme:', 'authMail({ kind, email, token, locale, scheme:');
  s = exact(s, 'this.mailService.send(accountDeletionMail({\n        email: user.email,', 'this.mailService.send(accountDeletionMail({\n        email: user.email,\n        locale: context.preferredLocale ?? user.locale,');
  return s;
});

edit('apps/api/src/services/mail.service.ts', s => {
  if (!s.includes("import { localizeAuthMail")) s = "import { localizeAuthMail, localizeDeletionMail } from './mail-localization.js';\n" + s;
  s = exact(s, '  scheme?: string;\n}): MailMessage {', '  scheme?: string;\n  locale?: string;\n}): MailMessage {');
  s = exact(s, '  webUrl: string;\n}): MailMessage {', '  webUrl: string;\n  locale?: string;\n}): MailMessage {');
  s = exact(s, '  return { to: input.email, subject: `BirKare AI — ${title}`, text };', '  return localizeAuthMail({ to: input.email, subject: `BirKare AI — ${title}`, text }, { ...input, link: link.toString() });');
  s = exact(s, "  return {\n    to: input.email,\n    subject: 'BirKare AI — Hesap silme bağlantın',\n    text,\n  };", "  return localizeDeletionMail({\n    to: input.email,\n    subject: 'BirKare AI — Hesap silme bağlantın',\n    text,\n  }, { locale: input.locale, link: link.toString() });");
  return s;
});

// Zod error callbacks execute at parse time. Imported schemas must not cache TR.
const methods = new Set(['email','min','max','int','regex','refine']);
for (const file of ['apps/mobile/src/features/auth/validation.ts','apps/mobile/src/features/settings/account-profile.ts']) {
  edit(file, s => {
    const source = ts.createSourceFile(file, s, ts.ScriptTarget.Latest, true);
    const patches = [];
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && methods.has(node.expression.name.text)) {
        const name = node.expression.name.text;
        const i = ['email','int'].includes(name) ? 0 : 1;
        const argument = node.arguments[i];
        if (argument && ts.isStringLiteral(argument) && /[çğıöşüÇĞİÖŞÜ]|\s/.test(argument.text)) {
          patches.push({ start: argument.getStart(source), end: argument.end, text: `{ error: () => translateCopy(${JSON.stringify(argument.text)}) }` });
        }
      }
      if (ts.isPropertyAssignment(node) && ['message','error'].includes(node.name.getText(source))) {
        const value = node.initializer;
        if ((ts.isStringLiteral(value) && /[çğıöşüÇĞİÖŞÜ]/.test(value.text)) || (ts.isCallExpression(value) && value.expression.getText(source) === 'translateCopy')) {
          const call = ts.isStringLiteral(value) ? `translateCopy(${JSON.stringify(value.text)})` : value.getText(source);
          patches.push({ start: node.getStart(source), end: node.end, text: `error: () => ${call}` });
          return;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const p of patches.sort((a,b) => b.start-a.start)) s = s.slice(0,p.start)+p.text+s.slice(p.end);
    return s;
  });
}

edit('apps/mobile/app.config.ts', s => exact(s, '      ITSAppUsesNonExemptEncryption: false,', '      ITSAppUsesNonExemptEncryption: false,\n      CFBundleAllowMixedLocalizations: true,'));

// Keep old deep links, but never send a real production ID to /demo/results.
edit('apps/mobile/app/generations/[id].tsx', () => `import { Redirect, useLocalSearchParams } from 'expo-router';\nimport { Text } from 'react-native';\nimport { Screen } from '@/components';\nimport { tr } from '@/i18n/engine';\nimport { useLanguageRevision } from '@/i18n/use-language';\n\nexport default function GenerationDetailScreen() {\n  useLanguageRevision();\n  const { id } = useLocalSearchParams<{ id?: string | string[] }>();\n  const generationId = typeof id === 'string' ? id : undefined;\n  if (!generationId) return <Screen><Text>{tr('Üretim bulunamadı.')}</Text></Screen>;\n  return <Redirect href={{ pathname: '/generations/[id]/results', params: { id: generationId } } as never} />;\n}\n`);

// Preserve compiled resources: supplemental words are reviewed, never machine-filled.
const base = JSON.parse(fs.readFileSync('apps/mobile/src/i18n/locales/copy-en.json','utf8'));
const extra = JSON.parse(fs.readFileSync('apps/mobile/src/i18n/locales/supplemental-en.json','utf8'));
for (const [key, value] of Object.entries(extra)) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('An English translation is missing');
}
console.log(`Language hardening updated ${changed.length} files. Reviewed copy entries: ${Object.keys({...base,...extra}).length}.`);
for (const file of changed) console.log(file);
