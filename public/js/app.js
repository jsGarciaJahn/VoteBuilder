import { templateAssets } from '../../src/generatedTemplates.js';

const state = {
  imagePool: [],
  candidates: [],
  draggedImageId: null,
  draggedCandidateId: null
};

const refs = {
  contestTitle: document.getElementById('contestTitle'),
  votingMode: document.getElementById('votingMode'),
  sortMode: document.getElementById('sortMode'),
  enableExclusion: document.getElementById('enableExclusion'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  imagePool: document.getElementById('imagePool'),
  createCandidateZone: document.getElementById('createCandidateZone'),
  candidatesList: document.getElementById('candidatesList'),
  generateBtn: document.getElementById('generateBtn'),
  autoCreateBtn: document.getElementById('autoCreateBtn'),
  addCandidateBtn: document.getElementById('addCandidateBtn')
};

refs.dropZone.addEventListener('click', () => refs.fileInput.click());
refs.fileInput.addEventListener('change', (event) => handleFiles(Array.from(event.target.files || [])));
refs.generateBtn.addEventListener('click', generateBallot);
refs.autoCreateBtn.addEventListener('click', autoCreateCandidates);
refs.addCandidateBtn.addEventListener('click', () => addCandidate());

['dragenter', 'dragover'].forEach((eventName) => {
  refs.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  refs.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.dropZone.classList.remove('drag-over');
  });
});

refs.dropZone.addEventListener('drop', (event) => handleFiles(Array.from(event.dataTransfer?.files || [])));

['dragenter', 'dragover'].forEach((eventName) => {
  refs.createCandidateZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.createCandidateZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  refs.createCandidateZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    refs.createCandidateZone.classList.remove('drag-over');
  });
});

refs.createCandidateZone.addEventListener('drop', () => createCandidateFromDraggedImage());

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
  return candidate;
}

function autoCreateCandidates() {
  if (!state.imagePool.length) {
    alert('No images are available in the pool yet.');
    return;
  }

  const poolImages = [...state.imagePool];
  poolImages.forEach((image) => {
    const candidate = addCandidate(image.name, '');
    if (candidate) {
      candidate.images.push(image);
    }
  });

  state.imagePool = [];
  renderPool();
  renderCandidates();
}

function renderPool() {
  refs.imagePool.innerHTML = '';
  if (!state.imagePool.length) {
    refs.imagePool.innerHTML = '<p>No images yet.</p>';
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
}

function renderCandidates() {
  refs.candidatesList.innerHTML = '';
  if (!state.candidates.length) {
    refs.candidatesList.innerHTML = '<p>No candidates yet. Add one manually or drag images into the image pool.</p>';
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
        <button class="danger small" data-action="remove" data-id="${candidate.id}">Remove</button>
      </div>
      <textarea data-field="description" data-id="${candidate.id}">${candidate.description || ''}</textarea>
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
}

function createCandidateFromDraggedImage() {
  if (!state.draggedImageId) return;
  const image = extractImage(state.draggedImageId);
  if (!image) return;
  const candidate = addCandidate(image.name, '');
  if (candidate) {
    candidate.images.push(image);
  }
  state.draggedImageId = null;
  renderPool();
  renderCandidates();
}

function returnImageToPool() {
  if (!state.draggedImageId) return;
  const image = extractImage(state.draggedImageId);
  if (!image) return;
  state.imagePool.push(image);
  state.draggedImageId = null;
  renderPool();
  renderCandidates();
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

function generateBallot() {
  const contestTitle = refs.contestTitle.value.trim() || 'Beauty Contest';
  const mode = refs.votingMode.value;
  const sortMode = refs.sortMode?.value || 'builder';
  const validCandidates = state.candidates.filter((candidate) => candidate.images.length > 0).map((candidate) => ({ ...candidate }));
  const allowExclusion = refs.enableExclusion.checked;

  if (!validCandidates.length) {
    alert('Add at least one candidate with an image before generating a ballot.');
    return;
  }

  const sortedCandidates = [...validCandidates];
  if (sortMode === 'alpha') {
    sortedCandidates.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  const ballotData = JSON.stringify({
    contestTitle,
    mode,
    sortMode,
    allowExclusion,
    candidates: sortedCandidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      description: candidate.description || '',
      images: candidate.images.map((image) => image.b64)
    }))
  });

  const asset = templateAssets[mode];
  const html = asset.html
    .replaceAll('{{TITLE}}', escapeHtml(contestTitle))
    .replaceAll('{{DATA}}', ballotData)
    .replaceAll('{{CSS}}', asset.css)
    .replaceAll('{{JS}}', asset.js);

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${contestTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'ballot'}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

renderPool();
renderCandidates();
