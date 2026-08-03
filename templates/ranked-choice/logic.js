const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
const candidateOrder = ballotData.candidateOrder || [];
const allowExclusion = ballotData.allowExclusion === true;
const promptForName = ballotData.promptForName !== false;
const includeVoterName = ballotData.includeVoterName !== false;
const completionRule = ballotData.completionRule || {
  mode: VOTE_BUILDER_DEFAULTS?.builder?.completionRuleMode || 'all-ranked',
  count: VOTE_BUILDER_DEFAULTS?.builder?.completionRuleCount || 1
};
const completionLabel = ballotData.completionLabel || VOTE_BUILDER_DEFAULTS?.builder?.completionLabel || 'Copy results';
const outputSettings = normalizeOutputSettings(ballotData.outputSettings || {}, VOTE_BUILDER_DEFAULTS?.builder?.outputSettings || {});
const ballotTheme = normalizeBallotTheme(ballotData.ballotTheme || VOTE_BUILDER_DEFAULTS?.builder?.ballotTheme || 'default');
const candidateCardStyle = applyCandidateCardStyle(ballotData.candidateCardStyle || VOTE_BUILDER_DEFAULTS?.builder?.candidateCardStyle || {});
const bannerImage = ballotData.bannerImage || '';
const footerBrandText = ballotData.footerBrandText || 'made with AI by Juan Solo';
const footerBrandLogo = ballotData.footerBrandLogo || '';
const sortMode = ballotData.sortMode || 'builder';
let activeCandidates = [];
let rankings = [];
let voterName = '';

const cardGrid = document.getElementById('cardGrid');
const rankingList = document.getElementById('rankingList');
const rankingZone = document.getElementById('rankingZone');
const unrankZone = document.getElementById('unrankZone');
const namePrompt = document.getElementById('namePrompt');
const voterNameInput = document.getElementById('voterName');
const excludeField = document.getElementById('excludeField');
const excludeSearch = document.getElementById('excludeSearch');
const excludeOptions = document.getElementById('excludeOptions');
const exclusionCombobox = createExclusionCombobox({
  field: excludeField,
  input: excludeSearch,
  options: excludeOptions
});
const rankingView = createRankingResultView({
  rankingList,
  getRankingIds: () => rankings,
  getCandidateById: (candidateId) => activeCandidates.find((entry) => entry.id === candidateId),
  onReorder: (draggedId, targetId) => {
    const fromIndex = rankings.indexOf(draggedId);
    const toIndex = rankings.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return false;
    }
    rankings.splice(fromIndex, 1);
    rankings.splice(toIndex, 0, draggedId);
    return true;
  },
  onDidChange: () => {
    renderGrid();
    updateCompletionState();
  },
  clearDragTargets: [unrankZone]
});

function getExcludedCandidateName() {
  return allowExclusion && excludeSearch ? exclusionCombobox.getValue() : '';
}

function shuffleCandidates(candidateList) {
  const shuffled = [...candidateList];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDisplayCandidates(candidateList) {
  const ordered = [...candidateList];

  if (sortMode === 'alpha') {
    ordered.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } else if (sortMode === 'random') {
    if (candidateOrder.length) {
      const orderMap = new Map(candidateOrder.map((candidateId, index) => [candidateId, index]));
      ordered.sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      return ordered;
    }
    return shuffleCandidates(ordered);
  }

  return ordered;
}

function populateExcludeOptions() {
  if (!allowExclusion) {
    excludeField.hidden = true;
    exclusionCombobox.clear();
    return;
  }

  excludeField.hidden = false;
  exclusionCombobox.setCandidates(activeCandidates);
  exclusionCombobox.hide();
}

function applyActiveCandidatesFromExclusion() {
  const excludedName = getExcludedCandidateName();
  const filteredCandidates = candidates.filter((candidate) => !(allowExclusion && excludedName && candidate.name === excludedName));
  activeCandidates = getDisplayCandidates(filteredCandidates);
  rankings = rankings.filter((candidateId) => activeCandidates.some((candidate) => candidate.id === candidateId));
  populateExcludeOptions();
  renderGrid();
  renderRanking();
  updateCompletionState();
}

function isCompletionSatisfied() {
  const rankingCount = rankings.length;
  if (completionRule.mode === 'at-least-one') {
    return rankingCount >= 1;
  }
  if (completionRule.mode === 'minimum-count') {
    return rankingCount >= (completionRule.count || 1);
  }
  if (completionRule.mode === 'exact-count') {
    return rankingCount === (completionRule.count || 1);
  }
  return rankingCount === activeCandidates.length;
}

function updateCompletionState() {
  const completionButton = actionButtons.submitButton;
  if (!completionButton) return;
  setActionButtonState(completionButton, {
    label: completionLabel,
    disabled: !isCompletionSatisfied()
  });
  completionButton.classList.toggle('action-btn-complete', true);
}

function renderGrid() {
  cardGrid.innerHTML = '';
  activeCandidates.forEach((candidate) => {
    const card = document.createElement('div');
    card.className = 'card candidate-ballot-card';
    const rankedIndex = rankings.indexOf(candidate.id);
    if (rankedIndex !== -1) {
      card.classList.add('ranked');
      card.dataset.rank = String(rankedIndex + 1);
    }
    renderCandidateBallotCard(card, candidate, {
      cardStyle: candidateCardStyle,
      showDescription: true,
      rankPillText: rankedIndex !== -1 ? `Ranked #${rankedIndex + 1}` : ''
    });
    card.draggable = true;
    card.addEventListener('click', () => rankCandidate(candidate.id));
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/votebuilder-source', 'card');
      event.dataTransfer.setData('text/plain', candidate.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      cardGrid.querySelectorAll('.card').forEach((entry) => entry.classList.remove('drag-over'));
    });
    cardGrid.appendChild(card);
  });
}

