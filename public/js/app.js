import { templateAssets, pairwiseStrategyImplementations } from '../../src/generatedTemplates.js';
import { buildBallotObject } from '../../src/builderPayload.js';
import { normalizeOutputSettings } from '../../src/outputSettings.js';
import { CANDIDATE_CARD_STYLE_DEFAULTS, normalizeCandidateCardStyle } from '../../src/candidateCardStyle.js';
import { loadDefaultFooterBrandLogo, processBannerImage, renderBannerPreview, renderBuilderFooter } from '../../src/builderMedia.js';
import { initializeBuilderConfigUi } from '../../src/builderConfigUi.js';
import { initializeViewTabs } from '../../src/viewTabs.js';
import { updatePreviewViewport } from '../../src/previewViewport.js';

async function loadDefaults() {
  const fallbackDefaults = {
    builder: {
      contestTitle: 'Beauty Contest 2026',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: false,
      promptForName: true,
      pairwiseAlgorithm: 'winner-stays',
      completionRuleMode: 'all-ranked',
      completionRuleCount: 1,
      completionLabel: 'Copy results',
      ballotTheme: 'default',
      candidateCardStyle: {
        variant: 'default',
        autoCycleMs: 4500,
        swipeMs: 420,
        cycleVarianceMs: 900,
        imageHeightPx: 150
      },
      tiers: [
        { label: 'S', color: '#fbbf24' },
        { label: 'A', color: '#f59e0b' },
        { label: 'B', color: '#f97316' },
        { label: 'C', color: '#fb7185' },
        { label: 'D', color: '#f472b6' }
      ],
      useImageNameForCandidateTitle: true,
      outputSettings: {
        deliveryMethod: 'clipboard',
        contentFormat: 'plain-text',
        fileNameBase: 'ballot_results',
        csvDelimiter: 'comma',
        mailtoTo: '',
        mailtoSubject: 'Ballot results',
        mailtoBodyPrefix: ''
      }
    }
  };

  const candidatePaths = [
    '../defaults.json',
    '../../src/defaults.json'
  ];

  for (const path of candidatePaths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Try the next candidate path.
    }
  }

  return fallbackDefaults;
}

const defaults = await loadDefaults();
const builderDefaults = defaults.builder || {};
const FALLBACK_TIER_COLORS = ['#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#4ade80', '#a3e635'];
const DEFAULT_THEME_DEFINITION = { id: 'default', name: 'Default', cssText: '' };
const LEGACY_THEME_ALIASES = {
  modern: 'default',
  contrast: 'dark'
};
const BRAND_FOOTER_TEXT = 'made with AI by Juan Solo';
const BRAND_LOGO_CANDIDATE_PATHS = [
  '../assets/Logo Projekt Juan Solo Plays-02.png',
  './assets/Logo Projekt Juan Solo Plays-02.png'
];
const BALLOT_SIZE_LIMIT_BYTES = 2 * 1024 * 1024;
const WORKSPACE_STORAGE_KEY = 'voteBuilder.builderWorkspace.v1';
const WORKSPACE_FILE_EXTENSION = '.bcd';

let workspaceSaveTimer = null;
let suppressWorkspaceSave = false;

function readOutputSettingsFromControls() {
  return normalizeOutputSettings({
    deliveryMethod: refs.outputDeliveryMethod?.value,
    contentFormat: refs.outputContentFormat?.value,
    fileNameBase: refs.outputFileNameBase?.value,
    csvDelimiter: refs.outputCsvDelimiter?.value,
    mailtoTo: refs.outputMailtoTo?.value,
    mailtoSubject: refs.outputMailtoSubject?.value,
    mailtoBodyPrefix: refs.outputMailtoBodyPrefix?.value
  }, builderDefaults.outputSettings || {});
}

function writeOutputSettingsToControls(rawSettings) {
  const settings = normalizeOutputSettings(rawSettings, builderDefaults.outputSettings || {});
  if (refs.outputDeliveryMethod) {
    refs.outputDeliveryMethod.value = pickSelectValue(refs.outputDeliveryMethod, settings.deliveryMethod, 'clipboard');
  }
  if (refs.outputContentFormat) {
    refs.outputContentFormat.value = pickSelectValue(refs.outputContentFormat, settings.contentFormat, 'plain-text');
  }
  if (refs.outputFileNameBase) {
    refs.outputFileNameBase.value = settings.fileNameBase;
  }
  if (refs.outputCsvDelimiter) {
    refs.outputCsvDelimiter.value = pickSelectValue(refs.outputCsvDelimiter, settings.csvDelimiter, 'comma');
  }
  if (refs.outputMailtoTo) {
    refs.outputMailtoTo.value = settings.mailtoTo;
  }
  if (refs.outputMailtoSubject) {
    refs.outputMailtoSubject.value = settings.mailtoSubject;
  }
  if (refs.outputMailtoBodyPrefix) {
    refs.outputMailtoBodyPrefix.value = settings.mailtoBodyPrefix;
  }
  updateOutputSettingsVisibility();
}

function updateOutputSettingsVisibility() {
  const settings = readOutputSettingsFromControls();
  if (refs.outputDownloadFileNameRow) {
    refs.outputDownloadFileNameRow.hidden = settings.deliveryMethod !== 'download';
  }
  if (refs.outputCsvDelimiterRow) {
    refs.outputCsvDelimiterRow.hidden = settings.contentFormat !== 'csv';
  }
  const mailtoVisible = settings.deliveryMethod === 'mailto';
  if (refs.outputMailtoToRow) {
    refs.outputMailtoToRow.hidden = !mailtoVisible;
  }
  if (refs.outputMailtoSubjectRow) {
    refs.outputMailtoSubjectRow.hidden = !mailtoVisible;
  }
  if (refs.outputMailtoBodyPrefixRow) {
    refs.outputMailtoBodyPrefixRow.hidden = !mailtoVisible;
  }
}

function formatBallotSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
  }
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function computePackagedBallotSizeBytes() {
  const contestTitle = refs.contestTitle?.value?.trim() || builderDefaults.contestTitle || 'Contest';
  const mode = refs.votingMode?.value || builderDefaults.mode || 'ranked-choice';
  const sortMode = refs.sortMode?.value || 'builder';
  const selectedTheme = getThemeDefinitionById(refs.ballotTheme?.value || builderDefaults.ballotTheme || 'default');
  state.candidateCardStyle = readCandidateCardStyleFromControls();
  state.outputSettings = readOutputSettingsFromControls();

  const asset = templateAssets[mode];
  if (!asset) return 0;

  const ballotData = JSON.stringify(buildBallotObject(
    contestTitle,
    mode,
    sortMode,
    refs.enableExclusion?.checked === true,
    state.candidates,
    {
      promptForName: refs.promptForName?.checked ?? true,
      includeVoterName: refs.promptForName?.checked ?? true,
      pairwiseAlgorithm: refs.pairwiseAlgorithm?.value || builderDefaults.pairwiseAlgorithm || 'winner-stays',
      tiers: getTiers(),
      completionRule: buildCompletionRule(),
      completionLabel: refs.completionLabel?.value?.trim() || builderDefaults.completionLabel || 'Copy results',
      ballotTheme: selectedTheme.id,
      candidateCardStyle: state.candidateCardStyle,
      outputSettings: state.outputSettings,
      bannerImage: state.bannerImage || '',
      footerBrandText: state.footerBrandText || BRAND_FOOTER_TEXT,
      footerBrandLogo: state.footerBrandLogo || ''
    },
    builderDefaults
  ));

  let runtimeScript = asset.js;
  let runtimeCss = asset.css;
  if (selectedTheme.cssText) {
    runtimeCss = `${runtimeCss}\n\n/* Theme: ${selectedTheme.id} */\n${selectedTheme.cssText}`;
  }

  if (mode === 'pairwise') {
    const selectedAlgorithm = refs.pairwiseAlgorithm?.value || builderDefaults.pairwiseAlgorithm || 'winner-stays';
    const strategyImplementation = pairwiseStrategyImplementations[selectedAlgorithm]
      || pairwiseStrategyImplementations['winner-stays']
      || '';
    runtimeScript = runtimeScript.replace('/*__PAIRWISE_STRATEGY_IMPLEMENTATION__*/', strategyImplementation);
  }

  const htmlShell = asset.html
    .replaceAll('{{TITLE}}', escapeHtml(contestTitle))
    .replaceAll('{{DATA}}', '')
    .replaceAll('{{CSS}}', '')
    .replaceAll('{{JS}}', '');

  return new Blob([htmlShell, ballotData, runtimeCss, runtimeScript]).size;
}

