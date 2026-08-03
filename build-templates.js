import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const templatesDir = path.join(rootDir, 'templates');
const outputFile = path.join(rootDir, 'src', 'generatedTemplates.js');
const defaultsFile = path.join(rootDir, 'src', 'defaults.json');
const publicDefaultsFile = path.join(rootDir, 'public', 'defaults.json');

const sharedCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-base.css'), 'utf8');
const sharedJs = fs.readFileSync(path.join(templatesDir, 'shared', 'voter-core.js'), 'utf8');
const defaults = JSON.parse(fs.readFileSync(defaultsFile, 'utf8'));
const defaultsLiteral = JSON.stringify(defaults);
const pairwiseStrategiesDir = path.join(templatesDir, 'pairwise', 'strategies');
const pairwiseStrategyImplementations = {};

if (fs.existsSync(pairwiseStrategiesDir)) {
  const strategyFiles = fs.readdirSync(pairwiseStrategiesDir)
    .filter((fileName) => fileName.endsWith('.strategy.js'))
    .sort();

  strategyFiles.forEach((fileName) => {
    const key = fileName.replace('.strategy.js', '');
    pairwiseStrategyImplementations[key] = fs.readFileSync(path.join(pairwiseStrategiesDir, fileName), 'utf8');
  });
}

const modes = ['ranked-choice', 'tier-list', 'pairwise'];
const assets = {};

for (const mode of modes) {
  const modeDir = path.join(templatesDir, mode);
  const html = fs.readFileSync(path.join(modeDir, 'template.html'), 'utf8');
  const componentFiles = fs.readdirSync(modeDir)
    .filter((fileName) => fileName.endsWith('.component.js'))
    .sort();
  const componentScripts = componentFiles
    .map((fileName) => fs.readFileSync(path.join(modeDir, fileName), 'utf8'))
    .join('\n\n');
  const logic = fs.readFileSync(path.join(modeDir, 'logic.js'), 'utf8');
  assets[mode] = {
    html,
    css: sharedCss,
    js: `const VOTE_BUILDER_DEFAULTS = ${defaultsLiteral};\n\n${sharedJs}\n\n${componentScripts ? `${componentScripts}\n\n` : ''}${logic}`
  };
}

const content = `export const templateAssets = ${JSON.stringify(assets, null, 2)};\n\nexport const pairwiseStrategyImplementations = ${JSON.stringify(pairwiseStrategyImplementations, null, 2)};\n`;
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, 'utf8');
fs.mkdirSync(path.dirname(publicDefaultsFile), { recursive: true });
fs.copyFileSync(defaultsFile, publicDefaultsFile);
console.log(`Compiled ${modes.length} ballot templates to ${path.relative(rootDir, outputFile)}`);