function renderRanking() {
  rankingView.render();
}

function rankCandidate(candidateId) {
  if (!activeCandidates.some((candidate) => candidate.id === candidateId)) return;
  if (rankings.includes(candidateId)) return;
  rankings.push(candidateId);
  renderRanking();
  renderGrid();
  updateCompletionState();
  maybeScrollToRankingSummary();
}

function removeRankItem(candidateId) {
  rankings = rankings.filter((id) => id !== candidateId);
  renderRanking();
  renderGrid();
  updateCompletionState();
  if (!rankings.length) {
    window.__rankedChoiceAutoScrollTriggered = false;
  }
}

function moveRankItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= rankings.length) return;
  const temp = rankings[index];
  rankings[index] = rankings[targetIndex];
  rankings[targetIndex] = temp;
  renderRanking();
  updateCompletionState();
}

function moveRankItemById(draggedId, targetId) {
  const fromIndex = rankings.indexOf(draggedId);
  const toIndex = rankings.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
  rankings.splice(fromIndex, 1);
  rankings.splice(toIndex, 0, draggedId);
  renderRanking();
  renderGrid();
  updateCompletionState();
}

function undoRank() {
  rankings.pop();
  renderRanking();
  renderGrid();
  updateCompletionState();
  if (!rankings.length) {
    window.__rankedChoiceAutoScrollTriggered = false;
  }
}

function restartRanking() {
  rankings = [];
  renderRanking();
  renderGrid();
  updateCompletionState();
  window.__rankedChoiceAutoScrollTriggered = false;
}

function maybeScrollToRankingSummary() {
  if (!isCompletionSatisfied() || rankings.length === 0) return;
  if (window.__rankedChoiceAutoScrollTriggered) return;
  window.__rankedChoiceAutoScrollTriggered = true;
  const rankingSummary = document.querySelector('h3');
  if (rankingSummary && typeof rankingSummary.scrollIntoView === 'function') {
    rankingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const actionButtons = wireBallotActionButtons({
  onUndo: undoRank,
  onRestart: restartRanking,
  onSubmit: async () => {
  voterName = voterNameInput ? voterNameInput.value.trim() : '';
  if (promptForName && !voterName) {
    alert('Please enter your name before continuing.');
    return;
  }

  if (!isCompletionSatisfied()) {
    alert('The current ranking does not satisfy the configured completion rule.');
    return;
  }
  if (!rankings.length) {
    alert('Rank at least one candidate before submitting.');
    return;
  }
  await deliverBallotOutput({
    outputSettings,
    fallbackOutputSettings: VOTE_BUILDER_DEFAULTS?.builder?.outputSettings || {},
    voterName: includeVoterName ? voterName : '',
    contestTitle,
    rankings: rankings.map((id) => activeCandidates.find((candidate) => candidate.id === id)?.name || '')
  });
  }
});

rankingList.addEventListener('dragover', (event) => {
  event.preventDefault();
  rankingList.classList.add('drag-over');
});
rankingList.addEventListener('dragleave', () => {
  rankingView.clearDragState();
});
rankingList.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  rankingList.classList.remove('drag-over');
  const draggedId = event.dataTransfer.getData('text/plain');
  const dragSource = event.dataTransfer.getData('application/votebuilder-source');
  const targetId = rankingList.dataset.dropTargetId || '';
  rankingList.dataset.dropTargetId = '';

  if (!draggedId) return;

  if (dragSource === 'ranking-item' || rankings.includes(draggedId)) {
    if (targetId && targetId !== draggedId) {
      moveRankItemById(draggedId, targetId);
    }
    return;
  }

  rankCandidate(draggedId);
});

document.addEventListener('drop', (event) => {
  if (event.defaultPrevented) return;
  const draggedId = event.dataTransfer?.getData('text/plain');
  if (!draggedId || !rankings.includes(draggedId)) return;
  if (event.target instanceof Element && event.target.closest('#rankingZone')) return;
  removeRankItem(draggedId);
});

document.addEventListener('dragover', (event) => {
  event.preventDefault();
});

if (unrankZone) {
  unrankZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    unrankZone.classList.add('drag-over');
  });
  unrankZone.addEventListener('dragleave', () => {
    unrankZone.classList.remove('drag-over');
  });
  unrankZone.addEventListener('drop', (event) => {
    event.preventDefault();
    unrankZone.classList.remove('drag-over');
    const draggedId = event.dataTransfer.getData('text/plain');
    if (draggedId) {
      removeRankItem(draggedId);
    }
  });
}

cardGrid.addEventListener('dragover', (event) => {
  event.preventDefault();
  cardGrid.classList.add('drag-over');
});
cardGrid.addEventListener('dragleave', () => {
  cardGrid.classList.remove('drag-over');
});
cardGrid.addEventListener('drop', (event) => {
  event.preventDefault();
  cardGrid.classList.remove('drag-over');
  const draggedId = event.dataTransfer.getData('text/plain');
  if (draggedId) {
    removeRankItem(draggedId);
  }
});

if (namePrompt) {
  namePrompt.hidden = !promptForName;
}

if (excludeSearch) {
  excludeSearch.addEventListener('input', applyActiveCandidatesFromExclusion);
}

applyBallotTheme(ballotTheme);
applyTopbarBanner(bannerImage);
applyBrandFooter(footerBrandText, footerBrandLogo);
applyActiveCandidatesFromExclusion();
