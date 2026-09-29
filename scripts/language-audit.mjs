import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Translation review inventory only. Never reads credentials, environment files,
// user data, provider tokens, pictures, or files outside the mobile source roots.
const roots = ['apps/mobile/app', 'apps/mobile/src'];
const candidates = new Map();
const turkish = /[çğıöşüÇĞİÖŞÜ]|\b(?:Devam|Kaydet|Geri|Vazgeç|Tamam|Profil|Kredi|Krediler|Hesap|Hesab|Sil|Destek|Oturum|Galeri|Abonelik|Yenile|Ayarlar|Filtre|Filtreler|Sahne|Proje|Projeler|Paylaş|Bilgi|Tarih|veya|için|ile|bir|olarak)\b/u;
const props = new Set(['title','subtitle','label','description','detail','text','body','heading','placeholder','hint','message','caption','accessibilityLabel','accessibilityHint','loadingLabel','emptyTitle','emptyDescription']);
const walk = (directory) => fs.readdirSync(directory, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(directory,e.name)) : [path.join(directory,e.name)]);
for (const filename of roots.flatMap(walk).filter(p => /\.tsx?$/.test(p) && !/\.(?:test|spec)\.|\/i18n\//.test(p))) {
  const source = ts.createSourceFile(filename, fs.readFileSync(filename,'utf8'), ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    let text;
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text.replace(/\s+/g,' ').trim();
    else if (ts.isTemplateExpression(node)) text = node.head.text + node.templateSpans.map((span,i)=>`{{p${i}}}`+span.literal.text).join('');
    if (text && text.length > 1 && text.length < 5000) {
      const parent = node.parent;
      const prop = (ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent)) ? parent.name.getText(source).replace(/['"]/g,'') : '';
      const display = ts.isJsxText(node) || props.has(prop);
      if ((turkish.test(text) || (display && /[A-Za-z]/.test(text))) && !text.startsWith('/') && !text.includes('.apps.googleusercontent.com') && !/^https?:/.test(text)) {
        const item = candidates.get(text) ?? {text, files:new Set()}; item.files.add(filename); candidates.set(text,item);
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
}
const messages = [...candidates.values()].map(x=>({text:x.text,files:[...x.files]}));
console.log('I18N_STATIC_COPY_COUNT='+messages.length);
for (const item of messages) console.log(JSON.stringify(item));
