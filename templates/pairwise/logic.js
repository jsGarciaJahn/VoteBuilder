const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
const allowExclusion = ballotData.allowExclusion === true;
const promptForName = ballotData.promptForName !== false;
const includeVoterName = ballotData.includeVoterName !== false;
const completionLabel = ballotData.completionLabel || VOTE_BUILDER_DEFAULTS?.builder?.completionLabel || 'Copy results';
const ballotTheme = normalizeBallotTheme(ballotData.ballotTheme || VOTE_BUILDER_DEFAULTS?.builder?.ballotTheme || 'default');
const candidateCardStyle = applyCandidateCardStyle(ballotData.candidateCardStyle || VOTE_BUILDER_DEFAULTS?.builder?.candidateCardStyle || {});
const bannerImage = ballotData.bannerImage || '';
const footerBrandText = ballotData.footerBrandText || 'made with AI by Juan Solo';
const footerBrandLogo = ballotData.footerBrandLogo || '';
let activeCandidates = [...candidates];
let rankings = [];
let finalRankingIds = [];
let currentPairIds = null;
let strategyState = createInitialStrategyState(activeCandidates);
let undoHistory = [];

const matchup = document.getElementById('matchup');
const namePrompt = document.getElementById('namePrompt');
const voterNameInput = document.getElementById('voterName');
const excludeField = document.getElementById('excludeField');
const excludeSearch = document.getElementById('excludeSearch');
const excludeOptions = document.getElementById('excludeOptions');
const rankingZone = document.getElementById('rankingZone');
const rankingList = document.getElementById('rankingList');

const actionButtons = wireBallotActionButtons({
  onUndo: undoLastChoice,
  onRestart: restartChoices,
  onSubmit: handleSubmit
});

const rankingView = createRankingResultView({
  rankingList,
  getRankingIds: () => finalRankingIds,
  getCandidateById: (candidateId) => activeCandidates.find((candidate) => candidate.id === candidateId),
  onReorder: (draggedId, targetId) => {
    const fromIndex = finalRankingIds.indexOf(draggedId);
    const toIndex = finalRankingIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return false;
    }
    finalRankingIds.splice(fromIndex, 1);
    finalRankingIds.splice(toIndex, 0, draggedId);
    return true;
  },
  onDidChange: () => {
    updateControlState();
  }
});

const exclusionCombobox = excludeField && excludeSearch && excludeOptions
  ? createExclusionCombobox({
      field: excludeField,
      input: excludeSearch,
      options: excludeOptions
    })
  : null;

/*__PAIRWISE_STRATEGY_IMPLEMENTATION__*/

function getTotalPairCount(candidateList = activeCandidates) {
  return (candidateList.length * (candidateList.length - 1)) / 2;
}

function getPairKey(leftId, rightId) {
  return leftId < rightId ? `${leftId}::${rightId}` : `${rightId}::${leftId}`;
}

function findNextOpponentForLeader(leaderId, comparedPairs, candidateList = activeCandidates) {
  const candidateById = new Map(candidateList.map((candidate) => [candidate.id, candidate]));
  if (!leaderId || !candidateById.has(leaderId)) return null;

  for (const candidate of candidateList) {
    if (candidate.id === leaderId) continue;
    const pairKey = getPairKey(leaderId, candidate.id);
    if (!comparedPairs.has(pairKey)) {
      return candidate;
    }
  }

  return null;
}

function getUnplayedPairIds(comparedPairs, candidateList = activeCandidates) {
  const unplayed = [];
  for (let leftIndex = 0; leftIndex < candidateList.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidateList.length; rightIndex += 1) {
      const leftId = candidateList[leftIndex].id;
      const rightId = candidateList[rightIndex].id;
      const pairKey = getPairKey(leftId, rightId);
      if (!comparedPairs.has(pairKey)) {
        unplayed.push([leftId, rightId]);
      }
    }
  }
  return unplayed;
}

function refreshCurrentPair() {
  currentPairIds = computeNextPairIds(strategyState, activeCandidates);
}

function getNextPair() {
  if (!Array.isArray(currentPairIds) || currentPairIds.length !== 2) return null;
  const first = activeCandidates.find((candidate) => candidate.id === currentPairIds[0]);
  const second = activeCandidates.find((candidate) => candidate.id === currentPairIds[1]);
  if (!first || !second) return null;
  return [first, second];
}

function isVotingComplete() {
  return isStrategyComplete(strategyState, activeCandidates);
}

function getResultRankingIds() {
  const wins = new Map(activeCandidates.map((candidate) => [candidate.id, 0]));
  rankings.forEach((winnerId) => {
    wins.set(winnerId, (wins.get(winnerId) || 0) + 1);
  });

  return activeCandidates
    .map((candidate, index) => ({
      id: candidate.id,
      wins: wins.get(candidate.id) || 0,
      index
    }))
    .sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }

      const tiePairKey = getPairKey(left.id, right.id);
      const headToHeadWinner = strategyState.pairWinners.get(tiePairKey);
      if (headToHeadWinner === left.id) return -1;
      if (headToHeadWinner === right.id) return 1;

      return left.index - right.index;
    })
    .map((entry) => entry.id);
}

