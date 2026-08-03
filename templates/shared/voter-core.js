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

function normalizeBallotTheme(rawTheme) {
  const normalized = String(rawTheme || '').trim().toLowerCase();
  if (normalized === 'dark') return 'dark';
  if (normalized === 'solo') return 'solo';
  if (normalized === 'contrast') return 'dark';
  if (normalized === 'modern') return 'default';
  return 'default';
}

function applyBallotTheme(rawTheme) {
  const theme = normalizeBallotTheme(rawTheme);
  document.body.classList.remove('theme-dark', 'theme-solo', 'theme-modern', 'theme-contrast');
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  } else if (theme === 'solo') {
    document.body.classList.add('theme-solo');
  }
  return theme;
}

function normalizeCandidateCardStyle(rawStyle) {
  const variantRaw = String(rawStyle?.variant || 'default').trim().toLowerCase();
  const allowedVariants = new Set(['default', 'compact', 'poster', 'minimal']);
  const variant = allowedVariants.has(variantRaw) ? variantRaw : 'default';

  const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  return {
    variant,
    autoCycleMs: Math.round(clamp(toNumber(rawStyle?.autoCycleMs, 4500), 1800, 15000)),
    swipeMs: Math.round(clamp(toNumber(rawStyle?.swipeMs, 420), 180, 900)),
    cycleVarianceMs: Math.round(clamp(toNumber(rawStyle?.cycleVarianceMs, 900), 0, 5000)),
    imageHeightPx: Math.round(clamp(toNumber(rawStyle?.imageHeightPx, 150), 110, 260))
  };
}

function applyCandidateCardStyle(rawStyle) {
  const style = normalizeCandidateCardStyle(rawStyle);
  document.body.classList.remove('candidate-card-variant-default', 'candidate-card-variant-compact', 'candidate-card-variant-poster', 'candidate-card-variant-minimal');
  document.body.classList.add(`candidate-card-variant-${style.variant}`);
  document.body.style.setProperty('--candidate-card-image-height', `${style.imageHeightPx}px`);
  document.body.style.setProperty('--candidate-card-swipe-ms', `${style.swipeMs}ms`);
  return style;
}

