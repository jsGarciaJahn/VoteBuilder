const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
const allowExclusion = ballotData.allowExclusion === true;
const promptForName = ballotData.promptForName !== false;
const includeVoterName = ballotData.includeVoterName !== false;
const sortMode = ballotData.sortMode || 'builder';
let activeCandidates = [];
let rankings = [];
let voterName = '';

const setup = document.getElementById('setup');
const ballot = document.getElementById('ballot');
const cardGrid = document.getElementById('cardGrid');
const rankingList = document.getElementById('rankingList');
const unrankZone = document.getElementById('unrankZone');
const namePrompt = document.getElementById('namePrompt');
const voterNameInput = document.getElementById('voterName');
const excludeLabel = document.getElementById('excludeLabel');
const excludeSearch = document.getElementById('excludeSearch');
const excludeOptions = document.getElementById('excludeOptions');

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
    return shuffleCandidates(ordered);
  }

  return ordered;
}

function populateExcludeOptions() {
  if (!allowExclusion) {
    excludeLabel.hidden = true;
    excludeSearch.hidden = true;
    excludeSearch.value = '';
    excludeOptions.innerHTML = '';
    return;
  }

  excludeLabel.hidden = false;
  excludeSearch.hidden = false;
  excludeOptions.innerHTML = '';
  activeCandidates.forEach((candidate) => {
    const option = document.createElement('option');
    option.value = candidate.name;
    excludeOptions.appendChild(option);
  });
}

function renderGrid() {
  cardGrid.innerHTML = '';
  activeCandidates.forEach((candidate) => {
    const card = document.createElement('div');
    card.className = 'card';
    const rankedIndex = rankings.indexOf(candidate.id);
    if (rankedIndex !== -1) {
      card.classList.add('ranked');
      card.dataset.rank = String(rankedIndex + 1);
    }
    const image = candidate.images[0] || '';
    card.innerHTML = `
      <img src="${image}" alt="${escapeHtml(candidate.name)}" />
      <strong>${escapeHtml(candidate.name)}</strong>
      <p>${escapeHtml(candidate.description || '')}</p>
      ${rankedIndex !== -1 ? `<div class="rank-pill">Ranked #${rankedIndex + 1}</div>` : ''}
    `;
    card.addEventListener('click', () => rankCandidate(candidate.id));
    cardGrid.appendChild(card);
  });
}

function renderRanking() {
  rankingList.innerHTML = '';
  rankings.forEach((candidateId, index) => {
    const candidate = activeCandidates.find((entry) => entry.id === candidateId);
    if (!candidate) return;
    const item = document.createElement('li');
    item.className = 'ranking-item';
    item.draggable = true;
    item.dataset.id = candidateId;

    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', candidateId);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      rankingList.querySelectorAll('.ranking-item').forEach((entry) => entry.classList.remove('drag-over'));
      unrankZone.classList.remove('drag-over');
    });

    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drag-over');
      const draggedId = event.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === candidateId) return;
      moveRankItemById(draggedId, candidateId);
    });

    const left = document.createElement('div');
    left.className = 'ranking-item-left';
    left.textContent = `${index + 1}. ${candidate.name}`;

    const controls = document.createElement('div');
    controls.className = 'ranking-controls';

    const upButton = document.createElement('button');
    upButton.className = 'btn-mini';
    upButton.textContent = '▲';
    upButton.disabled = index === 0;
    upButton.addEventListener('click', () => moveRankItem(index, -1));

    const downButton = document.createElement('button');
    downButton.className = 'btn-mini';
    downButton.textContent = '▼';
    downButton.disabled = index === rankings.length - 1;
    downButton.addEventListener('click', () => moveRankItem(index, 1));

    const removeButton = document.createElement('button');
    removeButton.className = 'btn-mini';
    removeButton.textContent = '✕';
    removeButton.addEventListener('click', () => removeRankItem(candidateId));

    controls.appendChild(upButton);
    controls.appendChild(downButton);
    controls.appendChild(removeButton);

    item.appendChild(left);
    item.appendChild(controls);
    rankingList.appendChild(item);
  });
}

function rankCandidate(candidateId) {
  if (!activeCandidates.some((candidate) => candidate.id === candidateId)) return;
  if (rankings.includes(candidateId)) return;
  rankings.push(candidateId);
  renderRanking();
  renderGrid();
}

function removeRankItem(candidateId) {
  rankings = rankings.filter((id) => id !== candidateId);
  renderRanking();
  renderGrid();
}

function moveRankItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= rankings.length) return;
  const temp = rankings[index];
  rankings[index] = rankings[targetIndex];
  rankings[targetIndex] = temp;
  renderRanking();
}

function moveRankItemById(draggedId, targetId) {
  const fromIndex = rankings.indexOf(draggedId);
  const toIndex = rankings.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
  rankings.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex : toIndex;
  rankings.splice(insertAt, 0, draggedId);
  renderRanking();
  renderGrid();
}

function undoRank() {
  rankings.pop();
  renderRanking();
  renderGrid();
}

function restartRanking() {
  rankings = [];
  renderRanking();
  renderGrid();
}

function startVoting() {
  voterName = voterNameInput ? voterNameInput.value.trim() : '';
  if (promptForName && !voterName) {
    alert('Please enter your name before continuing.');
    return;
  }

  const excludedName = allowExclusion && excludeSearch ? excludeSearch.value.trim() : '';
  const filteredCandidates = candidates.filter((candidate) => !(allowExclusion && excludedName && candidate.name === excludedName));
  activeCandidates = getDisplayCandidates(filteredCandidates);
  rankings = [];
  setup.hidden = true;
  ballot.hidden = false;
  populateExcludeOptions();
  renderGrid();
  renderRanking();
}

document.getElementById('startBtn').addEventListener('click', startVoting);
document.getElementById('undoBtn').addEventListener('click', undoRank);
document.getElementById('restartBtn').addEventListener('click', restartRanking);
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!rankings.length) {
    alert('Rank at least one candidate before copying.');
    return;
  }
  const payload = collectPayload(
    includeVoterName ? voterName : '',
    contestTitle,
    rankings.map((id) => activeCandidates.find((candidate) => candidate.id === id)?.name || '')
  );
  await copyPayload(payload);
});

rankingList.addEventListener('dragover', (event) => event.preventDefault());
rankingList.addEventListener('drop', (event) => {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData('text/plain');
  if (!draggedId || rankings.includes(draggedId)) return;
});

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

cardGrid.addEventListener('dragover', (event) => event.preventDefault());
cardGrid.addEventListener('drop', (event) => {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData('text/plain');
  if (draggedId) {
    removeRankItem(draggedId);
  }
});

if (namePrompt) {
  namePrompt.hidden = !promptForName;
}

activeCandidates = getDisplayCandidates(candidates);
populateExcludeOptions();
renderGrid();
