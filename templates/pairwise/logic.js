const contestTitle = ballotData.contestTitle || 'Contest';
const candidates = ballotData.candidates || [];
let voterName = '';
let rankings = [];
let currentPair = [];

const setup = document.getElementById('setup');
const ballot = document.getElementById('ballot');
const matchup = document.getElementById('matchup');

function getNextPair() {
  if (candidates.length < 2) return null;
  const remaining = candidates.filter((candidate) => !rankings.includes(candidate.id));
  if (!remaining.length) return null;
  const first = remaining[0];
  const second = remaining[1] || remaining[0];
  return [first, second];
}

function renderMatchup() {
  const pair = getNextPair();
  if (!pair) {
    matchup.innerHTML = '<p>All pairwise matchups are complete.</p>';
    return;
  }
  currentPair = pair;
  matchup.innerHTML = `
    <div class="card">
      <img src="${pair[0].images[0] || ''}" alt="${escapeHtml(pair[0].name)}" />
      <strong>${escapeHtml(pair[0].name)}</strong>
      <button data-choice="${pair[0].id}">Choose this option</button>
    </div>
    <div class="card">
      <img src="${pair[1].images[0] || ''}" alt="${escapeHtml(pair[1].name)}" />
      <strong>${escapeHtml(pair[1].name)}</strong>
      <button data-choice="${pair[1].id}">Choose this option</button>
    </div>
  `;
  matchup.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => selectWinner(button.dataset.choice));
  });
}

function selectWinner(winnerId) {
  rankings.push(winnerId);
  renderMatchup();
}

function startVoting() {
  voterName = document.getElementById('voterName').value.trim();
  if (!voterName) {
    alert('Please enter your name before continuing.');
    return;
  }
  setup.hidden = true;
  ballot.hidden = false;
  renderMatchup();
}

document.getElementById('startBtn').addEventListener('click', startVoting);
document.getElementById('copyBtn').addEventListener('click', async () => {
  const payload = collectPayload(voterName, contestTitle, rankings.map((id) => candidates.find((candidate) => candidate.id === id)?.name || ''));
  await copyPayload(payload);
});

renderMatchup();
