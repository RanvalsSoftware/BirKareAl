import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// One-time, deterministic migration of developer-owned UI copy. This does NOT
// translate dynamic user data, change technical IDs or run any external AI call.
const HUMAN = /[çğıöşüÇĞİÖŞÜ]|\b(?:Devam|Kaydet|Geri|Tamam|Profil|Kredi|Krediler|Hesap|Sil|Destek|Oturum|Galeri|Abonelik|Yenile|Ayarlar|Filtre|Filtreler|Sahne|Proje|Projeler|Bilgi|Tarih|veya|için|ile|bir|olarak)\b/u;
const displayProps = new Set(['title','subtitle','label','name','description','detail','text','body','heading','placeholder','hint','message','caption','accessibilityLabel','accessibilityHint','loadingLabel','emptyTitle','emptyDescription','updated']);
const jsxProps = new Set([...displayProps].filter(x => x !== 'name'));
const metadataFields = new Set(['description','detail','subtitle','name','title','text','label','heading','body','caption','updated']);
const messageCalls = /^(?:setError|setMessage|setSocialError|setRecoveryError|setNotice|setFeedback|setWarning|flowError|alert|success|error|showError|showSuccess)$/;
const equality = new Set([ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken]);
const normalized = text => text.replace(/\s+/g,' ').trim();
const quote = value => JSON.stringify(value);
function fn(node) { return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node); }
function functionOwner(node) { for(let p=node.parent;p;p=p.parent) if(fn(p)) return p; return null; }
function ancestorVariable(node) { for(let p=node.parent;p;p=p.parent) { if(ts.isVariableDeclaration(p)) return p; if(fn(p)) break; } return null; }
function isComponent(node) {
  if (!fn(node) || !node.body) return false;
  if (node.name && /^[A-Z]/.test(node.name.getText())) return true;
  let parent=node.parent;
  if (ts.isCallExpression(parent) && /^(?:memo|forwardRef|React\.memo|React\.forwardRef)$/.test(parent.expression.getText())) parent=parent.parent;
  if(ts.isVariableDeclaration(parent) && /^[A-Z]/.test(parent.name.getText())) return true;
  return Boolean(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword));
}
function hasJsx(node) { let found=false; function visit(n){if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n)||ts.isJsxFragment(n)){found=true;return;} ts.forEachChild(n,visit);} visit(node); return found; }
function isTranslatedAncestor(node) {
  for(let p=node.parent;p;p=p.parent) {
    if(ts.isCallExpression(p) && /^(?:copy|tr|translateCopy|t)$/.test(p.expression.getText())) return true;
    if(ts.isStatement(p)) return false;
  } return false;
}
function permittedLiteral(node) {
  for (let p=node.parent;p;p=p.parent) {
    if(ts.isBinaryExpression(p) && equality.has(p.operatorToken.kind)) return false;
    if(ts.isCaseClause(p)||ts.isLiteralTypeNode(p)||ts.isImportDeclaration(p)||ts.isExportDeclaration(p)) return false;
    if(ts.isJsxAttribute(p)) return jsxProps.has(p.name.getText());
    if(ts.isJsxExpression(p)) return true;
    if(ts.isPropertyAssignment(p)) {
      const key=p.name.getText().replace(/^['"]|['"]$/g,'');
      // Category strings are legacy machine tokens. Localize their presentation
      // at a catalogue boundary, never their comparisons or selected state.
      if(['id','slug','category','kind','mode','type','code','status','locale'].includes(key)) return false;
      if(displayProps.has(key)) return true;
      const variable=ancestorVariable(p)?.name.getText() ?? '';
      return /(?:labels|messages|titles|descriptions|captions)$/i.test(variable);
    }
    if(ts.isNewExpression(p)) return /Error$/.test(p.expression.getText());
    if(ts.isCallExpression(p)) {
      const name=p.expression.getText();
      return name==='Alert.alert' || messageCalls.test(name.split('.').at(-1));
    }
    if(ts.isReturnStatement(p)) return true;
    if(ts.isParameter(p)) return jsxProps.has(p.name.getText());
    if(ts.isVariableDeclaration(p)) return /(?:label|message|title|subtitle|hint|description|caption|placeholder)$/i.test(p.name.getText());
    if(ts.isStatement(p)||fn(p)) return false;
  } return false;
}

export function localizeSource(filename, content) {
  const source=ts.createSourceFile(filename,content,ts.ScriptTarget.Latest,true,filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const edits=[]; const messages=new Map(); let usesCopy=false; let usesLocale=false;
  const add=(start,end,text)=>edits.push({start,end,text});
  const record=(text,english)=>{const key=normalized(text);if(key)messages.set(key,english??messages.get(key)??'');return key;};
  function expressionFor(node) {
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)) return `translateCopy(${quote(record(node.text))})`;
    if(ts.isTemplateExpression(node)) {
      const text=node.head.text+node.templateSpans.map((span,i)=>`{{p${i}}}`+span.literal.text).join('');
      return `translateCopy(${quote(record(text))}, { ${node.templateSpans.map((span,i)=>`p${i}: ${span.expression.getText(source)}`).join(', ')} })`;
    }
    return null;
  }
  function visit(node) {
    if(ts.isCallExpression(node) && node.expression.getText(source)==='copy' && node.arguments.length>=2 && node.arguments.slice(0,2).every(a=>ts.isStringLiteral(a)||ts.isNoSubstitutionTemplateLiteral(a))) {
      record(node.arguments[0].text,node.arguments[1].text); return;
    }
    if(ts.isCallExpression(node) && node.expression.getText(source)==='translateCopy') {
      if(ts.isStringLiteral(node.arguments[0]))record(node.arguments[0].text);return;
    }
    // Preserve full sentences around simple React interpolations instead of
    // translating fragments such as '1' and 'credit' independently.
    if(ts.isJsxElement(node)) {
      const children=node.children;
      const simple=children.length>0 && children.every(c=>ts.isJsxText(c)||(ts.isJsxExpression(c)&&c.expression&&!hasJsx(c.expression)));
      if(simple) {
        let text='';const expressions=[];
        for(const c of children){if(ts.isJsxText(c))text+=c.text;else {text+=`{{p${expressions.length}}}`;expressions.push(c.expression.getText(source));}}
        if(HUMAN.test(text)) {
          const key=record(text);
          add(node.openingElement.end,node.closingElement.getStart(source),`{translateCopy(${quote(key)}${expressions.length?`, { ${expressions.map((e,i)=>`p${i}: ${e}`).join(', ')} }`:''})}`);
          usesCopy=true;
          ts.forEachChild(node.openingElement,visit);return;
        }
      }
    }
    if(ts.isJsxText(node) && HUMAN.test(node.text) && normalized(node.text)) {
      const key=record(node.text);
      const lead=/^ +\S/.test(node.text)?"{' '}":'';
      const trail=/\S +$/.test(node.text)?"{' '}":'';
      add(node.getFullStart(),node.end,`${lead}{translateCopy(${quote(key)})}${trail}`);usesCopy=true;return;
    }
    if(ts.isPropertyAssignment(node) && metadataFields.has(node.name.getText().replace(/^['"]|['"]$/g,'')) && !functionOwner(node) && !isTranslatedAncestor(node)) {
      const init=node.initializer;
      const text=ts.isStringLiteral(init)||ts.isNoSubstitutionTemplateLiteral(init)?init.text:'';
      if(text&&HUMAN.test(text)) {
        add(node.getStart(source),node.end,`get ${node.name.getText(source)}() { return ${expressionFor(init)}; }`);usesCopy=true;return;
      }
    }
    const text=ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)?node.text:ts.isTemplateExpression(node)?node.head.text+node.templateSpans.map(x=>x.literal.text).join(''):'';
    if(text&&HUMAN.test(text)&&permittedLiteral(node)&&!isTranslatedAncestor(node)) {
      const translated=expressionFor(node);
      if(translated){const attribute=ts.isJsxAttribute(node.parent);add(node.getStart(source),node.end,attribute?`{${translated}}`:translated);usesCopy=true;return;}
    }
    // User profile locale and formatters are metadata, not a translated ID.
    if(ts.isStringLiteral(node)&&node.text==='tr-TR') {
      const p=node.parent;
      if((ts.isPropertyAssignment(p)&&p.name.getText()==='locale') || (ts.isCallExpression(p)&&/\.toLocale(?:DateString|TimeString|String|LowerCase|UpperCase)$/.test(p.expression.getText()))) {
        add(node.getStart(source),node.end,'getAppLocale()');usesLocale=true;return;
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  // Subscribe every React component in a translated module, before early returns.
  // Never add language dependencies to effects: that could restart paid work.
  const components=[];
  function collect(node){if(isComponent(node)&&hasJsx(node.body))components.push(node);ts.forEachChild(node,collect);}
  if(filename.endsWith('.tsx') && (usesCopy||usesLocale||content.includes('useCopy')||/apps\/mobile\/app\//.test(filename)))collect(source);
  let hooks=false;
  for(const component of components){
    const body=component.body;
    if(body.getText(source).includes('const languageRevision = useLanguageRevision();'))continue;
    hooks=true;
    if(ts.isBlock(body))add(body.getStart(source)+1,body.getStart(source)+1,'\n  const languageRevision = useLanguageRevision();\n');
    else {add(body.getStart(source),body.getStart(source),'{ const languageRevision = useLanguageRevision(); return ');add(body.end,body.end,'; }');}
    function memos(n){
      if(n!==body&&fn(n)&&isComponent(n))return;
      if(ts.isCallExpression(n)&&/^(?:useMemo|React\.useMemo)$/.test(n.expression.getText(source))&&n.arguments[1]&&ts.isArrayLiteralExpression(n.arguments[1])){
        const deps=n.arguments[1];if(!deps.elements.some(e=>e.getText(source)==='languageRevision'))add(deps.end-1,deps.end-1,`${deps.elements.length?', ':''}languageRevision`);
      }ts.forEachChild(n,memos);
    }memos(body);
  }
  // Prioritize a sentence replacement over its descendants, preserving all
  // unrelated source formatting and every user-data expression byte-for-byte.
  const sorted=edits.sort((a,b)=>a.start-b.start||b.end-a.end);const accepted=[];
  for(const edit of sorted){const prior=accepted.at(-1);if(prior&&edit.start<prior.end){if(edit.end<=prior.end)continue;throw new Error(`Overlapping localization edit: ${filename}`);}accepted.push(edit);}
  let result=content;for(const edit of accepted.reverse())result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);
  if(usesCopy&&!/import[^;]*\btranslateCopy\b[^;]*from ['"]@\/i18n\/engine/.test(result)) result=`import { tr as translateCopy } from '@/i18n/engine';\n`+result;
  if(usesLocale&&!/import[^;]*\bgetAppLocale\b[^;]*from ['"]@\/i18n\/engine/.test(result)) result=`import { getLocale as getAppLocale } from '@/i18n/engine';\n`+result;
  if(hooks&&!/import[^;]*\buseLanguageRevision\b[^;]*from ['"]@\/i18n\/use-language/.test(result))result=`import { useLanguageRevision } from '@/i18n/use-language';\n`+result;
  return {content:result,messages};
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const write=(name,text)=>{const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);};
function patchFile(name,apply){const before=read(name);const after=apply(before);if(after!==before)write(name,after);}
function replaceRequired(text,from,to){if(text.includes(to))return text;if(!text.includes(from))throw new Error(`Localization anchor not found: ${from.slice(0,100)}`);return text.replace(from,to);}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(directory,e.name)):[path.join(directory,e.name)]);}

export function migrate() {
  const require=createRequire(import.meta.url);
  const mobile=path.join(root,'apps/mobile');
  const expoManifest=require.resolve('expo/package.json',{paths:[mobile]});
  const native=JSON.parse(fs.readFileSync(path.join(path.dirname(expoManifest),'bundledNativeModules.json'),'utf8'));
  if(!native['expo-localization'])throw new Error('Installed Expo does not declare a compatible localization version');
  patchFile('apps/mobile/package.json',s=>{const p=JSON.parse(s);p.dependencies['expo-localization']=native['expo-localization'];p.dependencies.i18next='25.5.2';p.dependencies['react-i18next']='16.0.0';return JSON.stringify(p,null,2)+'\n';});
  patchFile('apps/mobile/app.config.ts',s=>{
    if(!s.includes("['expo-localization'"))s=replaceRequired(s,"  'expo-router',","  'expo-router',\n  ['expo-localization', { supportedLocales: { ios: ['tr', 'en', 'de', 'es', 'ar'], android: ['tr', 'en', 'de', 'es', 'ar'] }, supportsRTL: true }],");
    if(!/\n\s*locales:\s*\{/.test(s))s=replaceRequired(s,"  scheme: 'birkareai',","  scheme: 'birkareai',\n  locales: { tr: './locales/tr.json', en: './locales/en.json', de: './locales/de.json', es: './locales/es.json', ar: './locales/ar.json' },");return s;
  });
  patchFile('apps/mobile/app/_layout.tsx',s=>{
    if(s.includes('function RootNavigator()'))return s;
    s="import { LanguageProvider } from '@/i18n/LanguageProvider';\n"+s;
    s=replaceRequired(s,'export default function RootLayout()','function RootNavigator()');
    return s+'\nexport default function RootLayout() {\n  return <LanguageProvider><RootNavigator /></LanguageProvider>;\n}\n';
  });
  patchFile('apps/mobile/src/features/auth/auth-ui.tsx',s=>{
    if(!s.includes("import { LanguagePicker }"))s="import { LanguagePicker } from '@/i18n/LanguagePicker';\n"+s;
    return replaceRequired(s,'<View style={styles.content}>{children}</View>','<View style={styles.content}>{children}<LanguagePicker compact /></View>');
  });
  patchFile('apps/mobile/app/settings/index.tsx',s=>{
    if(s.includes("import { useLanguage }"))return s;
    if(!s.includes("import { useLanguage }"))s="import { useLanguage } from '@/i18n/use-language';\nimport { t } from '@/i18n/engine';\n"+s;
    s=replaceRequired(s,'  const router = useRouter();','  const router = useRouter();\n  const language = useLanguage();');
    s=replaceRequired(s,'          value="Türkçe"\n          detail="Bu sürüm Türkçe olarak sunuluyor"',`          value={language.preference === 'system' ? t('language.system') : language.language === 'tr' ? 'Türkçe' : 'English'}\n          detail={t('language.subtitle')}\n          onPress={() => router.push('/settings/language' as never)}`);return s;
  });
  patchFile('apps/mobile/src/api/client.ts',s=>{
    if(!s.includes("import { getLocale }"))s="import { getLocale } from '@/i18n/engine';\n"+s;
    return s.includes("'Accept-Language': getLocale()")?s:s.replaceAll("Accept: 'application/json',","Accept: 'application/json',\n    'Accept-Language': getLocale(),");
  });
  // Exact legacy category tokens remain unchanged for filtering. Only the
  // catalogue chip label is translated at this explicitly known UI boundary.
  patchFile('apps/mobile/app/filters/index.tsx',s=>s.replace('label={item}', 'label={translateCopy(item)}'));

  const allMessages=new Map();const entries=[];
  for(const dir of ['apps/mobile/app','apps/mobile/src'])for(const file of walk(path.join(root,dir))){
    const relative=path.relative(root,file).replaceAll(path.sep,'/');
    if(!/\.tsx?$/.test(file)||/\.(?:test|spec)\.|\/i18n\//.test(file)||relative.endsWith('language-store.ts'))continue;
    const before=fs.readFileSync(file,'utf8');const output=localizeSource(relative,before);
    if(output.content!==before)fs.writeFileSync(file,output.content);
    for(const [text,english]of output.messages){const row=allMessages.get(text)??{text,english:'',files:[]};if(english)row.english=english;row.files.push(relative);allMessages.set(text,row);}
  }
  const previous=JSON.parse(read('apps/mobile/src/i18n/locales/copy-en.json'));
  for(const item of allMessages.values()){if(!previous[item.text])previous[item.text]=item.english;entries.push({text:item.text,files:[...new Set(item.files)]});}
  write('apps/mobile/src/i18n/locales/copy-en.json',JSON.stringify(Object.fromEntries(Object.entries(previous).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
  write('apps/mobile/src/i18n/copy-inventory.json',JSON.stringify(entries.sort((a,b)=>a.text.localeCompare(b.text)),null,2)+'\n');
  console.log(`Localized static copy sites in ${entries.length} distinct messages. English pending: ${Object.values(previous).filter(v=>!v).length}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))migrate();
