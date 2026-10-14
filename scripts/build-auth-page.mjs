import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'firebase/auth-page');
const output = path.join(source, 'dist');
await mkdir(output, { recursive: true });

// Read the actual app theme/tokens at build time; don't maintain another palette.
const themeSource = await readFile(path.join(root, 'providers/ThemeProvider.tsx'), 'utf8');
const theme = ts.createSourceFile('theme.tsx', themeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const colorsFunction = theme.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'buildColors');
if (!colorsFunction) throw new Error('Cannot find the shared theme palette.');
const colorCode = ts.transpileModule(colorsFunction.getText(theme), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const palette = scheme => vm.runInNewContext(`${colorCode}; buildColors('${scheme}')`);
const tokenSource = await readFile(path.join(root, 'lib/design/tokens.ts'), 'utf8');
const tokens = ts.createSourceFile('tokens.ts', tokenSource, ts.ScriptTarget.Latest, true);
const names = ['spacing', 'radius', 'componentRadius', 'typography'];
const declarations = names.map(name => {
  const statement = tokens.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(tokens) === name));
  if (!statement) throw new Error(`Missing shared token: ${name}`);
  return statement.getText(tokens).replace(/^export\s+/, '');
}).join('\n');
const tokenCode = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const shared = vm.runInNewContext(`${tokenCode}; ({spacing, componentRadius, typography})`);
const kebab = name => name.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`);
const colorVars = scheme => Object.entries(palette(scheme)).map(([name, value]) => `--${kebab(name)}:${value};`).join('');
const geometry = Object.entries(shared.spacing).map(([name, value]) => `--space-${name}:${value}px;`).join('');
const fonts = ['body', 'bodySmall', 'bodyLarge', 'metadata', 'formLabel', 'button', 'display'].map(name => {
  const value = shared.typography[name];
  return `--${kebab(name)}-size:${value.fontSize}px;--${kebab(name)}-line:${value.lineHeight}px;--${kebab(name)}-weight:${value.fontWeight};`;
}).join('');
await writeFile(path.join(output, 'tokens.css'), `/* Generated from the app's shared theme and design tokens. */\n:root{${colorVars('light')}${geometry}${fonts}--field-radius:${shared.componentRadius.field}px;--control-radius:${shared.componentRadius.control}px;}\n@media(prefers-color-scheme:dark){:root{${colorVars('dark')}}}\n`);
for (const name of ['index.html', 'styles.css', 'page.mjs', 'view.mjs', 'reset-flow.mjs', 'config.mjs']) await copyFile(path.join(source, name), path.join(output, name));
await copyFile(path.join(root, 'assets/images/bickers-action-logo.png'), path.join(output, 'logo.png'));
console.log(`Auth page built: ${output}`);
