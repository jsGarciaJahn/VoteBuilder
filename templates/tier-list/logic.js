const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
const allowExclusion = ballotData.allowExclusion === true;
const fallbackTierColors = ['#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#4ade80', '#a3e635'];
const defaultTiers = Array.isArray(VOTE_BUILDER_DEFAULTS?.builder?.tiers) && VOTE_BUILDER_DEFAULTS.builder.tiers.length
  ? VOTE_BUILDER_DEFAULTS.builder.tiers
  : [
      { label: 'S', color: '#fbbf24' },
      { label: 'A', color: '#f59e0b' },
      { label: 'B', color: '#f97316' },
      { label: 'C', color: '#fb7185' },
      { label: 'D', color: '#f472b6' }
    ];
const promptForName = ballotData.promptForName !== false;
const includeVoterName = ballotData.includeVoterName !== false;
const completionRule = ballotData.completionRule || {
  mode: VOTE_BUILDER_DEFAULTS?.builder?.completionRuleMode || 'all-ranked',
  count: VOTE_BUILDER_DEFAULTS?.builder?.completionRuleCount || 1
};
const completionLabel = ballotData.completionLabel || VOTE_BUILDER_DEFAULTS?.builder?.completionLabel || 'Copy results';
const tiers = normalizeTiers(ballotData.tiers, ballotData.tierLabels, ballotData.tierColors);
const assignment = {};
tiers.forEach((tier) => {
  assignment[tier.id] = [];
});
const assignmentHistory = [];
let activeCandidates = [...candidates];

const tierList = document.getElementById('tierList');
const cardGrid = document.getElementById('cardGrid');
const namePrompt = document.getElementById('namePrompt');
const voterNameInput = document.getElementById('voterName');
const excludeField = document.getElementById('excludeField');
const excludeSearch = document.getElementById('excludeSearch');
const excludeOptions = document.getElementById('excludeOptions');
const AUTO_SCROLL_EDGE_PX = 96;
const AUTO_SCROLL_MAX_SPEED = 18;
let autoScrollPointerY = null;
let autoScrollActive = false;
let autoScrollFrame = 0;
const actionButtons = wireBallotActionButtons({
  onUndo: undoLastChange,
  onRestart: restartAssignments,
  onSubmit: handleSubmit
});
const exclusionCombobox = excludeField && excludeSearch && excludeOptions
  ? createExclusionCombobox({
      field: excludeField,
      input: excludeSearch,
      options: excludeOptions
    })
  : null;

