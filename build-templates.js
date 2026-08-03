import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const templatesDir = path.join(rootDir, 'templates');
const outputFile = path.join(rootDir, 'src', 'generatedTemplates.js');

const sharedCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-base.css'), 'utf8');
const sharedJs = fs.readFileSync(path.join(templatesDir, 'shared', 'voter-core.js'), 'utf8');

const modes = ['ranked-choice', 'tier-list', 'pairwise'];
const assets = {};

for (const mode of modes) {
  const modeDir = path.join(templatesDir, mode);
  const html = fs.readFileSync(path.join(modeDir, 'template.html'), 'utf8');
  const logic = fs.readFileSync(path.join(modeDir, 'logic.js'), 'utf8');
  assets[mode] = {
    html,
    css: sharedCss,
    js: `${sharedJs}\n\n${logic}`
  };
}

const content = `export const templateAssets = ${JSON.stringify(assets, null, 2)};\n`;
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, 'utf8');
console.log(`Compiled ${modes.length} ballot templates to ${path.relative(rootDir, outputFile)}`);
