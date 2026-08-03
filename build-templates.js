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

const sharedCssSource = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-base.css'), 'utf8');
const sharedShellHtml = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-shell.html'), 'utf8');
const sharedSetupHtml = fs.readFileSync(path.join(templatesDir, 'shared', 'setup-fragment.html'), 'utf8');
const sharedOutputJs = fs.readFileSync(path.join(rootDir, 'src', 'outputSettings.js'), 'utf8').replace(/^export\s+/mg, '');
const sharedCoreJs = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-core.js'), 'utf8');
const sharedMediaJs = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-media.js'), 'utf8');
const sharedExclusionJs = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-exclusion.js'), 'utf8');
const sharedRankingJs = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-ranking.js'), 'utf8');
const sharedRankingListCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-ranking-list.css'), 'utf8');
const sharedTierListCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-tier-list.css'), 'utf8');
const sharedRankingCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-ranking.css'), 'utf8');
const sharedTierCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-tier.css'), 'utf8');
const sharedPairwiseCss = fs.readFileSync(path.join(templatesDir, 'shared', 'ballot-pairwise.css'), 'utf8');
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

function composeCss(mode) {
  const rankingStart = sharedCssSource.indexOf('\n.ranking-list,\n.tier-list {');
  const footerStart = sharedCssSource.indexOf('\n.ballot-brand-footer {');
  const baseCss = rankingStart >= 0 && footerStart >= 0
    ? `${sharedCssSource.slice(0, rankingStart)}${sharedCssSource.slice(footerStart)}`
    : sharedCssSource;

  const modeCss = [];
  if (mode === 'ranked-choice' || mode === 'pairwise') {
    modeCss.push(sharedRankingListCss);
    modeCss.push(sharedRankingCss);
  }
  if (mode === 'tier-list') {
    modeCss.push(sharedTierListCss);
    modeCss.push(sharedTierCss);
  }
  if (mode === 'pairwise') {
    modeCss.push(sharedPairwiseCss);
  }

  return [baseCss, ...modeCss].filter((part) => String(part || '').trim().length > 0).join('\n\n');
}

function composeHtml(modeHtml, actionLabel) {
  return sharedShellHtml
    .replace('{{TITLE}}', '{{TITLE}}')
    .replace('{{CSS}}', '{{CSS}}')
    .replace('{{ACTION_LABEL}}', actionLabel)
    .replace('{{SETUP}}', sharedSetupHtml)
    .replace('{{CONTENT}}', modeHtml);
}

function composeRuntimeJs(mode, componentScripts, logic) {
  const runtimeParts = [
    `const VOTE_BUILDER_DEFAULTS = ${defaultsLiteral};`,
    sharedOutputJs,
    sharedCoreJs,
    sharedMediaJs,
    sharedExclusionJs,
    mode === 'ranked-choice' || mode === 'pairwise' ? sharedRankingJs : '',
    componentScripts,
    logic
  ].filter((part) => String(part || '').trim().length > 0);

  return runtimeParts.join('\n\n');
}

for (const mode of modes) {
  const modeDir = path.join(templatesDir, mode);
  const modeHtml = fs.readFileSync(path.join(modeDir, 'template.html'), 'utf8');
  const componentFiles = fs.readdirSync(modeDir)
    .filter((fileName) => fileName.endsWith('.component.js'))
    .sort();
  const componentScripts = componentFiles
    .map((fileName) => fs.readFileSync(path.join(modeDir, fileName), 'utf8'))
    .join('\n\n');
  const logic = fs.readFileSync(path.join(modeDir, 'logic.js'), 'utf8');
  const actionLabel = mode === 'ranked-choice' ? 'Copy results' : 'Submit';
  assets[mode] = {
    html: composeHtml(modeHtml, actionLabel),
    css: composeCss(mode),
    js: composeRuntimeJs(mode, componentScripts, logic)
  };
}

const content = `export const templateAssets = ${JSON.stringify(assets, null, 2)};\n\nexport const pairwiseStrategyImplementations = ${JSON.stringify(pairwiseStrategyImplementations, null, 2)};\n`;
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, 'utf8');
fs.mkdirSync(path.dirname(publicDefaultsFile), { recursive: true });
fs.copyFileSync(defaultsFile, publicDefaultsFile);
console.log(`Compiled ${modes.length} ballot templates to ${path.relative(rootDir, outputFile)}`);
