const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
const tiers = ['S', 'A', 'B', 'C', 'D'];
const assignment = {};
let voterName = '';

const setup = document.getElementById('setup');
const ballot = document.getElementById('ballot');
const tierList = document.getElementById('tierList');
const cardGrid = document.getElementById('cardGrid');

function renderTiers() {
  tierList.innerHTML = '';
  tiers.forEach((tier) => {
    const item = document.createElement('div');
    item.className = 'tier-item';
    item.innerHTML = `<strong>${tier}</strong><div>${(assignment[tier] || []).join(', ') || 'No candidates assigned'}</div>`;
    tierList.appendChild(item);
  });
}

function renderGrid() {
  cardGrid.innerHTML = '';
  candidates.forEach((candidate) => {
    const card = document.createElement('div');
    card.className = 'card';
    const image = candidate.images[0] || '';
    card.innerHTML = `
      <img src="${image}" alt="${escapeHtml(candidate.name)}" />
      <strong>${escapeHtml(candidate.name)}</strong>
      <div>
        ${tiers.map((tier) => `<button data-tier="${tier}" data-id="${candidate.id}">${tier}</button>`).join(' ')}
      </div>
    `;
    card.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => assignCandidate(candidate.id, button.dataset.tier));
    });
    cardGrid.appendChild(card);
  });
}

function assignCandidate(candidateId, tier) {
  Object.keys(assignment).forEach((currentTier) => {
    assignment[currentTier] = (assignment[currentTier] || []).filter((entry) => entry !== candidateId);
  });
  assignment[tier] = assignment[tier] || [];
  if (!assignment[tier].includes(candidateId)) {
    assignment[tier].push(candidateId);
  }
  renderTiers();
}

function startVoting() {
  voterName = document.getElementById('voterName').value.trim();
  if (!voterName) {
    alert('Please enter your name before continuing.');
    return;
  }
  setup.hidden = true;
  ballot.hidden = false;
  renderGrid();
  renderTiers();
}

document.getElementById('startBtn').addEventListener('click', startVoting);
document.getElementById('copyBtn').addEventListener('click', async () => {
  const payload = collectPayload(voterName, contestTitle, Object.entries(assignment).flatMap(([tier, ids]) => ids.map((id) => `${tier}: ${candidates.find((candidate) => candidate.id === id)?.name || ''}`)));
  await copyPayload(payload);
});

renderGrid();
