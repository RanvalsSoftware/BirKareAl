import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeSource } from './language-migrate.mjs';

test('translation touches presentation, not identity, category comparisons or user data', () => {
  const {content,messages}=localizeSource('apps/mobile/app/test.tsx',`import { Text, View } from 'react-native';
const items = [{id:'old_money_portrait', name:'Sade Lüks', category:'Doğal'}] as const;
export default function Demo(){const [name,setName]=useState(''); const [category,setCategory]=useState('Tümü');if(category==='Doğal')return null; return <View><Text>{name}</Text><Text>Önizleme {3} kredi.</Text><Text>Devam et</Text></View>;}`);
  assert.match(content,/id:'old_money_portrait'/);assert.match(content,/category:'Doğal'/);
  assert.match(content,/category==='Doğal'/);assert.match(content,/useState\('Tümü'\)/);
  assert.match(content,/<Text>\{name\}<\/Text>/);
  assert.match(content,/get name\(\) \{ return translateCopy\("Sade Lüks"\)/);
  assert.match(content,/translateCopy\("Önizleme \{\{p0\}\} kredi\."/);
  assert.ok(messages.has('Devam et'));
  assert.ok(content.indexOf('useLanguageRevision()')<content.indexOf("if(category"));
});
test('memo presentation refreshes but generation effect dependencies never change',()=>{
  const {content}=localizeSource('apps/mobile/app/demo.tsx',`export default function Demo(){ const rows=useMemo(()=>[],[query]); useEffect(()=>generate(),[id]); return <Text>Görsel oluştur</Text>;}`);
  assert.match(content,/\[query, languageRevision\]/);assert.match(content,/useEffect\(\(\)=>generate\(\),\[id\]\)/);
});
test('compatibility English pairs are extracted without replacing either argument',()=>{
  const {content,messages}=localizeSource('apps/mobile/app/demo.tsx',`export default function Demo(){const copy=useCopy();return <Text>{copy('Devam et','Continue')}</Text>;}`);
  assert.match(content,/copy\('Devam et','Continue'\)/);assert.equal(messages.get('Devam et'),'Continue');
});
test('repeated migration is idempotent',()=>{
  const a=localizeSource('apps/mobile/app/demo.tsx',`export default function Demo(){return <Text>Devam et</Text>;}`).content;
  assert.equal(localizeSource('apps/mobile/app/demo.tsx',a).content,a);
});
