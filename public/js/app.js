import { templateAssets, pairwiseStrategyImplementations } from '../../src/generatedTemplates.js';
import { buildBallotObject } from '../../src/builderPayload.js';
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
      tiers: [
        { label: 'S', color: '#fbbf24' },
        { label: 'A', color: '#f59e0b' },
        { label: 'B', color: '#f97316' },
        { label: 'C', color: '#fb7185' },
        { label: 'D', color: '#f472b6' }
      ],
      useImageNameForCandidateTitle: true
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
  defaultCandidateTitleSource: 'image-name'
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
  ballotTheme: document.getElementById('ballotTheme'),
  enableExclusionRow: document.getElementById('enableExclusionRow'),
  promptForNameRow: document.getElementById('nameSettings'),
  fileInput: document.getElementById('fileInput'),
  imagePool: document.getElementById('imagePool'),
  candidatesList: document.getElementById('candidatesList'),
  generateBtn: document.getElementById('generateBtn'),
  publishGenerateBtn: document.getElementById('publishGenerateBtn'),
  autoCreateBtn: document.getElementById('autoCreateBtn'),
  addCandidateBtn: document.getElementById('addCandidateBtn'),
  savePresetsBtn: document.getElementById('savePresetsBtn'),
  useImageNameForCandidateTitle: document.getElementById('useImageNameForCandidateTitle'),
  previewFrame: document.getElementById('previewFrame'),
  refreshPreviewBtn: document.getElementById('refreshPreviewBtn'),
  previewModeButtons: Array.from(document.querySelectorAll('[data-preview-mode]')),
  tabButtons: Array.from(document.querySelectorAll('.tab'))
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
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
  if (refs.ballotTheme) {
    refs.ballotTheme.value = pickSelectValue(refs.ballotTheme, builderDefaults.ballotTheme, 'default');
  }
  if (refs.useImageNameForCandidateTitle) {
    refs.useImageNameForCandidateTitle.checked = builderDefaults.useImageNameForCandidateTitle !== false;
  }
  state.defaultCandidateTitleSource = refs.useImageNameForCandidateTitle?.checked ? 'image-name' : 'blank';
}

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
refs.addCandidateBtn?.addEventListener('click', () => addCandidate());
refs.savePresetsBtn?.addEventListener('click', saveCurrentPresets);
refs.useImageNameForCandidateTitle?.addEventListener('change', () => {
  state.defaultCandidateTitleSource = refs.useImageNameForCandidateTitle.checked ? 'image-name' : 'blank';
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
refs.previewModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    refs.previewModeButtons.forEach((entry) => entry.classList.toggle('active', entry === button));
    updatePreviewViewport(refs.previewFrame, button.dataset.previewMode || 'desktop');
    syncPreview();
  });
});

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
  if (refs.previewFrame) {
    renderPreview();
  }
}

function attachStateListeners() {
  [refs.contestTitle, refs.votingMode, refs.sortMode, refs.pairwiseAlgorithm, refs.enableExclusion, refs.promptForName, refs.completionRuleMode, refs.completionRuleCount, refs.completionLabel, refs.ballotTheme].forEach((element) => {
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
      <img class="pool-thumb" src="${image.b64}" alt="${image.name}" draggable="true" />
      <p>${image.name}</p>
    `;
    const thumb = card.querySelector('img');
    thumb.addEventListener('dragstart', () => {
      state.draggedImageId = image.id;
      state.draggedCandidateId = null;
    });
    fragment.appendChild(card);
  });
  refs.imagePool.appendChild(fragment);
  updateActionButtons();
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
      ballotTheme: refs.ballotTheme?.value || builderDefaults.ballotTheme || 'default'
    },
    builderDefaults
  ));

  const parsedBallotData = JSON.parse(ballotData);
  if (!parsedBallotData.candidates.length) {
    return null;
  }

  const asset = templateAssets[mode];
  let runtimeScript = asset.js;
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
    .replaceAll('{{CSS}}', asset.css)
    .replaceAll('{{JS}}', runtimeScript);
}

function collectBuilderPresetSnapshot() {
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
      ballotTheme: refs.ballotTheme?.value || 'default',
      tiers: getTiers(),
      useImageNameForCandidateTitle: refs.useImageNameForCandidateTitle?.checked !== false
    }
  };
}

async function saveCurrentPresets() {
  const payload = `${JSON.stringify(collectBuilderPresetSnapshot(), null, 2)}\n`;
  const anchor = document.createElement('a');
  anchor.href = `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
  anchor.download = 'defaults.json';
  anchor.click();
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

function renderPreview() {
  const html = buildBallotHtml();
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
renderTierInputs(DEFAULT_TIERS);
updateActionButtons();
renderPool();
renderCandidates();
syncPreview();
