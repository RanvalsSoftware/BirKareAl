import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

// These are the remaining reviewed display strings from the final AST inventory.
const file = 'apps/mobile/src/i18n/locales/ui-en.json';
const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
Object.assign(messages, {
  'Eklenen': 'Added', 'Harcanan': 'Spent', 'Hayal Et': 'Imagine',
  'Kadraj': 'Framing', 'Yarat': 'Create',
  'Varyasyon 1': 'Variation 1', 'Varyasyon 2': 'Variation 2',
  'Varyasyon 3': 'Variation 3', 'Varyasyon 4': 'Variation 4',
});
fs.writeFileSync(file, JSON.stringify(messages, null, 2) + '\n');

// Network messages must be resolved on each failure, not at module evaluation.
const clientFile = 'apps/mobile/src/api/client.ts';
let client = fs.readFileSync(clientFile, 'utf8');
const source = ts.createSourceFile(clientFile, client, ts.ScriptTarget.Latest, true);
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'NETWORK_REQUEST_FAILED_MESSAGE') {
    const value = node.initializer;
    if (value && ts.isCallExpression(value) && value.expression.getText(source) === 'translateCopy' && value.arguments[0] && ts.isStringLiteral(value.arguments[0])) {
      client = client.slice(0, value.getStart(source)) + value.arguments[0].getText(source) + client.slice(value.end);
    }
    return;
  }
  ts.forEachChild(node, visit);
}
visit(source);
fs.writeFileSync(clientFile, client);
execFileSync(process.execPath, ['scripts/language-ui-finalize.mjs'], { stdio: 'inherit' });
