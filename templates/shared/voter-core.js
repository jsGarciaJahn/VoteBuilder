function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectPayload(voterName, contestTitle, rankings) {
  const lines = [`VOTER: ${voterName}`, `CONTEST: ${contestTitle}`, ''];
  rankings.forEach((entry, index) => lines.push(`${index + 1}. ${entry}`));
  return lines.join('\n');
}

async function copyPayload(payload) {
  try {
    await navigator.clipboard.writeText(payload);
    alert('Copied to clipboard!\n\n' + payload);
  } catch {
    alert('Copy failed.\n\n' + payload);
  }
}

function setActionButtonState(button, { label, disabled }) {
  if (!button) return;
  button.disabled = Boolean(disabled);
  if (typeof label === 'string' && label.length > 0) {
    if (button.classList.contains('action-btn-icon')) {
      button.title = label;
      button.setAttribute('aria-label', label);
    } else {
      button.textContent = label;
    }
  }
}

function wireBallotActionButtons({ onUndo, onRestart, onSubmit }) {
  const undoButton = document.getElementById('undoBtn');
  const restartButton = document.getElementById('restartBtn');
  const submitButton = document.getElementById('copyBtn');

  if (undoButton && typeof onUndo === 'function') {
    undoButton.addEventListener('click', onUndo);
  }

  if (restartButton && typeof onRestart === 'function') {
    restartButton.addEventListener('click', onRestart);
  }

  if (submitButton && typeof onSubmit === 'function') {
    submitButton.addEventListener('click', onSubmit);
  }

  return {
    undoButton,
    restartButton,
    submitButton
  };
}

function createExclusionCombobox({ field, input, options }) {
  let candidates = [];

  function hide() {
    options.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function getMatches() {
    const query = input.value.trim().toLowerCase();
    return candidates.filter((candidate) => candidate.name.toLowerCase().includes(query));
  }

  function render({ open = false } = {}) {
    const matches = getMatches();
    options.innerHTML = '';

    matches.forEach((candidate) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'exclude-option';
      option.setAttribute('role', 'option');
      option.textContent = candidate.name;
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        input.value = candidate.name;
        hide();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      options.appendChild(option);
    });

    const shouldOpen = open && matches.length > 0;
    options.hidden = !shouldOpen;
    input.setAttribute('aria-expanded', String(shouldOpen));
  }

  function setCandidates(nextCandidates) {
    candidates = Array.isArray(nextCandidates) ? [...nextCandidates] : [];
    render({ open: false });
  }

  function clear() {
    input.value = '';
    hide();
  }

  function getValue() {
    return input.value.trim();
  }

  input.addEventListener('focus', () => render({ open: true }));
  input.addEventListener('click', () => render({ open: true }));
  input.addEventListener('input', () => render({ open: true }));
  input.addEventListener('blur', () => {
    window.setTimeout(hide, 100);
  });

  if (field.hidden) {
    hide();
  }

  return {
    setCandidates,
    clear,
    hide,
    getValue
  };
}

function createRankingResultView({
  rankingList,
  getRankingIds,
  getCandidateById,
  onReorder,
  onDidChange,
  clearDragTargets = []
}) {
  if (!rankingList) {
    return {
      render() {},
      clearDragState() {}
    };
  }

  function clearDragState() {
    rankingList.classList.remove('drag-over');
    rankingList.querySelectorAll('.ranking-item').forEach((entry) => entry.classList.remove('drag-over'));
    clearDragTargets.forEach((target) => target?.classList.remove('drag-over'));
  }

  function render() {
    const rankingIds = Array.isArray(getRankingIds?.()) ? getRankingIds() : [];
    rankingList.innerHTML = '';

    rankingIds.forEach((candidateId, index) => {
      const candidate = getCandidateById?.(candidateId);
      if (!candidate) return;

      const item = document.createElement('li');
      item.className = 'ranking-item';
      item.draggable = true;
      item.dataset.id = candidateId;

      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/votebuilder-source', 'ranking-item');
        event.dataTransfer.setData('text/plain', candidateId);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        clearDragState();
      });

      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        item.classList.add('drag-over');
        rankingList.dataset.dropTargetId = candidateId;
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        item.classList.remove('drag-over');
        const draggedId = event.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === candidateId) return;
        const didReorder = onReorder?.(draggedId, candidateId);
        if (didReorder !== false) {
          render();
          onDidChange?.();
        }
      });

      const left = document.createElement('div');
      left.className = 'ranking-item-left';
      left.textContent = `${index + 1}. ${candidate.name}`;

      const dragHandle = document.createElement('span');
      dragHandle.className = 'drag-handle';
      dragHandle.textContent = '⋮⋮';
      dragHandle.setAttribute('aria-label', 'Drag to reorder');

      item.appendChild(dragHandle);
      item.appendChild(left);
      rankingList.appendChild(item);
    });
  }

  return {
    render,
    clearDragState
  };
}
