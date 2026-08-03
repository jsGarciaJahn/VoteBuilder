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