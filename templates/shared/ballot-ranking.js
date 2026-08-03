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