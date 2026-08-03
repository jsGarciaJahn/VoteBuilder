export const CANDIDATE_CARD_STYLE_DEFAULTS = {
  variant: 'default',
  autoCycleMs: 4500,
  swipeMs: 420,
  cycleVarianceMs: 900,
  imageHeightPx: 150
};

const CANDIDATE_CARD_VARIANTS = new Set(['default', 'compact', 'poster', 'minimal']);

function normalizeNumberInRange(rawValue, fallback, min, max) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function normalizeCandidateCardStyle(rawStyle = {}, fallbackStyle = {}) {
  const defaults = {
    ...CANDIDATE_CARD_STYLE_DEFAULTS,
    ...(fallbackStyle || {})
  };
  const variantKey = String(rawStyle?.variant || defaults.variant || CANDIDATE_CARD_STYLE_DEFAULTS.variant).trim().toLowerCase();

  return {
    variant: CANDIDATE_CARD_VARIANTS.has(variantKey) ? variantKey : CANDIDATE_CARD_STYLE_DEFAULTS.variant,
    autoCycleMs: Math.round(normalizeNumberInRange(rawStyle?.autoCycleMs, defaults.autoCycleMs, 1800, 15000)),
    swipeMs: Math.round(normalizeNumberInRange(rawStyle?.swipeMs, defaults.swipeMs, 180, 900)),
    cycleVarianceMs: Math.round(normalizeNumberInRange(rawStyle?.cycleVarianceMs, defaults.cycleVarianceMs, 0, 5000)),
    imageHeightPx: Math.round(normalizeNumberInRange(rawStyle?.imageHeightPx, defaults.imageHeightPx, 110, 260))
  };
}