function updateBallotSizeMeter(ballotBytes) {
  if (!refs.ballotSizeFill || !refs.ballotSizeLabel || !refs.ballotSizeMeter) return;

  const bytes = Number(ballotBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    refs.ballotSizeLabel.textContent = '0 KB / 2 MB';
    refs.ballotSizeFill.style.width = '0%';
    refs.ballotSizeMeter.classList.remove('is-warning', 'is-danger');
    return;
  }

  const percent = Math.min(100, (bytes / BALLOT_SIZE_LIMIT_BYTES) * 100);
  refs.ballotSizeLabel.textContent = `${formatBallotSize(bytes)} / 2 MB`;
  refs.ballotSizeFill.style.width = `${percent}%`;
  refs.ballotSizeMeter.classList.toggle('is-warning', bytes >= BALLOT_SIZE_LIMIT_BYTES * 0.8 && bytes < BALLOT_SIZE_LIMIT_BYTES);
  refs.ballotSizeMeter.classList.toggle('is-danger', bytes >= BALLOT_SIZE_LIMIT_BYTES);
}

function getStoredWorkspaceSnapshot() {
  try {
    const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function scheduleWorkspaceSave() {
  if (suppressWorkspaceSave) return;
  if (workspaceSaveTimer !== null) {
    window.clearTimeout(workspaceSaveTimer);
  }
  workspaceSaveTimer = window.setTimeout(() => {
    workspaceSaveTimer = null;
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(collectWorkspaceSnapshot()));
    } catch {
      // Ignore storage quota or privacy mode failures.
    }
  }, 200);
}

function clearStoredWorkspaceSnapshot() {
  try {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function closeFileMenu() {
  if (refs.fileMenu) {
    refs.fileMenu.open = false;
  }
}

function handleDocumentClick(event) {
  if (!refs.fileMenu?.open) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (refs.fileMenu.contains(target)) return;
  closeFileMenu();
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape') {
    closeFileMenu();
  }
}

function slugifyFileName(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'ballot_project';
}

function normalizeWorkspaceFileName(fileName, fallbackBaseName = 'ballot_project') {
  const rawName = String(fileName || '').trim();
  if (!rawName) {
    return `${slugifyFileName(fallbackBaseName)}${WORKSPACE_FILE_EXTENSION}`;
  }
  const baseName = rawName.replace(/\.bcd$/i, '');
  return `${slugifyFileName(baseName)}${WORKSPACE_FILE_EXTENSION}`;
}

function getSuggestedWorkspaceFileName() {
  return state.workspaceFileName || normalizeWorkspaceFileName(refs.contestTitle?.value || builderDefaults.contestTitle || 'ballot_project');
}

function encodeWorkspaceProject(snapshot) {
  const json = JSON.stringify(snapshot, null, 2);
  return json;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadWorkspaceSnapshot(snapshot, fileName) {
  downloadBlob(new Blob([encodeWorkspaceProject(snapshot)], { type: 'application/octet-stream' }), fileName);
}

function promptForWorkspaceFileName(defaultName) {
  const requestedName = window.prompt('Save project as', defaultName);
  if (requestedName === null) return null;
  return normalizeWorkspaceFileName(requestedName, defaultName);
}

function saveWorkspaceSnapshotByDownload(snapshot, preferredName) {
  const fileName = promptForWorkspaceFileName(preferredName);
  if (!fileName) return false;
  downloadWorkspaceSnapshot(snapshot, fileName);
  state.workspaceFileHandle = null;
  state.workspaceFileName = fileName;
  scheduleWorkspaceSave();
  return true;
}

async function writeWorkspaceSnapshotToHandle(fileHandle, snapshot) {
  const writable = await fileHandle.createWritable();
  const json = encodeWorkspaceProject(snapshot);
  await writable.truncate(0);
  await writable.seek(0);
  await writable.write(json);
  await writable.close();
}

function pickWorkspaceSaveOptions() {
  return {
    suggestedName: getSuggestedWorkspaceFileName(),
    types: [
      {
        description: 'VoteBuilder project',
        accept: {
          'application/octet-stream': ['.bcd']
        }
      }
    ]
  };
}

async function saveWorkspaceProjectAs() {
  const snapshot = collectWorkspaceSnapshot();
  const suggestedName = getSuggestedWorkspaceFileName();
  try {
    if (typeof window.showSaveFilePicker === 'function') {
      const fileHandle = await window.showSaveFilePicker(pickWorkspaceSaveOptions());
      try {
        await writeWorkspaceSnapshotToHandle(fileHandle, snapshot);
      } catch {
        downloadWorkspaceSnapshot(snapshot, normalizeWorkspaceFileName(fileHandle.name, suggestedName));
        state.workspaceFileHandle = null;
        state.workspaceFileName = normalizeWorkspaceFileName(fileHandle.name, suggestedName);
        scheduleWorkspaceSave();
        return;
      }
      state.workspaceFileHandle = fileHandle;
      state.workspaceFileName = normalizeWorkspaceFileName(fileHandle.name, fileHandle.name);
      scheduleWorkspaceSave();
      return;
    }
    saveWorkspaceSnapshotByDownload(snapshot, suggestedName);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (saveWorkspaceSnapshotByDownload(snapshot, suggestedName)) {
      return;
    }
    if (error?.name !== 'AbortError') {
      alert('Could not save that ballot project.');
    }
  } finally {
    closeFileMenu();
  }
}

async function saveWorkspaceProject() {
  if (!state.workspaceFileHandle) {
    await saveWorkspaceProjectAs();
    return;
  }

  const snapshot = collectWorkspaceSnapshot();
  try {
    await writeWorkspaceSnapshotToHandle(state.workspaceFileHandle, snapshot);
    state.workspaceFileName = normalizeWorkspaceFileName(state.workspaceFileHandle.name, state.workspaceFileHandle.name);
    scheduleWorkspaceSave();
  } catch {
    const fallbackName = state.workspaceFileName || normalizeWorkspaceFileName(state.workspaceFileHandle?.name || '', getSuggestedWorkspaceFileName());
    state.workspaceFileHandle = null;
    downloadWorkspaceSnapshot(snapshot, fallbackName);
    state.workspaceFileName = fallbackName;
    scheduleWorkspaceSave();
    return;
  }
  closeFileMenu();
}

function parseWorkspaceProjectBuffer(buffer) {
  const text = new TextDecoder('utf-8').decode(buffer);
  return JSON.parse(text);
}

async function loadWorkspaceProjectFile(file) {
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const snapshot = parseWorkspaceProjectBuffer(buffer);
    const restored = applyWorkspaceSnapshot(snapshot);
    if (restored) {
      state.workspaceFileHandle = null;
      state.workspaceFileName = Object.prototype.hasOwnProperty.call(snapshot, 'workspaceFileName')
        ? normalizeWorkspaceFileName(snapshot.workspaceFileName)
        : normalizeWorkspaceFileName(file.name || 'ballot_project', file.name || 'ballot_project');
      try {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(collectWorkspaceSnapshot()));
      } catch {
        // Ignore storage errors.
      }
    } else {
      alert('That file does not look like a valid ballot project.');
    }
  } catch {
    alert('Could not load that ballot project.');
  } finally {
    if (refs.workspaceFileInput) {
      refs.workspaceFileInput.value = '';
    }
    closeFileMenu();
  }
}

