import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const changed=[];
function edit(file, transform){const before=fs.readFileSync(file,'utf8');const after=transform(before);if(after!==before){fs.writeFileSync(file,after);changed.push(file);}}
function exact(s,a,b){if(s.includes(b))return s;if(!s.includes(a))throw new Error(`Missing UI anchor: ${a.slice(0,70)}`);return s.replace(a,b);}
edit('apps/mobile/src/i18n/engine.ts', s=>{
  s=exact(s,"import supplementalCopy from './locales/supplemental-en.json';", "import supplementalCopy from './locales/supplemental-en.json';\nimport uiCopy from './locales/ui-en.json';");
  s=exact(s,'const completeEnglishCopy = { ...englishCopy, ...supplementalCopy };','const completeEnglishCopy = { ...englishCopy, ...supplementalCopy, ...uiCopy };');
  return exact(s,"  const key = source.replace(/\\s+/g, ' ').trim();", "  const key = source.replace(/\\s+/g, ' ').trim();\n  if ((key === '{{p0}} kredi' || key === '{{p0}} görsel') && typeof values.p0 === 'number') {\n    return String(i18n.t(key.endsWith('kredi') ? 'credits' : 'images', { lng: snapshot.language, count: values.p0 }));\n  }");
});
edit('apps/mobile/src/features/studio/useStudioCatalog.ts',s=>{
  if(!s.includes("import { useLanguageRevision }"))s="import { useLanguageRevision } from '@/i18n/use-language';\n"+s;
  s=exact(s,'export function useStudioCatalog() {','export function useStudioCatalog() {\n  const languageRevision = useLanguageRevision();');
  return exact(s,'    [query.data],','    [query.data, languageRevision],');
});
edit('apps/mobile/src/features/create/components.tsx',s=>{
  if(!s.includes("import { displayOption }"))s="import { displayOption } from '@/i18n/display-options';\nimport { tr as translateCopy } from '@/i18n/engine';\nimport { useLanguageRevision } from '@/i18n/use-language';\n"+s;
  s=exact(s,'labels={stepLabels}', 'labels={stepLabels.map(displayOption)}');
  s=exact(s,"label = 'Devam et'", "label = translateCopy('Devam et')");
  // MiniChoice has an explicit vocabulary, unlike user-created project titles.
  const start=s.indexOf('export function MiniChoice('),end=s.indexOf('export function FieldLabel',start);
  if(start<0||end<0)throw new Error('MiniChoice boundary missing');
  const block=s.slice(start,end).replace('  return (','  useLanguageRevision();\n  return (').replace('accessibilityLabel={label}','accessibilityLabel={displayOption(label)}').replace('{label}\n','{displayOption(label)}\n').replace('{caption}\n','{displayOption(caption)}\n');
  if(!s.slice(start,end).includes('useLanguageRevision();'))s=s.slice(0,start)+block+s.slice(end);
  return s;
});
edit('apps/mobile/app/create/settings.tsx',s=>{
  if(!s.includes("import { displayOption }"))s="import { displayOption } from '@/i18n/display-options';\n"+s;
  s=s.replace('p0: flow.quality,','p0: displayOption(flow.quality),').replace('` · ${flow.composition} kadraj`',"` · ${translateCopy('{{p0}} kadraj', { p0: displayOption(flow.composition) })}`");
  return s;
});

const dictionary=Object.assign({},...['copy-en','supplemental-en','ui-en'].map(n=>JSON.parse(fs.readFileSync(`apps/mobile/src/i18n/locales/${n}.json`,'utf8'))));
const attributes=new Set(['title','subtitle','label','caption','description','detail','placeholder','hint','message','accessibilityLabel','accessibilityHint','loadingLabel']);
const technical=new Set(['id','slug','category','mode','type','value','key','status','code','testID']);
const equal=new Set([ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken]);
const pending=new Map();
const normalized=s=>s.replace(/\s+/g,' ').trim();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function displayBoundary(node){
  for(let p=node.parent;p;p=p.parent){
    if(ts.isBinaryExpression(p)&&equal.has(p.operatorToken.kind))return false;
    if(ts.isCallExpression(p)) {
      if(/^(?:tr|translateCopy|copy|t|displayOption)$/.test(p.expression.getText()))return false;
      if(/^(?:Alert\.alert)$/.test(p.expression.getText()))return true;
      return false;
    }
    if(ts.isPropertyAssignment(p)&&technical.has(p.name.getText().replace(/["']/g,'')))return false;
    if(ts.isJsxAttribute(p))return attributes.has(p.name.getText());
    if(ts.isJsxExpression(p))return true;
    if(ts.isFunctionLike(p)||ts.isStatement(p))return false;
  }return false;
}
for(const file of [...walk('apps/mobile/app'),...walk('apps/mobile/src')]){
  if(!file.endsWith('.tsx')||file.includes('/i18n/')||/\.(test|spec)\./.test(file))continue;
  edit(file,s=>{
    const sf=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),patches=[];
    const record=(value,node,kind)=>{
      const key=normalized(value);if(!key||!/[A-Za-zçğıöşüÇĞİÖŞÜ]/.test(key))return;
      if(!Object.hasOwn(dictionary,key)){
        if(!pending.has(key))pending.set(key,[]);
        pending.get(key).push(file);return;
      }
      if(dictionary[key]===key)return;
      const expression=`translateCopy(${JSON.stringify(key)})`;
      const text=kind==='jsx'||kind==='attribute'?`{${expression}}`:expression;
      patches.push({start:kind==='jsx'?node.getFullStart():node.getStart(sf),end:node.end,text});
    };
    function visit(node){
      if(ts.isJsxText(node))record(node.text,node,'jsx');
      if(ts.isStringLiteral(node)&&displayBoundary(node))record(node.text,node,ts.isJsxAttribute(node.parent)?'attribute':'expression');
      ts.forEachChild(node,visit);
    }visit(sf);
    for(const p of patches.sort((a,b)=>b.start-a.start))s=s.slice(0,p.start)+p.text+s.slice(p.end);
    if(patches.length&&!s.includes("import { tr as translateCopy }"))s="import { tr as translateCopy } from '@/i18n/engine';\n"+s;
    return s;
  });
}
console.log(`UI presentation finalization: ${changed.length} files updated; ${Object.keys(dictionary).length} reviewed copy entries.`);
console.log('BEGIN REMAINING STATIC UI LABELS');
for(const [text,files] of [...pending].sort(([a],[b])=>a.localeCompare(b)))console.log(JSON.stringify({text,files:[...new Set(files)]}));
console.log('END REMAINING STATIC UI LABELS');