function hashString(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function applyTopbarBanner(rawBannerImage) {
  const topbar = document.querySelector('.ballot-topbar');
  if (!topbar) return;

  const bannerImage = String(rawBannerImage || '').trim();
  if (!bannerImage.startsWith('data:image/')) {
    topbar.classList.remove('has-banner');
    topbar.style.removeProperty('background-image');
    topbar.style.removeProperty('background-size');
    topbar.style.removeProperty('background-position');
    topbar.style.removeProperty('background-repeat');
    return;
  }

  topbar.classList.add('has-banner');
  topbar.style.backgroundImage = `linear-gradient(90deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.28)), url(${bannerImage})`;
  topbar.style.backgroundSize = 'cover';
  topbar.style.backgroundPosition = 'center';
  topbar.style.backgroundRepeat = 'no-repeat';
}

function applyBrandFooter(rawText, rawLogoData) {
  const footerText = document.getElementById('ballotFooterText');
  const footerLogo = document.getElementById('ballotFooterLogo');
  const text = String(rawText || '').trim() || 'made with AI by Juan Solo';
  const logoData = String(rawLogoData || '').trim();

  if (footerText) {
    footerText.textContent = text;
  }

  if (!footerLogo) return;
  if (logoData.startsWith('data:image/')) {
    footerLogo.src = logoData;
    footerLogo.hidden = false;
  } else {
    footerLogo.removeAttribute('src');
    footerLogo.hidden = true;
  }
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

function normalizeCandidateImageSource(imageValue) {
  if (typeof imageValue === 'string') {
    return imageValue.trim();
  }
  if (imageValue && typeof imageValue === 'object' && typeof imageValue.b64 === 'string') {
    return imageValue.b64.trim();
  }
  return '';
}

function getCandidateImageSources(candidate) {
  if (!candidate || !Array.isArray(candidate.images)) return [];
  return candidate.images
    .map((image) => normalizeCandidateImageSource(image))
    .filter(Boolean);
}

function renderCandidateBallotCard(cardElement, candidate, options = {}) {
  if (!cardElement || !candidate) return;

  const cardStyle = normalizeCandidateCardStyle(options.cardStyle || {});
  const showDescription = options.showDescription === true;
  const isCompactVariant = cardStyle.variant === 'compact';
  const isMinimalVariant = cardStyle.variant === 'minimal';
  const rankPillText = typeof options.rankPillText === 'string' ? options.rankPillText.trim() : '';
  const autoCycleMs = Number.isFinite(options.autoCycleMs)
    ? Math.max(1800, Number(options.autoCycleMs))
    : cardStyle.autoCycleMs;
  const cycleVarianceMs = Math.max(0, Number.isFinite(cardStyle.cycleVarianceMs) ? cardStyle.cycleVarianceMs : 0);
  const imageSources = getCandidateImageSources(candidate);
  const fallbackSource = imageSources[0] || '';
  const descriptionText = String(candidate.description || '').trim();
  const titleText = String(candidate.name || 'Candidate').trim() || 'Candidate';
  const titleScrollThresholdPx = 12;

  cardElement.classList.add('candidate-ballot-card');
  cardElement.textContent = '';
  cardElement.removeAttribute('title');
  cardElement.removeAttribute('data-description');
  if (isCompactVariant && descriptionText) {
    cardElement.dataset.description = descriptionText;
    cardElement.title = descriptionText;
  }

  const media = document.createElement('div');
  media.className = 'candidate-media';

  const mediaViewport = document.createElement('div');
  mediaViewport.className = 'candidate-media-viewport';
  media.appendChild(mediaViewport);

  const mediaTrack = document.createElement('div');
  mediaTrack.className = 'candidate-media-track';
  mediaViewport.appendChild(mediaTrack);

  const sourcesToRender = imageSources.length > 0 ? imageSources : [fallbackSource];
  sourcesToRender.forEach((source) => {
    const frame = document.createElement('div');
    frame.className = 'candidate-media-frame';
    const image = document.createElement('img');
    image.alt = String(candidate.name || 'Candidate');
    image.src = source;
    image.draggable = false;
    frame.appendChild(image);
    mediaTrack.appendChild(frame);
  });

  if (imageSources.length > 1) {
    const controls = document.createElement('div');
    controls.className = 'candidate-media-controls';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'candidate-media-btn';
    prevButton.setAttribute('aria-label', `Show previous image for ${candidate.name}`);
    prevButton.textContent = '<';

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'candidate-media-btn';
    nextButton.setAttribute('aria-label', `Show next image for ${candidate.name}`);
    nextButton.textContent = '>';

    controls.appendChild(prevButton);
    controls.appendChild(nextButton);
    media.appendChild(controls);

    let currentIndex = 0;
    let cycleInterval = null;
    let cycleTimeout = null;
    const initialDelayMs = cycleVarianceMs > 0 ? hashString(candidate.id || candidate.name || '') % cycleVarianceMs : 0;
    const showImageAt = (nextIndex) => {
      const wrappedIndex = ((nextIndex % imageSources.length) + imageSources.length) % imageSources.length;
      currentIndex = wrappedIndex;
      mediaTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    };

    const restartAutoCycle = () => {
      if (cycleTimeout !== null) {
        window.clearTimeout(cycleTimeout);
        cycleTimeout = null;
      }
      if (cycleInterval !== null) {
        window.clearInterval(cycleInterval);
        cycleInterval = null;
      }
      const startCycle = () => {
        if (!cardElement.isConnected) return;
        cycleInterval = window.setInterval(() => {
          if (!cardElement.isConnected) {
            window.clearInterval(cycleInterval);
            cycleInterval = null;
            return;
          }
          showImageAt(currentIndex + 1);
        }, autoCycleMs);
      };

      if (initialDelayMs > 0) {
        cycleTimeout = window.setTimeout(() => {
          cycleTimeout = null;
          startCycle();
        }, initialDelayMs);
      } else {
        startCycle();
      }
    };

    const captureControlEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    prevButton.addEventListener('mousedown', captureControlEvent);
    nextButton.addEventListener('mousedown', captureControlEvent);

    prevButton.addEventListener('click', (event) => {
      captureControlEvent(event);
      showImageAt(currentIndex - 1);
      restartAutoCycle();
    });

    nextButton.addEventListener('click', (event) => {
      captureControlEvent(event);
      showImageAt(currentIndex + 1);
      restartAutoCycle();
    });

    showImageAt(0);
    restartAutoCycle();
  }

  if (isCompactVariant && imageSources.length > 0) {
    const overlay = document.createElement('div');
    overlay.className = 'candidate-media-overlay';

    const titlePill = document.createElement('strong');
    titlePill.className = 'candidate-title-pill';

    const titleTextSpan = document.createElement('span');
    titleTextSpan.className = 'candidate-title-text';
    titleTextSpan.textContent = titleText;
    titlePill.appendChild(titleTextSpan);
    overlay.appendChild(titlePill);

    if (rankPillText) {
      const compactRankPill = document.createElement('span');
      compactRankPill.className = 'candidate-compact-rank-pill rank-pill';
      compactRankPill.textContent = rankPillText;
      overlay.appendChild(compactRankPill);
    }

    media.appendChild(overlay);

    const updateCompactTitleScroll = () => {
      if (!cardElement.isConnected) return;
      const textWidth = titleTextSpan.scrollWidth;
      const availableWidth = Math.max(0, titlePill.clientWidth - 2);
      const overflow = Math.max(0, textWidth - availableWidth);
      if (overflow > titleScrollThresholdPx) {
        const scrollDistance = Math.ceil(overflow);
        const scrollDuration = Math.max(4, Math.min(10, scrollDistance / 24));
        titlePill.classList.add('is-scrolling');
        titlePill.style.setProperty('--candidate-title-scroll-distance', `${scrollDistance}px`);
        titlePill.style.setProperty('--candidate-title-scroll-duration', `${scrollDuration}s`);
      } else {
        titlePill.classList.remove('is-scrolling');
        titlePill.style.removeProperty('--candidate-title-scroll-distance');
        titlePill.style.removeProperty('--candidate-title-scroll-duration');
      }
    };

    if (typeof window.ResizeObserver === 'function') {
      const titleObserver = new ResizeObserver(() => updateCompactTitleScroll());
      titleObserver.observe(titlePill);
      titleObserver.observe(cardElement);
      window.setTimeout(() => {
        if (!cardElement.isConnected) {
          titleObserver.disconnect();
          return;
        }
        updateCompactTitleScroll();
      }, 0);
    } else {
      window.requestAnimationFrame(() => updateCompactTitleScroll());
    }
  }

  cardElement.appendChild(media);

  if ((!isMinimalVariant && !isCompactVariant) || imageSources.length === 0) {
    const content = document.createElement('div');
    content.className = 'candidate-content';

    const name = document.createElement('strong');
    name.className = 'candidate-name';
    name.textContent = String(candidate.name || 'Candidate');
    content.appendChild(name);

    if (showDescription && !isMinimalVariant && !isCompactVariant) {
      const description = document.createElement('p');
      description.className = 'candidate-description';
      description.textContent = String(candidate.description || '');
      content.appendChild(description);
    }

    if (rankPillText && !isMinimalVariant && !isCompactVariant) {
      const rankPill = document.createElement('div');
      rankPill.className = 'rank-pill';
      rankPill.textContent = rankPillText;
      content.appendChild(rankPill);
    }

    cardElement.appendChild(content);
  }
}