function clearWorkspace() {
  suppressWorkspaceSave = true;
  clearStoredWorkspaceSnapshot();
  try {
    applyBuilderDefaults();
    state.workspaceFileHandle = null;
    state.workspaceFileName = '';
    renderTierInputs(DEFAULT_TIERS);
    state.imagePool = [];
    state.candidates = [];
    state.draggedImageId = null;
    state.draggedCandidateId = null;
    renderPool();
    renderCandidates();
    updateActionButtons();
    applyPreviewViewportMode();
    syncPreview();
  } finally {
    suppressWorkspaceSave = false;
  }
  closeFileMenu();
}

function triggerLoadWorkspaceDialog() {
  refs.workspaceFileInput?.click();
  closeFileMenu();
}

function normalizeStoredImage(image) {
  if (!image || typeof image !== 'object') return null;
  const b64 = String(image.b64 || '').trim();
  if (!b64.startsWith('data:image/')) return null;
  return {
    id: String(image.id || crypto.randomUUID()),
    name: String(image.name || '').trim(),
    b64
  };
}

function normalizeStoredCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const images = Array.isArray(candidate.images)
    ? candidate.images.map((image) => normalizeStoredImage(image)).filter(Boolean)
    : [];

  return {
    id: String(candidate.id || crypto.randomUUID()),
    name: String(candidate.name || ''),
    description: String(candidate.description || ''),
    images
  };
}

function collectWorkspaceSnapshot() {
  const builderSnapshot = collectBuilderPresetSnapshot().builder;
  return {
    version: 1,
    workspaceFileName: state.workspaceFileName || '',
    builder: builderSnapshot,
    footerBrandText: state.footerBrandText || BRAND_FOOTER_TEXT,
    footerBrandLogo: state.footerBrandLogo || '',
    imagePool: state.imagePool.map((image) => normalizeStoredImage(image)).filter(Boolean),
    candidates: state.candidates.map((candidate) => normalizeStoredCandidate(candidate)).filter(Boolean),
    defaultCandidateTitleSource: state.defaultCandidateTitleSource
  };
}

function applyWorkspaceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const builder = snapshot.builder || {};
  suppressWorkspaceSave = true;

  try {
    if (refs.contestTitle && Object.prototype.hasOwnProperty.call(builder, 'contestTitle')) {
      refs.contestTitle.value = String(builder.contestTitle || '');
    }
    if (refs.votingMode && Object.prototype.hasOwnProperty.call(builder, 'mode')) {
      refs.votingMode.value = pickSelectValue(refs.votingMode, builder.mode, 'ranked-choice');
    }
    if (refs.sortMode && Object.prototype.hasOwnProperty.call(builder, 'sortMode')) {
      refs.sortMode.value = pickSelectValue(refs.sortMode, builder.sortMode, 'builder');
    }
    if (refs.enableExclusion && Object.prototype.hasOwnProperty.call(builder, 'allowExclusion')) {
      refs.enableExclusion.checked = builder.allowExclusion === true;
    }
    if (refs.promptForName && Object.prototype.hasOwnProperty.call(builder, 'promptForName')) {
      refs.promptForName.checked = builder.promptForName !== false;
    }
    if (refs.pairwiseAlgorithm && Object.prototype.hasOwnProperty.call(builder, 'pairwiseAlgorithm')) {
      refs.pairwiseAlgorithm.value = pickSelectValue(refs.pairwiseAlgorithm, builder.pairwiseAlgorithm, 'winner-stays');
    }
    if (refs.completionRuleMode && Object.prototype.hasOwnProperty.call(builder, 'completionRuleMode')) {
      refs.completionRuleMode.value = pickSelectValue(refs.completionRuleMode, builder.completionRuleMode, 'all-ranked');
    }
    if (refs.completionRuleCount && Object.prototype.hasOwnProperty.call(builder, 'completionRuleCount')) {
      refs.completionRuleCount.value = String(builder.completionRuleCount || 1);
    }
    if (refs.completionLabel && Object.prototype.hasOwnProperty.call(builder, 'completionLabel')) {
      refs.completionLabel.value = String(builder.completionLabel || 'Copy results');
    }
    if (Object.prototype.hasOwnProperty.call(builder, 'outputSettings')) {
      state.outputSettings = normalizeOutputSettings(builder.outputSettings || {}, builderDefaults.outputSettings || {});
      writeOutputSettingsToControls(state.outputSettings);
    }
    if (refs.ballotTheme && Object.prototype.hasOwnProperty.call(builder, 'ballotTheme')) {
      refs.ballotTheme.value = pickSelectValue(refs.ballotTheme, normalizeBallotTheme(builder.ballotTheme || 'default'), 'default');
    }
    if (refs.useImageNameForCandidateTitle && Object.prototype.hasOwnProperty.call(builder, 'useImageNameForCandidateTitle')) {
      refs.useImageNameForCandidateTitle.checked = builder.useImageNameForCandidateTitle !== false;
    }

    if (Object.prototype.hasOwnProperty.call(builder, 'candidateCardStyle')) {
      state.candidateCardStyle = normalizeCandidateCardStyle(builder.candidateCardStyle || {});
      writeCandidateCardStyleToControls(state.candidateCardStyle);
    }
    if (Object.prototype.hasOwnProperty.call(builder, 'bannerImage')) {
      state.bannerImage = String(builder.bannerImage || '');
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, 'footerBrandText')) {
      state.footerBrandText = String(snapshot.footerBrandText || BRAND_FOOTER_TEXT).trim() || BRAND_FOOTER_TEXT;
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, 'footerBrandLogo')) {
      state.footerBrandLogo = String(snapshot.footerBrandLogo || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, 'workspaceFileName')) {
      state.workspaceFileName = normalizeWorkspaceFileName(snapshot.workspaceFileName);
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, 'defaultCandidateTitleSource')) {
      state.defaultCandidateTitleSource = snapshot.defaultCandidateTitleSource === 'blank' ? 'blank' : 'image-name';
    }

    if (Array.isArray(builder.tiers)) {
      renderTierInputs(builder.tiers);
    }

    state.imagePool = Array.isArray(snapshot.imagePool)
      ? snapshot.imagePool.map((image) => normalizeStoredImage(image)).filter(Boolean)
      : [];
    state.candidates = Array.isArray(snapshot.candidates)
      ? snapshot.candidates.map((candidate) => normalizeStoredCandidate(candidate)).filter(Boolean)
      : [];

    renderBannerPreview({ refs, state });
    renderBuilderFooter({ refs, state, fallbackText: BRAND_FOOTER_TEXT });
    renderPool();
    renderCandidates();
    updateActionButtons();
    applyPreviewViewportMode();
    syncPreview();
    return true;
  } finally {
    suppressWorkspaceSave = false;
  }
}