function normalizeHexColor(rawValue, fallbackValue) {
  const value = String(rawValue || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return fallbackValue;
}

function normalizeTiers(rawTiers, rawTierLabels, rawTierColors) {
  const legacyLabels = Array.isArray(rawTierLabels) ? rawTierLabels : [];
  const legacyColors = Array.isArray(rawTierColors) ? rawTierColors : [];
  const source = Array.isArray(rawTiers) && rawTiers.length
    ? rawTiers
    : legacyLabels.map((label, index) => ({
      label,
      color: legacyColors[index]
    }));

  const normalized = source
    .slice(0, 10)
    .map((tier, index) => ({
      id: `tier-${index + 1}`,
      label: String(tier?.label || '').trim() || `Tier ${index + 1}`,
      color: normalizeHexColor(tier?.color, normalizeHexColor(defaultTiers[index]?.color, fallbackTierColors[index % fallbackTierColors.length]))
    }));

  if (normalized.length >= 2) {
    return normalized;
  }

  const fallback = defaultTiers
    .slice(0, 10)
    .map((tier, index) => ({
      id: `tier-${index + 1}`,
      label: String(tier?.label || '').trim() || `Tier ${index + 1}`,
      color: normalizeHexColor(tier?.color, fallbackTierColors[index % fallbackTierColors.length])
    }));

  while (fallback.length < 2) {
    const index = fallback.length;
    fallback.push({
      id: `tier-${index + 1}`,
      label: `Tier ${index + 1}`,
      color: fallbackTierColors[index % fallbackTierColors.length]
    });
  }
  return fallback;
}

function hexToRgba(hexColor, alpha) {
  const normalized = normalizeHexColor(hexColor, '#e2e8f0').slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getReadableTextColor(hexColor) {
  const normalized = normalizeHexColor(hexColor, '#e2e8f0').slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#0f172a' : '#f8fafc';
}

function computeAutoScrollDelta(pointerY) {
  if (typeof pointerY !== 'number') return 0;
  const viewportHeight = window.innerHeight || 0;
  if (!viewportHeight) return 0;

  const topDistance = pointerY;
  const bottomDistance = viewportHeight - pointerY;

  if (topDistance < AUTO_SCROLL_EDGE_PX) {
    const ratio = (AUTO_SCROLL_EDGE_PX - topDistance) / AUTO_SCROLL_EDGE_PX;
    return -Math.ceil(AUTO_SCROLL_MAX_SPEED * Math.min(1, ratio));
  }

  if (bottomDistance < AUTO_SCROLL_EDGE_PX) {
    const ratio = (AUTO_SCROLL_EDGE_PX - bottomDistance) / AUTO_SCROLL_EDGE_PX;
    return Math.ceil(AUTO_SCROLL_MAX_SPEED * Math.min(1, ratio));
  }

  return 0;
}

function runAutoScrollLoop() {
  if (!autoScrollActive) {
    autoScrollFrame = 0;
    return;
  }

  const delta = computeAutoScrollDelta(autoScrollPointerY);
  if (delta !== 0) {
    window.scrollBy(0, delta);
  }

  autoScrollFrame = window.requestAnimationFrame(runAutoScrollLoop);
}

function startAutoScroll(pointerY) {
  autoScrollActive = true;
  autoScrollPointerY = typeof pointerY === 'number' ? pointerY : null;
  if (!autoScrollFrame) {
    autoScrollFrame = window.requestAnimationFrame(runAutoScrollLoop);
  }
}

function updateAutoScroll(pointerY) {
  if (!autoScrollActive) return;
  if (typeof pointerY === 'number') {
    autoScrollPointerY = pointerY;
  }
}

function stopAutoScroll() {
  autoScrollActive = false;
  autoScrollPointerY = null;
  if (autoScrollFrame) {
    window.cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = 0;
  }
}

function getAssignedTierId(candidateId) {
  return tiers.find((tier) => (assignment[tier.id] || []).includes(candidateId))?.id || '';
}

function getExcludedCandidateName() {
  return allowExclusion && exclusionCombobox ? exclusionCombobox.getValue() : '';
}

function getCandidateById(candidateId) {
  return activeCandidates.find((candidate) => candidate.id === candidateId);
}

function getAssignedCount() {
  return tiers.reduce((total, tier) => total + (assignment[tier.id] || []).length, 0);
}

function isCompletionSatisfied() {
  const assignedCount = getAssignedCount();
  if (completionRule.mode === 'at-least-one') {
    return assignedCount >= 1;
  }
  if (completionRule.mode === 'minimum-count') {
    return assignedCount >= (completionRule.count || 1);
  }
  if (completionRule.mode === 'exact-count') {
    return assignedCount === (completionRule.count || 1);
  }
  return assignedCount === activeCandidates.length;
}

function populateExcludeOptions() {
  if (!allowExclusion || !excludeField || !exclusionCombobox) {
    if (excludeField) excludeField.hidden = true;
    exclusionCombobox?.clear();
    return;
  }

  excludeField.hidden = false;
  exclusionCombobox.setCandidates(candidates);
  exclusionCombobox.hide();
}

function applyActiveCandidatesFromExclusion() {
  const excludedName = getExcludedCandidateName();
  activeCandidates = candidates.filter((candidate) => !(allowExclusion && excludedName && candidate.name === excludedName));

  const activeIds = new Set(activeCandidates.map((candidate) => candidate.id));
  tiers.forEach((tier) => {
    assignment[tier.id] = (assignment[tier.id] || []).filter((id) => activeIds.has(id));
  });

  assignmentHistory.length = 0;
  renderTiers();
  renderGrid();
  updateControlState();
}

function cloneAssignmentState() {
  const snapshot = {};
  tiers.forEach((tier) => {
    snapshot[tier.id] = [...(assignment[tier.id] || [])];
  });
  return snapshot;
}

function restoreAssignmentState(snapshot) {
  tiers.forEach((tier) => {
    assignment[tier.id] = [...(snapshot[tier.id] || [])];
  });
}

function saveHistorySnapshot() {
  assignmentHistory.push(cloneAssignmentState());
  if (assignmentHistory.length > 200) {
    assignmentHistory.shift();
  }
}

function updateControlState() {
  if (actionButtons.undoButton) {
    actionButtons.undoButton.disabled = assignmentHistory.length === 0;
  }
  if (actionButtons.restartButton) {
    actionButtons.restartButton.disabled = getAssignedCount() === 0;
  }
  setActionButtonState(actionButtons.submitButton, {
    label: completionLabel,
    disabled: !isCompletionSatisfied()
  });
  actionButtons.submitButton?.classList.toggle('action-btn-complete', true);
}

function renderTiers() {
  tierList.innerHTML = '';
  tiers.forEach((tier) => {
    const item = document.createElement('div');
    item.className = 'tier-item';
    item.dataset.tier = tier.label;
    item.dataset.tierId = tier.id;
    item.dataset.tierColor = tier.color;
    item.style.borderColor = hexToRgba(tier.color, 0.55);
    const assignedIds = assignment[tier.id] || [];
    item.innerHTML = `
      <strong class="tier-label">${escapeHtml(tier.label)}</strong>
      <div class="tier-assigned-list">${assignedIds.length ? '' : '<span class="tier-empty">Drop candidates here</span>'}</div>
    `;
    const label = item.querySelector('.tier-label');
    label.style.background = tier.color;
    label.style.color = getReadableTextColor(tier.color);

    const assignedList = item.querySelector('.tier-assigned-list');
    assignedIds
      .map((candidateId) => getCandidateById(candidateId))
      .filter(Boolean)
      .forEach((candidate) => {
        const card = document.createElement('div');
        card.className = 'card tier-card tier-assigned-card';
        card.draggable = true;
        card.dataset.id = candidate.id;
        card.dataset.tierId = tier.id;
        const image = candidate.images[0] || '';
        card.innerHTML = `
          <img src="${image}" alt="${escapeHtml(candidate.name)}" />
          <strong>${escapeHtml(candidate.name)}</strong>
        `;
        card.addEventListener('dragstart', (event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', candidate.id);
          card.classList.add('dragging');
          startAutoScroll(event.clientY);
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          tierList.querySelectorAll('.tier-item').forEach((entry) => entry.classList.remove('drag-over'));
          tierList.querySelectorAll('.tier-assigned-card').forEach((entry) => entry.classList.remove('drag-over-target'));
          stopAutoScroll();
        });
        card.addEventListener('dragover', (event) => {
          event.preventDefault();
          event.stopPropagation();
          updateAutoScroll(event.clientY);
          card.classList.add('drag-over-target');
        });
        card.addEventListener('dragleave', () => {
          card.classList.remove('drag-over-target');
        });
        card.addEventListener('drop', (event) => {
          event.preventDefault();
          event.stopPropagation();
          card.classList.remove('drag-over-target');
          const candidateId = event.dataTransfer?.getData('text/plain');
          if (!candidateId) return;
          assignCandidate(candidateId, tier.id, { beforeCandidateId: candidate.id });
        });
        assignedList.appendChild(card);
      });

    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      updateAutoScroll(event.clientY);
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      updateAutoScroll(event.clientY);
      item.classList.remove('drag-over');
      const candidateId = event.dataTransfer?.getData('text/plain');
      if (!candidateId) return;
      assignCandidate(candidateId, tier.id);
    });

    tierList.appendChild(item);
  });
}