function getExcludedCandidateName() {
  return allowExclusion && exclusionCombobox ? exclusionCombobox.getValue() : '';
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
  rankings = [];
  strategyState = createInitialStrategyState(activeCandidates);
  undoHistory = [];
  finalRankingIds = [];
  refreshCurrentPair();
  renderMatchup();
}

function updateControlState() {
  if (actionButtons.undoButton) {
    actionButtons.undoButton.disabled = rankings.length === 0;
  }
  if (actionButtons.restartButton) {
    actionButtons.restartButton.disabled = rankings.length === 0;
  }
  setActionButtonState(actionButtons.submitButton, {
    label: completionLabel,
    disabled: !isVotingComplete()
  });
  actionButtons.submitButton?.classList.toggle('action-btn-complete', true);
}

function renderMatchup() {
  refreshCurrentPair();
  const pair = getNextPair();
  if (!pair) {
    matchup.classList.remove('pairwise-matchup');
    matchup.innerHTML = '<p>All pairwise matchups are complete.</p>';
    if (!finalRankingIds.length) {
      finalRankingIds = getResultRankingIds();
    }
    if (rankingZone) {
      rankingZone.hidden = false;
      rankingView.render();
    }
    updateControlState();
    return;
  }

  matchup.classList.add('pairwise-matchup');
  if (rankingZone) {
    rankingZone.hidden = true;
  }

  matchup.textContent = '';
  pair.forEach((candidate) => {
    const option = document.createElement('div');
    option.className = 'card tier-card candidate-ballot-card pairwise-option';
    option.dataset.choice = candidate.id;
    option.setAttribute('role', 'button');
    option.tabIndex = 0;
    option.setAttribute('aria-label', `Vote for ${candidate.name}`);
    renderCandidateBallotCard(option, candidate, { cardStyle: candidateCardStyle, showDescription: true });
    matchup.appendChild(option);
  });

  matchup.querySelectorAll('.pairwise-option').forEach((option) => {
    option.addEventListener('click', () => selectWinner(option.dataset.choice));
    option.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectWinner(option.dataset.choice);
      }
    });
  });

  updateControlState();
}

function selectWinner(winnerId) {
  const pair = getNextPair();
  if (!pair) return;
  if (winnerId !== pair[0].id && winnerId !== pair[1].id) return;

  undoHistory.push({
    rankings: [...rankings],
    strategyState: cloneStrategyState(strategyState),
    currentPairIds: Array.isArray(currentPairIds) ? [...currentPairIds] : null,
    finalRankingIds: [...finalRankingIds]
  });

  const pairKey = getPairKey(pair[0].id, pair[1].id);
  const loserId = winnerId === pair[0].id ? pair[1].id : pair[0].id;
  applyStrategyVote(strategyState, {
    pair,
    winnerId,
    loserId,
    pairKey,
    activeCandidates
  });
  rankings.push(winnerId);
  finalRankingIds = [];
  renderMatchup();
}

function undoLastChoice() {
  const previous = undoHistory.pop();
  if (!previous) return;
  rankings = [...previous.rankings];
  strategyState = cloneStrategyState(previous.strategyState);
  currentPairIds = Array.isArray(previous.currentPairIds) ? [...previous.currentPairIds] : null;
  finalRankingIds = [...previous.finalRankingIds];
  renderMatchup();
}

function restartChoices() {
  if (!rankings.length && !isVotingComplete()) return;
  rankings = [];
  strategyState = createInitialStrategyState(activeCandidates);
  undoHistory = [];
  finalRankingIds = [];
  refreshCurrentPair();
  renderMatchup();
}

async function handleSubmit() {
  const voterName = voterNameInput ? voterNameInput.value.trim() : '';
  if (promptForName && !voterName) {
    alert('Please enter your name before continuing.');
    return;
  }

  if (!isVotingComplete()) {
    alert('Complete all pairwise choices before submitting.');
    return;
  }

  const payload = collectPayload(
    includeVoterName ? voterName : '',
    contestTitle,
    finalRankingIds.map((id) => activeCandidates.find((candidate) => candidate.id === id)?.name || '')
  );
  await copyPayload(payload);
}

if (namePrompt) {
  namePrompt.hidden = !promptForName;
}

populateExcludeOptions();

if (excludeSearch) {
  excludeSearch.addEventListener('input', applyActiveCandidatesFromExclusion);
}

applyBallotTheme(ballotTheme);
applyTopbarBanner(bannerImage);
applyBrandFooter(footerBrandText, footerBrandLogo);
applyActiveCandidatesFromExclusion();