function readCandidateCardStyleFromControls() {
  return normalizeCandidateCardStyle({
    variant: refs.candidateCardVariant?.value,
    autoCycleMs: Number(refs.candidateCardCycleSeconds?.value || 4.5) * 1000,
    swipeMs: refs.candidateCardSwipeMs?.value,
    imageHeightPx: refs.candidateCardImageHeight?.value
  });
}

function writeCandidateCardStyleToControls(cardStyle) {
  const normalized = normalizeCandidateCardStyle(cardStyle);
  if (refs.candidateCardVariant) {
    refs.candidateCardVariant.value = pickSelectValue(refs.candidateCardVariant, normalized.variant, CANDIDATE_CARD_STYLE_DEFAULTS.variant);
  }
  if (refs.candidateCardCycleSeconds) {
    refs.candidateCardCycleSeconds.value = (normalized.autoCycleMs / 1000).toFixed(1);
  }
  if (refs.candidateCardSwipeMs) {
    refs.candidateCardSwipeMs.value = String(normalized.swipeMs);
  }
  if (refs.candidateCardImageHeight) {
    refs.candidateCardImageHeight.value = String(normalized.imageHeightPx);
  }
}

function normalizeHexColor(rawValue, fallbackValue) {
  const value = String(rawValue || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return fallbackValue;
}

function deriveDefaultTiers(sourceDefaults) {
  if (Array.isArray(sourceDefaults?.tiers) && sourceDefaults.tiers.length >= 2) {
    return sourceDefaults.tiers
      .slice(0, 10)
      .map((tier, index) => ({
        label: String(tier?.label || '').trim() || `Tier ${index + 1}`,
        color: normalizeHexColor(tier?.color, FALLBACK_TIER_COLORS[index % FALLBACK_TIER_COLORS.length])
      }));
  }

  const labels = Array.isArray(sourceDefaults?.tierLabels) && sourceDefaults.tierLabels.length
    ? sourceDefaults.tierLabels
    : ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const colors = Array.isArray(sourceDefaults?.tierColors) && sourceDefaults.tierColors.length
    ? sourceDefaults.tierColors
    : FALLBACK_TIER_COLORS;
  const length = Math.min(10, Math.max(2, Number.parseInt(String(sourceDefaults?.tierCount || 5), 10) || 5));
  const tiers = [];
  for (let index = 0; index < length; index += 1) {
    tiers.push({
      label: String(labels[index] || '').trim() || `Tier ${index + 1}`,
      color: normalizeHexColor(colors[index], FALLBACK_TIER_COLORS[index % FALLBACK_TIER_COLORS.length])
    });
  }
  return tiers;
}

const DEFAULT_TIERS = deriveDefaultTiers(builderDefaults);

const state = {
  imagePool: [],
  candidates: [],
  draggedImageId: null,
  draggedCandidateId: null,
  defaultCandidateTitleSource: 'image-name',
  themeDefinitions: [DEFAULT_THEME_DEFINITION],
  bannerImage: '',
  footerBrandText: BRAND_FOOTER_TEXT,
  footerBrandLogo: '',
  outputSettings: normalizeOutputSettings(builderDefaults.outputSettings || {}, {}),
  workspaceFileName: '',
  workspaceFileHandle: null,
  candidateCardStyle: { ...CANDIDATE_CARD_STYLE_DEFAULTS }
};

const refs = {
  contestTitle: document.getElementById('contestTitle'),
  votingMode: document.getElementById('votingMode'),
  sortMode: document.getElementById('sortMode'),
  pairwiseAlgorithm: document.getElementById('pairwiseAlgorithm'),
  pairwiseAlgorithmRow: document.getElementById('pairwiseAlgorithmRow'),
  tierSettingsRow: document.getElementById('tierSettingsRow'),
  tierLabelsEditor: document.getElementById('tierLabelsEditor'),
  addTierBtn: document.getElementById('addTierBtn'),
  enableExclusion: document.getElementById('enableExclusion'),
  promptForName: document.getElementById('promptForName'),
  completionRuleMode: document.getElementById('completionRuleMode'),
  completionRuleCount: document.getElementById('completionRuleCount'),
  completionRuleCountRow: document.getElementById('completionRuleCountRow'),
  completionLabel: document.getElementById('completionLabel'),
  completionLabelRow: document.getElementById('completionLabelRow'),
  completionOptions: document.getElementById('completionOptions'),
  outputDeliveryMethod: document.getElementById('outputDeliveryMethod'),
  outputContentFormat: document.getElementById('outputContentFormat'),
  outputFileNameBase: document.getElementById('outputFileNameBase'),
  outputCsvDelimiter: document.getElementById('outputCsvDelimiter'),
  outputMailtoTo: document.getElementById('outputMailtoTo'),
  outputMailtoSubject: document.getElementById('outputMailtoSubject'),
  outputMailtoBodyPrefix: document.getElementById('outputMailtoBodyPrefix'),
  outputDownloadFileNameRow: document.getElementById('outputDownloadFileNameRow'),
  outputCsvDelimiterRow: document.getElementById('outputCsvDelimiterRow'),
  outputMailtoToRow: document.getElementById('outputMailtoToRow'),
  outputMailtoSubjectRow: document.getElementById('outputMailtoSubjectRow'),
  outputMailtoBodyPrefixRow: document.getElementById('outputMailtoBodyPrefixRow'),
  ballotTheme: document.getElementById('ballotTheme'),
  candidateCardVariant: document.getElementById('candidateCardVariant'),
  candidateCardCycleSeconds: document.getElementById('candidateCardCycleSeconds'),
  candidateCardSwipeMs: document.getElementById('candidateCardSwipeMs'),
  candidateCardCycleVarianceMs: document.getElementById('candidateCardCycleVarianceMs'),
  candidateCardImageHeight: document.getElementById('candidateCardImageHeight'),
  ballotSizeLabel: document.getElementById('ballotSizeLabel'),
  ballotSizeFill: document.getElementById('ballotSizeFill'),
  ballotSizeMeter: document.querySelector('.ballot-size-meter'),
  ballotSizeHint: document.getElementById('ballotSizeHint'),
  fileMenu: document.getElementById('fileMenu'),
  newWorkspaceBtn: document.getElementById('newWorkspaceBtn'),
  saveWorkspaceBtn: document.getElementById('saveWorkspaceBtn'),
  saveWorkspaceAsBtn: document.getElementById('saveWorkspaceAsBtn'),
  loadWorkspaceBtn: document.getElementById('loadWorkspaceBtn'),
  workspaceFileInput: document.getElementById('workspaceFileInput'),
  bannerImageInput: document.getElementById('bannerImageInput'),
  bannerPreview: document.getElementById('bannerPreview'),
  clearBannerBtn: document.getElementById('clearBannerBtn'),
  enableExclusionRow: document.getElementById('enableExclusionRow'),
  promptForNameRow: document.getElementById('nameSettings'),
  fileInput: document.getElementById('fileInput'),
  imagePool: document.getElementById('imagePool'),
  candidatesList: document.getElementById('candidatesList'),
  generateBtn: document.getElementById('generateBtn'),
  publishGenerateBtn: document.getElementById('publishGenerateBtn'),
  autoCreateBtn: document.getElementById('autoCreateBtn'),
  clearPoolBtn: document.getElementById('clearPoolBtn'),
  addCandidateBtn: document.getElementById('addCandidateBtn'),
  useImageNameForCandidateTitle: document.getElementById('useImageNameForCandidateTitle'),
  previewFrame: document.getElementById('previewFrame'),
  refreshPreviewBtn: document.getElementById('refreshPreviewBtn'),
  previewMobileToggle: document.getElementById('previewMobileToggle'),
  builderFooterLogo: document.getElementById('builderFooterLogo'),
  builderFooterText: document.getElementById('builderFooterText'),
  tabButtons: Array.from(document.querySelectorAll('.tab'))
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function normalizeThemeId(rawThemeId) {
  const key = normalizeKey(rawThemeId);
  if (LEGACY_THEME_ALIASES[key]) {
    return LEGACY_THEME_ALIASES[key];
  }
  return key || 'default';
}

function makeThemeDisplayName(themeId) {
  const words = String(themeId || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ') || 'Theme';
}

async function loadThemeCatalog() {
  const fallbackCatalog = [DEFAULT_THEME_DEFINITION];
  const manifestPaths = [
    './themes/themes.json',
    '../themes/themes.json',
    '../../src/themes/themes.json'
  ];

  let manifest = null;
  for (const path of manifestPaths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (response.ok) {
        manifest = await response.json();
        break;
      }
    } catch {
      // Try the next manifest path.
    }
  }

  const themeFileNames = Array.isArray(manifest)
    ? manifest
    : Array.isArray(manifest?.themes)
      ? manifest.themes
      : [];

  if (!themeFileNames.length) {
    return fallbackCatalog;
  }

  const loadedThemes = [];
  const themeBasePaths = ['./themes/', '../themes/'];
  for (const fileName of themeFileNames) {
    const cleanFileName = String(fileName || '').trim();
    if (!cleanFileName) continue;
    const themeId = normalizeThemeId(cleanFileName.replace(/\.css$/i, ''));
    if (!themeId || themeId === 'default') continue;

    let cssText = '';
    for (const basePath of themeBasePaths) {
      try {
        const response = await fetch(`${basePath}${cleanFileName}`, { cache: 'no-store' });
        if (!response.ok) continue;
        cssText = String(await response.text() || '').trim();
        if (cssText) break;
      } catch {
        // Try the next base path.
      }
    }

    if (!cssText) {
      continue;
    }

    loadedThemes.push({
      id: themeId,
      name: makeThemeDisplayName(themeId),
      cssText
    });
  }

  const deduped = [];
  const seenIds = new Set(['default']);
  loadedThemes.forEach((theme) => {
    if (seenIds.has(theme.id)) return;
    seenIds.add(theme.id);
    deduped.push(theme);
  });

  return [DEFAULT_THEME_DEFINITION, ...deduped];
}

function populateThemeSelectOptions(themeDefinitions) {
  if (!refs.ballotTheme) return;
  refs.ballotTheme.innerHTML = '';
  themeDefinitions.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    refs.ballotTheme.appendChild(option);
  });
}