function renderGrid() {
  cardGrid.innerHTML = '';
  const assignedIds = new Set(tiers.flatMap((tier) => assignment[tier.id] || []));
  activeCandidates.forEach((candidate) => {
    if (assignedIds.has(candidate.id)) {
      return;
    }

    const card = document.createElement('div');
    card.className = 'card tier-card';
    card.draggable = true;
    card.dataset.id = candidate.id;
    const image = candidate.images[0] || '';
    card.innerHTML = `
      <img src="${image}" alt="${escapeHtml(candidate.name)}" />
      <strong>${escapeHtml(candidate.name)}</strong>
    `;

    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', candidate.id);
      card.classList.add('dragging');
      startAutoScroll(event.clientY);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      tierList.querySelectorAll('.tier-item').forEach((entry) => entry.classList.remove('drag-over'));
      stopAutoScroll();
    });

    cardGrid.appendChild(card);
  });
}

function assignCandidate(candidateId, tierId, options = {}) {
  if (!getCandidateById(candidateId)) return;
  if (!tiers.some((tier) => tier.id === tierId)) return;

  const previousTierId = getAssignedTierId(candidateId);
  const currentTarget = assignment[tierId] || [];
  const beforeCandidateId = options.beforeCandidateId;
  const beforeIndex = beforeCandidateId ? currentTarget.indexOf(beforeCandidateId) : -1;

  if (previousTierId === tierId && beforeIndex === -1 && currentTarget[currentTarget.length - 1] === candidateId) {
    return;
  }

  if (previousTierId === tierId && beforeIndex !== -1 && currentTarget[Math.max(0, beforeIndex - 1)] === candidateId) {
    return;
  }

  saveHistorySnapshot();

  Object.keys(assignment).forEach((currentTier) => {
    assignment[currentTier] = (assignment[currentTier] || []).filter((entry) => entry !== candidateId);
  });

  assignment[tierId] = assignment[tierId] || [];
  if (beforeIndex !== -1) {
    const insertAt = assignment[tierId].indexOf(beforeCandidateId);
    assignment[tierId].splice(insertAt === -1 ? assignment[tierId].length : insertAt, 0, candidateId);
  } else {
    assignment[tierId].push(candidateId);
  }

  renderTiers();
  renderGrid();
  updateControlState();
}

