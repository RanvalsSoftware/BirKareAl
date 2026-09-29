import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
// Structural input tests directly invoke FormField with hook stubs. Stub only
// the new presentation subscription there; real language rerender tests use React.
const file='apps/mobile/src/features/auth/auth-ui-input.test.tsx';
let test=fs.readFileSync(file,'utf8');
if(!test.includes("vi.mock('@/i18n/use-language'")) {
  test="vi.mock('@/i18n/use-language', () => ({ useLanguageRevision: () => 'tr-TR', useLanguage: () => ({language:'tr',locale:'tr-TR',preference:'system',ready:true,saveFailed:false}) }));\n"+test;
  fs.writeFileSync(file,test);
}
execFileSync(process.execPath,['scripts/language-merge.mjs'],{stdio:'inherit'});