function getThemeDefinitionById(themeId) {
  const normalizedId = normalizeThemeId(themeId);
  return state.themeDefinitions.find((theme) => theme.id === normalizedId) || DEFAULT_THEME_DEFINITION;
}

function pickSelectValue(selectElement, rawValue, fallbackValue) {
  if (!selectElement) return fallbackValue;
  const options = Array.from(selectElement.options || []);
  const desired = normalizeKey(rawValue);

  if (desired) {
    const byValue = options.find((option) => normalizeKey(option.value) === desired);
    if (byValue) return byValue.value;

    const byLabel = options.find((option) => normalizeKey(option.textContent || '') === desired);
    if (byLabel) return byLabel.value;
  }

  return fallbackValue;
}

function normalizeBallotTheme(rawTheme) {
  return normalizeThemeId(rawTheme);
}

function applyBuilderTheme() {
  const nextTheme = normalizeBallotTheme(refs.ballotTheme?.value || builderDefaults.ballotTheme || 'default');
  if (refs.ballotTheme && refs.ballotTheme.value !== nextTheme) {
    refs.ballotTheme.value = nextTheme;
  }

  const themeDefinition = getThemeDefinitionById(nextTheme);
  const styleId = 'vb-builder-theme-style';
  let styleElement = document.getElementById(styleId);
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = themeDefinition.cssText || '';
}

function applyBuilderDefaults() {
  if (refs.contestTitle) refs.contestTitle.value = builderDefaults.contestTitle || '';
  if (refs.votingMode) {
    refs.votingMode.value = pickSelectValue(refs.votingMode, builderDefaults.mode, 'ranked-choice');
  }
  if (refs.sortMode) {
    refs.sortMode.value = pickSelectValue(refs.sortMode, builderDefaults.sortMode, 'builder');
  }
  if (refs.enableExclusion) refs.enableExclusion.checked = builderDefaults.allowExclusion === true;
  if (refs.promptForName) refs.promptForName.checked = builderDefaults.promptForName !== false;
  if (refs.pairwiseAlgorithm) {
    refs.pairwiseAlgorithm.value = pickSelectValue(refs.pairwiseAlgorithm, builderDefaults.pairwiseAlgorithm, 'winner-stays');
  }
  if (refs.completionRuleMode) {
    refs.completionRuleMode.value = pickSelectValue(refs.completionRuleMode, builderDefaults.completionRuleMode, 'all-ranked');
  }
  if (refs.completionRuleCount) refs.completionRuleCount.value = String(builderDefaults.completionRuleCount || 1);
  if (refs.completionLabel) refs.completionLabel.value = builderDefaults.completionLabel || 'Copy results';
  state.outputSettings = normalizeOutputSettings(builderDefaults.outputSettings || {}, {});
  writeOutputSettingsToControls(state.outputSettings);
  if (refs.ballotTheme) {
    const normalizedTheme = normalizeBallotTheme(builderDefaults.ballotTheme || 'default');
    refs.ballotTheme.value = pickSelectValue(refs.ballotTheme, normalizedTheme, 'default');
  }
  if (refs.useImageNameForCandidateTitle) {
    refs.useImageNameForCandidateTitle.checked = builderDefaults.useImageNameForCandidateTitle !== false;
  }
  state.candidateCardStyle = normalizeCandidateCardStyle(builderDefaults.candidateCardStyle);
  writeCandidateCardStyleToControls(state.candidateCardStyle);
  state.bannerImage = typeof builderDefaults.bannerImage === 'string' ? builderDefaults.bannerImage : '';
  if (typeof builderDefaults.footerBrandText === 'string' && builderDefaults.footerBrandText.trim()) {
    state.footerBrandText = builderDefaults.footerBrandText.trim();
  }
  if (typeof builderDefaults.footerBrandLogo === 'string' && builderDefaults.footerBrandLogo.startsWith('data:image/')) {
    state.footerBrandLogo = builderDefaults.footerBrandLogo;
  }
  state.defaultCandidateTitleSource = refs.useImageNameForCandidateTitle?.checked ? 'image-name' : 'blank';
  renderBannerPreview({ refs, state });
  renderBuilderFooter({ refs, state, fallbackText: BRAND_FOOTER_TEXT });
}

state.themeDefinitions = await loadThemeCatalog();
state.footerBrandLogo = await loadDefaultFooterBrandLogo(BRAND_LOGO_CANDIDATE_PATHS);
populateThemeSelectOptions(state.themeDefinitions);
applyBuilderDefaults();