function unassignCandidate(candidateId) {
  if (!getCandidateById(candidateId)) return;
  const previousTierId = getAssignedTierId(candidateId);
  if (!previousTierId) return;

  saveHistorySnapshot();
  assignment[previousTierId] = (assignment[previousTierId] || []).filter((entry) => entry !== candidateId);
  renderTiers();
  renderGrid();
  updateControlState();
}

function undoLastChange() {
  const previous = assignmentHistory.pop();
  if (!previous) return;
  restoreAssignmentState(previous);
  renderTiers();
  renderGrid();
  updateControlState();
}

function restartAssignments() {
  if (getAssignedCount() === 0) return;
  saveHistorySnapshot();
  tiers.forEach((tier) => {
    assignment[tier.id] = [];
  });
  renderTiers();
  renderGrid();
  updateControlState();
}

async function handleSubmit() {
  const voterName = voterNameInput ? voterNameInput.value.trim() : '';
  if (promptForName && !voterName) {
    alert('Please enter your name before continuing.');
    return;
  }

  if (!isCompletionSatisfied()) {
    alert('The current tier assignment does not satisfy the configured completion rule.');
    return;
  }

  const payload = collectPayload(
    includeVoterName ? voterName : '',
    contestTitle,
    tiers.flatMap((tier) => (assignment[tier.id] || []).map((id) => `${tier.label}: ${activeCandidates.find((candidate) => candidate.id === id)?.name || ''}`))
  );
  await copyPayload(payload);
}

cardGrid.addEventListener('dragover', (event) => {
  event.preventDefault();
  updateAutoScroll(event.clientY);
  cardGrid.classList.add('drag-over');
});

cardGrid.addEventListener('dragleave', () => {
  cardGrid.classList.remove('drag-over');
});

cardGrid.addEventListener('drop', (event) => {
  event.preventDefault();
  updateAutoScroll(event.clientY);
  cardGrid.classList.remove('drag-over');
  const candidateId = event.dataTransfer?.getData('text/plain');
  if (!candidateId) return;
  unassignCandidate(candidateId);
  stopAutoScroll();
});

document.addEventListener('dragover', (event) => {
  updateAutoScroll(event.clientY);
});

document.addEventListener('drop', () => {
  stopAutoScroll();
});

if (namePrompt) {
  namePrompt.hidden = !promptForName;
}

populateExcludeOptions();

if (excludeSearch) {
  excludeSearch.addEventListener('input', applyActiveCandidatesFromExclusion);
}

applyActiveCandidatesFromExclusion();
