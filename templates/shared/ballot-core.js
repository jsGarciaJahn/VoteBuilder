function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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