refs.fileInput.addEventListener('change', (event) => handleFiles(Array.from(event.target.files || [])));
refs.imagePool.addEventListener('click', (event) => {
  if (event.target === refs.imagePool) {
    refs.fileInput.click();
  }
});
refs.imagePool.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    refs.fileInput.click();
  }
});
refs.generateBtn?.addEventListener('click', generateBallot);
refs.publishGenerateBtn?.addEventListener('click', generateBallot);
refs.autoCreateBtn?.addEventListener('click', autoCreateCandidates);
refs.clearPoolBtn?.addEventListener('click', clearImagePool);
refs.addCandidateBtn?.addEventListener('click', () => addCandidate());
refs.newWorkspaceBtn?.addEventListener('click', clearWorkspace);
refs.saveWorkspaceBtn?.addEventListener('click', saveWorkspaceProject);
refs.saveWorkspaceAsBtn?.addEventListener('click', saveWorkspaceProjectAs);
refs.loadWorkspaceBtn?.addEventListener('click', triggerLoadWorkspaceDialog);
refs.workspaceFileInput?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  loadWorkspaceProjectFile(file);
});
refs.outputDeliveryMethod?.addEventListener('change', updateOutputSettingsVisibility);
refs.outputContentFormat?.addEventListener('change', updateOutputSettingsVisibility);
refs.useImageNameForCandidateTitle?.addEventListener('change', () => {
  state.defaultCandidateTitleSource = refs.useImageNameForCandidateTitle.checked ? 'image-name' : 'blank';
  syncPreview();
});
refs.bannerImageInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    return;
  }
  state.bannerImage = await processBannerImage(file);
  renderBannerPreview({ refs, state });
  syncPreview();
});
refs.clearBannerBtn?.addEventListener('click', () => {
  state.bannerImage = '';
  if (refs.bannerImageInput) {
    refs.bannerImageInput.value = '';
  }
  renderBannerPreview({ refs, state });
  syncPreview();
});
refs.addTierBtn?.addEventListener('click', () => {
  const tiers = getTiers();
  if (tiers.length >= 10) return;
  tiers.push({
    label: `Tier ${tiers.length + 1}`,
    color: FALLBACK_TIER_COLORS[tiers.length % FALLBACK_TIER_COLORS.length]
  });
  renderTierInputs(tiers);
  syncPreview();
});
refs.refreshPreviewBtn?.addEventListener('click', () => syncPreview());
refs.previewMobileToggle?.addEventListener('change', () => {
  applyPreviewViewportMode();
  syncPreview();
});
document.addEventListener('click', handleDocumentClick);
document.addEventListener('keydown', handleDocumentKeydown);

initializeBuilderConfigUi({
  modeSelect: refs.votingMode,
  promptForNameRow: refs.promptForNameRow,
  promptForNameCheckbox: refs.promptForName,
  tiersRow: refs.tierSettingsRow,
  pairwiseAlgorithmRow: refs.pairwiseAlgorithmRow,
  exclusionRow: refs.enableExclusionRow,
  completionSettingsRow: refs.completionOptions,
  completionLabelRow: refs.completionLabelRow,
  completionRuleModeSelect: refs.completionRuleMode,
  completionRuleCountRow: refs.completionRuleCountRow,
  completionRuleCountInput: refs.completionRuleCount
});

const viewTabs = initializeViewTabs({
  tabButtons: refs.tabButtons,
  panels: Array.from(document.querySelectorAll('[role="tabpanel"]'))
});

['dragenter', 'dragover'].forEach((eventName) => {
  refs.imagePool.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.imagePool.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  refs.imagePool.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.imagePool.classList.remove('drag-over');
  });
});

refs.imagePool.addEventListener('drop', (event) => {
  refs.imagePool.classList.remove('drag-over');
  handleFiles(Array.from(event.dataTransfer?.files || []));
});

['dragenter', 'dragover'].forEach((eventName) => {
  refs.candidatesList.addEventListener(eventName, (event) => {
    if (!state.draggedImageId) return;
    event.preventDefault();
    refs.candidatesList.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  refs.candidatesList.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.candidatesList.classList.remove('drag-over');
  });
});

refs.candidatesList.addEventListener('drop', (event) => {
  if (!state.draggedImageId) return;
  event.preventDefault();
  event.stopPropagation();
  refs.candidatesList.classList.remove('drag-over');
  createCandidateFromDraggedImage();
});

refs.imagePool.addEventListener('dragover', (event) => {
  event.preventDefault();
  refs.imagePool.classList.add('drag-over');
});
refs.imagePool.addEventListener('dragleave', () => refs.imagePool.classList.remove('drag-over'));
refs.imagePool.addEventListener('drop', () => {
  refs.imagePool.classList.remove('drag-over');
  returnImageToPool();
});

function handleFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
  if (!imageFiles.length) return;

  let pending = imageFiles.length;
  imageFiles.forEach((file) => processImage(file, (b64) => {
    const cleanName = file.name.replace(/\.[^.]+$/, '') || file.name;
    state.imagePool.push({ id: crypto.randomUUID(), name: cleanName, b64 });
    pending -= 1;
    if (pending === 0) renderPool();
  }));
}

function processImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 480;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}


function addCandidate(initialName = '', description = '') {
  const candidate = {
    id: crypto.randomUUID(),
    name: initialName || `Candidate ${state.candidates.length + 1}`,
    description,
    images: []
  };
  state.candidates.unshift(candidate);
  renderCandidates();
  syncPreview();
  return candidate;
}

function autoCreateCandidates() {
  if (!state.imagePool.length) {
    alert('No images are available in the pool yet.');
    return;
  }

  const poolImages = [...state.imagePool];
  poolImages.forEach((image) => {
    const candidateName = state.defaultCandidateTitleSource === 'image-name' ? image.name : '';
    const candidate = addCandidate(candidateName, '');
    if (candidate) {
      candidate.images.push(image);
    }
  });

  state.imagePool = [];
  renderPool();
  renderCandidates();
  syncPreview();
}

function syncPreview() {
  applyBuilderTheme();
  const packagedBytes = computePackagedBallotSizeBytes();
  const html = buildBallotHtml();
  updateBallotSizeMeter(packagedBytes);
  if (refs.previewFrame) {
    renderPreview(html);
  }
}

function getPreviewViewportMode() {
  return refs.previewMobileToggle?.checked ? 'mobile' : 'desktop';
}

function applyPreviewViewportMode() {
  updatePreviewViewport(refs.previewFrame, getPreviewViewportMode());
}

function attachStateListeners() {
  [refs.contestTitle, refs.votingMode, refs.sortMode, refs.pairwiseAlgorithm, refs.enableExclusion, refs.promptForName, refs.completionRuleMode, refs.completionRuleCount, refs.completionLabel, refs.outputDeliveryMethod, refs.outputContentFormat, refs.outputFileNameBase, refs.outputCsvDelimiter, refs.outputMailtoTo, refs.outputMailtoSubject, refs.outputMailtoBodyPrefix, refs.ballotTheme, refs.candidateCardVariant, refs.candidateCardCycleSeconds, refs.candidateCardSwipeMs, refs.candidateCardCycleVarianceMs, refs.candidateCardImageHeight].forEach((element) => {
    if (element) {
      element.addEventListener('input', syncPreview);
      element.addEventListener('change', syncPreview);
    }
  });
}

function getTiers() {
  if (!refs.tierLabelsEditor) {
    return DEFAULT_TIERS.map((tier) => ({ ...tier }));
  }

  const rows = Array.from(refs.tierLabelsEditor.querySelectorAll('.tier-config-row'));
  if (!rows.length) {
    return DEFAULT_TIERS.map((tier) => ({ ...tier }));
  }

  return rows
    .map((row, index) => {
      const labelInput = row.querySelector('input[data-role="tier-label"]');
      const colorInput = row.querySelector('input[data-role="tier-color"]');
      const fallbackColor = FALLBACK_TIER_COLORS[index % FALLBACK_TIER_COLORS.length];
      return {
        label: String(labelInput?.value || '').trim() || `Tier ${index + 1}`,
        color: normalizeHexColor(colorInput?.value, fallbackColor)
      };
    })
    .slice(0, 10);
}

function reorderTiers(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const tiers = getTiers();
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= tiers.length || toIndex >= tiers.length) return;
  const [moved] = tiers.splice(fromIndex, 1);
  tiers.splice(toIndex, 0, moved);
  renderTierInputs(tiers);
  syncPreview();
}

function renderTierInputs(sourceTiers) {
  if (!refs.tierLabelsEditor) return;
  const tiers = (Array.isArray(sourceTiers) && sourceTiers.length ? sourceTiers : getTiers())
    .slice(0, 10)
    .map((tier, index) => ({
      label: String(tier?.label || '').trim() || `Tier ${index + 1}`,
      color: normalizeHexColor(tier?.color, FALLBACK_TIER_COLORS[index % FALLBACK_TIER_COLORS.length])
    }));

  while (tiers.length < 2) {
    const index = tiers.length;
    tiers.push({
      label: `Tier ${index + 1}`,
      color: FALLBACK_TIER_COLORS[index % FALLBACK_TIER_COLORS.length]
    });
  }

  refs.tierLabelsEditor.innerHTML = '';

  const fragment = document.createDocumentFragment();
  tiers.forEach((tier, index) => {
    const row = document.createElement('div');
    row.className = 'tier-config-row';
    row.draggable = true;
    row.dataset.index = String(index);

    const dragHandle = document.createElement('button');
    dragHandle.type = 'button';
    dragHandle.className = 'tier-drag-handle';
    dragHandle.setAttribute('aria-label', `Reorder tier ${index + 1}`);
    dragHandle.textContent = '::';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.maxLength = 24;
    labelInput.value = tier.label;
    labelInput.placeholder = `Tier ${index + 1}`;
    labelInput.dataset.role = 'tier-label';
    labelInput.setAttribute('aria-label', `Tier ${index + 1} label`);
    labelInput.addEventListener('input', syncPreview);
    labelInput.addEventListener('change', syncPreview);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = tier.color;
    colorInput.dataset.role = 'tier-color';
    colorInput.className = 'tier-color-picker';
    colorInput.setAttribute('aria-label', `Tier ${index + 1} color`);
    colorInput.title = `Tier ${index + 1} color`;
    colorInput.addEventListener('input', syncPreview);
    colorInput.addEventListener('change', syncPreview);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'tier-remove-btn';
    removeButton.dataset.role = 'remove-tier';
    removeButton.setAttribute('aria-label', `Remove tier ${index + 1}`);
    removeButton.textContent = 'x';
    removeButton.disabled = tiers.length <= 2;
    removeButton.addEventListener('click', () => {
      const next = getTiers();
      if (next.length <= 2) return;
      next.splice(index, 1);
      renderTierInputs(next);
      syncPreview();
    });

    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.index || String(index));
      row.classList.add('dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      refs.tierLabelsEditor.querySelectorAll('.tier-config-row').forEach((entry) => entry.classList.remove('drag-over'));
    });

    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', (event) => {
      event.preventDefault();
      row.classList.remove('drag-over');
      const fromIndex = Number.parseInt(event.dataTransfer?.getData('text/plain') || '-1', 10);
      reorderTiers(fromIndex, index);
    });

    row.appendChild(dragHandle);
    row.appendChild(labelInput);
    row.appendChild(colorInput);
    row.appendChild(removeButton);
    fragment.appendChild(row);
  });

  refs.tierLabelsEditor.appendChild(fragment);
  if (refs.addTierBtn) {
    refs.addTierBtn.disabled = tiers.length >= 10;
  }
}

function updateActionButtons() {
  if (refs.autoCreateBtn) {
    refs.autoCreateBtn.disabled = state.imagePool.length === 0;
  }
  if (refs.clearPoolBtn) {
    refs.clearPoolBtn.disabled = state.imagePool.length === 0;
  }
}

function renderPool() {
  refs.imagePool.innerHTML = '';
  if (!state.imagePool.length) {
    updateActionButtons();
    return;
  }

  const fragment = document.createDocumentFragment();
  state.imagePool.forEach((image) => {
    const card = document.createElement('div');
    card.className = 'pool-card';
    card.innerHTML = `
      <div class="pool-card-header">
        <button class="pool-remove-btn" type="button" aria-label="Remove ${image.name}" data-image-id="${image.id}">×</button>
      </div>
      <img class="pool-thumb" src="${image.b64}" alt="${image.name}" draggable="true" />
      <p>${image.name}</p>
    `;
    const thumb = card.querySelector('img');
    thumb.addEventListener('dragstart', () => {
      state.draggedImageId = image.id;
      state.draggedCandidateId = null;
    });
    card.querySelector('.pool-remove-btn')?.addEventListener('click', () => removeImageFromPool(image.id));
    fragment.appendChild(card);
  });
  refs.imagePool.appendChild(fragment);
  updateActionButtons();
}

function removeImageFromPool(imageId) {
  const index = state.imagePool.findIndex((image) => image.id === imageId);
  if (index === -1) return;
  state.imagePool.splice(index, 1);
  if (state.draggedImageId === imageId) {
    state.draggedImageId = null;
  }
  renderPool();
  syncPreview();
}

function clearImagePool() {
  if (!state.imagePool.length) return;
  state.imagePool = [];
  state.draggedImageId = null;
  renderPool();
  syncPreview();
}

function renderCandidates() {
  refs.candidatesList.innerHTML = '';
  if (!state.candidates.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  state.candidates.forEach((candidate) => {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.draggable = true;
    card.dataset.id = candidate.id;

    card.addEventListener('dragstart', () => {
      state.draggedCandidateId = candidate.id;
      state.draggedImageId = null;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      state.draggedCandidateId = null;
      card.classList.remove('dragging');
    });
    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (state.draggedCandidateId && state.draggedCandidateId !== candidate.id) {
        reorderCandidates(candidate.id);
      }
    });

    card.innerHTML = `
      <div class="candidate-header">
        <input type="text" value="${candidate.name}" data-field="name" data-id="${candidate.id}" />
        <button class="candidate-close" type="button" data-action="remove" data-id="${candidate.id}" aria-label="Remove candidate">×</button>
      </div>
      <textarea data-field="description" data-id="${candidate.id}" placeholder="Description (optional)">${candidate.description || ''}</textarea>
      <div class="drop-target" data-drop-target="${candidate.id}">
        <div class="thumb-row">
          ${candidate.images.map((image) => `<img class="assigned-thumb" src="${image.b64}" alt="${image.name}" data-image-id="${image.id}" draggable="true" />`).join('')}
        </div>
      </div>
    `;

    card.querySelectorAll('[data-field]').forEach((element) => {
      element.addEventListener('input', (event) => {
        const candidateId = event.target.dataset.id;
        const field = event.target.dataset.field;
        const currentCandidate = state.candidates.find((entry) => entry.id === candidateId);
        if (currentCandidate) {
          currentCandidate[field] = event.target.value;
        }
      });
    });

    card.querySelectorAll('[data-action="remove"]').forEach((button) => {
      button.addEventListener('click', () => removeCandidate(button.dataset.id));
    });

    const target = card.querySelector('.drop-target');
    target.addEventListener('dragover', (event) => {
      event.preventDefault();
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      target.classList.remove('drag-over');
      dropImageIntoCandidate(candidate.id);
    });

    card.querySelectorAll('img[data-image-id]').forEach((imageEl) => {
      imageEl.addEventListener('dragstart', () => {
        state.draggedImageId = imageEl.dataset.imageId;
        state.draggedCandidateId = null;
      });
    });

    fragment.appendChild(card);
  });

  refs.candidatesList.appendChild(fragment);
}

function removeCandidate(candidateId) {
  const candidate = state.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) return;
  state.imagePool.push(...candidate.images);
  state.candidates = state.candidates.filter((entry) => entry.id !== candidateId);
  renderPool();
  renderCandidates();
  syncPreview();
}

function dropImageIntoCandidate(candidateId) {
  if (!state.draggedImageId) return;
  const image = extractImage(state.draggedImageId);
  if (!image) return;
  const candidate = state.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) return;
  candidate.images.push(image);
  state.draggedImageId = null;
  renderPool();
  renderCandidates();
  syncPreview();
}

function createCandidateFromDraggedImage() {
  if (!state.draggedImageId) return;
  const image = extractImage(state.draggedImageId);
  if (!image) return;
  const candidateName = state.defaultCandidateTitleSource === 'image-name' ? image.name : '';
  const candidate = addCandidate(candidateName, '');
  if (candidate) {
    candidate.images.push(image);
  }
  state.draggedImageId = null;
  renderPool();
  renderCandidates();
  syncPreview();
}

function returnImageToPool() {
  if (!state.draggedImageId) return;
  const image = extractImage(state.draggedImageId);
  if (!image) return;
  state.imagePool.push(image);
  state.draggedImageId = null;
  renderPool();
  renderCandidates();
  syncPreview();
}

function reorderCandidates(targetId) {
  if (!state.draggedCandidateId || state.draggedCandidateId === targetId) return;
  const fromIndex = state.candidates.findIndex((candidate) => candidate.id === state.draggedCandidateId);
  const targetIndex = state.candidates.findIndex((candidate) => candidate.id === targetId);
  if (fromIndex === -1 || targetIndex === -1) return;
  const [moved] = state.candidates.splice(fromIndex, 1);
  state.candidates.splice(targetIndex, 0, moved);
  state.draggedCandidateId = null;
  renderCandidates();
  syncPreview();
}

function extractImage(imageId) {
  const fromPoolIndex = state.imagePool.findIndex((image) => image.id === imageId);
  if (fromPoolIndex !== -1) {
    return state.imagePool.splice(fromPoolIndex, 1)[0];
  }

  for (const candidate of state.candidates) {
    const fromCandidateIndex = candidate.images.findIndex((image) => image.id === imageId);
    if (fromCandidateIndex !== -1) {
      return candidate.images.splice(fromCandidateIndex, 1)[0];
    }
  }
  return null;
}

function buildBallotHtml() {
  const contestTitle = refs.contestTitle.value.trim() || builderDefaults.contestTitle || 'Contest';
  const mode = refs.votingMode.value;
  const sortMode = refs.sortMode?.value || 'builder';
  const selectedTheme = getThemeDefinitionById(refs.ballotTheme?.value || builderDefaults.ballotTheme || 'default');
  state.candidateCardStyle = readCandidateCardStyleFromControls();
  state.outputSettings = readOutputSettingsFromControls();
  const ballotData = JSON.stringify(buildBallotObject(
    contestTitle,
    mode,
    sortMode,
    refs.enableExclusion.checked,
    state.candidates,
    {
      promptForName: refs.promptForName?.checked ?? true,
      includeVoterName: refs.promptForName?.checked ?? true,
      pairwiseAlgorithm: refs.pairwiseAlgorithm?.value || builderDefaults.pairwiseAlgorithm || 'winner-stays',
      tiers: getTiers(),
      completionRule: buildCompletionRule(),
      completionLabel: refs.completionLabel?.value?.trim() || builderDefaults.completionLabel || 'Copy results',
      ballotTheme: selectedTheme.id,
      candidateCardStyle: state.candidateCardStyle,
      outputSettings: state.outputSettings,
      bannerImage: state.bannerImage || '',
      footerBrandText: state.footerBrandText || BRAND_FOOTER_TEXT,
      footerBrandLogo: state.footerBrandLogo || ''
    },
    builderDefaults
  ));

  const parsedBallotData = JSON.parse(ballotData);
  if (!parsedBallotData.candidates.length) {
    return null;
  }

  const asset = templateAssets[mode];
  let runtimeScript = asset.js;
  let runtimeCss = asset.css;

  if (selectedTheme.cssText) {
    runtimeCss = `${runtimeCss}\n\n/* Theme: ${selectedTheme.id} */\n${selectedTheme.cssText}`;
  }

  if (mode === 'pairwise') {
    const selectedAlgorithm = refs.pairwiseAlgorithm?.value || builderDefaults.pairwiseAlgorithm || 'winner-stays';
    const strategyImplementation = pairwiseStrategyImplementations[selectedAlgorithm]
      || pairwiseStrategyImplementations['winner-stays']
      || '';
    runtimeScript = runtimeScript.replace('/*__PAIRWISE_STRATEGY_IMPLEMENTATION__*/', strategyImplementation);
  }

  return asset.html
    .replaceAll('{{TITLE}}', escapeHtml(contestTitle))
    .replaceAll('{{DATA}}', ballotData)
    .replaceAll('{{CSS}}', runtimeCss)
    .replaceAll('{{JS}}', runtimeScript);
}

function collectBuilderPresetSnapshot() {
  state.candidateCardStyle = readCandidateCardStyleFromControls();
  state.outputSettings = readOutputSettingsFromControls();
  return {
    builder: {
      contestTitle: refs.contestTitle?.value?.trim() || '',
      mode: refs.votingMode?.value || 'ranked-choice',
      sortMode: refs.sortMode?.value || 'builder',
      allowExclusion: refs.enableExclusion?.checked === true,
      promptForName: refs.promptForName?.checked !== false,
      pairwiseAlgorithm: refs.pairwiseAlgorithm?.value || 'winner-stays',
      completionRuleMode: refs.completionRuleMode?.value || 'all-ranked',
      completionRuleCount: Number(refs.completionRuleCount?.value || 1),
      completionLabel: refs.completionLabel?.value?.trim() || 'Copy results',
      outputSettings: state.outputSettings,
      ballotTheme: normalizeBallotTheme(refs.ballotTheme?.value || 'default'),
      candidateCardStyle: state.candidateCardStyle,
      bannerImage: state.bannerImage || '',
      tiers: getTiers(),
      useImageNameForCandidateTitle: refs.useImageNameForCandidateTitle?.checked !== false
    }
  };
}

function generateBallot() {
  const html = buildBallotHtml();
  if (!html) {
    alert('Add at least one candidate with a title or image before generating a ballot.');
    return;
  }

  const contestTitle = refs.contestTitle.value.trim() || builderDefaults.contestTitle || 'Contest';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${contestTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'ballot'}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPreview(existingHtml) {
  const html = typeof existingHtml === 'string' ? existingHtml : buildBallotHtml();
  if (!html) {
    refs.previewFrame.innerHTML = '<div class="preview-empty">Add at least one candidate with a title or image to preview the ballot.</div>';
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.srcdoc = html;
  refs.previewFrame.innerHTML = '';
  refs.previewFrame.appendChild(iframe);
}

function buildCompletionRule() {
  const mode = refs.completionRuleMode?.value || builderDefaults.completionRuleMode || 'all-ranked';
  if (mode === 'minimum-count' || mode === 'exact-count') {
    return {
      mode,
      count: Number(refs.completionRuleCount?.value || builderDefaults.completionRuleCount || 1)
    };
  }

  return { mode };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

attachStateListeners();
const restoredWorkspace = applyWorkspaceSnapshot(getStoredWorkspaceSnapshot());
if (!restoredWorkspace) {
  renderTierInputs(DEFAULT_TIERS);
  updateActionButtons();
  renderPool();
  renderCandidates();
  applyPreviewViewportMode();
  syncPreview();
}
