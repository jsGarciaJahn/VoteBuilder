const FALLBACK_BUILDER_DEFAULTS = {
  pairwiseAlgorithm: 'winner-stays',
  completionRuleMode: 'all-ranked',
  completionRuleCount: 1,
  completionLabel: 'Copy results',
  outputSettings: {
    deliveryMethod: 'clipboard',
    contentFormat: 'plain-text',
    fileNameBase: 'ballot_results',
    csvDelimiter: 'comma',
    mailtoTo: '',
    mailtoSubject: 'Ballot results',
    mailtoBodyPrefix: ''
  },
  ballotTheme: 'default',
  candidateCardStyle: {
    variant: 'default',
    autoCycleMs: 4500,
    swipeMs: 420,
    cycleVarianceMs: 900,
    imageHeightPx: 150
  },
  tiers: [
    { label: 'S', color: '#fbbf24' },
    { label: 'A', color: '#f59e0b' },
    { label: 'B', color: '#f97316' },
    { label: 'C', color: '#fb7185' },
    { label: 'D', color: '#f472b6' }
  ]
};

function normalizeBallotTheme(rawTheme) {
  const normalized = String(rawTheme || '').trim().toLowerCase();
  if (normalized === 'dark') return 'dark';
  if (normalized === 'solo') return 'solo';
  if (normalized === 'contrast') return 'dark';
  if (normalized === 'modern') return 'default';
  return 'default';
}

function clampNumber(rawValue, fallbackValue, min, max) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallbackValue;
  return Math.min(max, Math.max(min, value));
}

function normalizeCandidateCardStyle(rawStyle, builderDefaults) {
  const fallbackStyle = {
    ...(FALLBACK_BUILDER_DEFAULTS.candidateCardStyle || {}),
    ...(builderDefaults?.candidateCardStyle || {})
  };

  const variantRaw = String(rawStyle?.variant || fallbackStyle.variant || 'default').trim().toLowerCase();
  const allowedVariants = new Set(['default', 'compact', 'poster', 'minimal']);
  const variant = allowedVariants.has(variantRaw) ? variantRaw : 'default';

  return {
    variant,
    autoCycleMs: Math.round(clampNumber(rawStyle?.autoCycleMs, fallbackStyle.autoCycleMs || 4500, 1800, 15000)),
    swipeMs: Math.round(clampNumber(rawStyle?.swipeMs, fallbackStyle.swipeMs || 420, 180, 900)),
    cycleVarianceMs: Math.round(clampNumber(rawStyle?.cycleVarianceMs, fallbackStyle.cycleVarianceMs || 900, 0, 5000)),
    imageHeightPx: Math.round(clampNumber(rawStyle?.imageHeightPx, fallbackStyle.imageHeightPx || 150, 110, 260))
  };
}

function normalizeOutputSettings(rawSettings, builderDefaults) {
  const fallback = {
    ...(FALLBACK_BUILDER_DEFAULTS.outputSettings || {}),
    ...(builderDefaults?.outputSettings || {})
  };
  const normalizeKey = (value) => String(value || '').trim().toLowerCase();
  const deliveryMethod = normalizeKey(rawSettings?.deliveryMethod || fallback.deliveryMethod || 'clipboard');
  const contentFormat = normalizeKey(rawSettings?.contentFormat || fallback.contentFormat || 'plain-text');
  const csvDelimiter = normalizeKey(rawSettings?.csvDelimiter || fallback.csvDelimiter || 'comma');

  return {
    deliveryMethod: ['clipboard', 'download', 'mailto'].includes(deliveryMethod) ? deliveryMethod : 'clipboard',
    contentFormat: ['plain-text', 'json', 'csv'].includes(contentFormat) ? contentFormat : 'plain-text',
    fileNameBase: String(rawSettings?.fileNameBase || fallback.fileNameBase || 'ballot_results').trim() || 'ballot_results',
    csvDelimiter: ['comma', 'semicolon', 'tab'].includes(csvDelimiter) ? csvDelimiter : 'comma',
    mailtoTo: String(rawSettings?.mailtoTo || fallback.mailtoTo || '').trim(),
    mailtoSubject: String(rawSettings?.mailtoSubject || fallback.mailtoSubject || 'Ballot results').trim() || 'Ballot results',
    mailtoBodyPrefix: String(rawSettings?.mailtoBodyPrefix || fallback.mailtoBodyPrefix || '')
  };
}

function shuffleCandidates(candidateList) {
  const shuffled = [...candidateList];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeHexColor(rawValue, fallbackValue) {
  const value = String(rawValue || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return fallbackValue;
}

function getDefaultTiers(builderDefaults) {
  const defaultTiers = Array.isArray(builderDefaults.tiers) && builderDefaults.tiers.length
    ? builderDefaults.tiers
    : FALLBACK_BUILDER_DEFAULTS.tiers;

  return defaultTiers
    .slice(0, 10)
    .map((tier, index) => ({
      label: String(tier?.label || '').trim() || `Tier ${index + 1}`,
      color: normalizeHexColor(tier?.color, FALLBACK_BUILDER_DEFAULTS.tiers[index % FALLBACK_BUILDER_DEFAULTS.tiers.length].color)
    }));
}

function normalizeTiers(rawTiers, builderDefaults, rawTierLabels, rawTierColors) {
  const defaults = getDefaultTiers(builderDefaults);
  const legacyLabels = Array.isArray(rawTierLabels) ? rawTierLabels : [];
  const legacyColors = Array.isArray(rawTierColors) ? rawTierColors : [];
  const source = Array.isArray(rawTiers) && rawTiers.length
    ? rawTiers
    : legacyLabels.map((label, index) => ({
      label,
      color: legacyColors[index]
    }));
  const normalized = source
    .slice(0, 10)
    .map((tier, index) => {
      const fallback = defaults[index] || { label: `Tier ${index + 1}`, color: FALLBACK_BUILDER_DEFAULTS.tiers[index % FALLBACK_BUILDER_DEFAULTS.tiers.length].color };
      return {
        label: String(tier?.label || '').trim() || fallback.label,
        color: normalizeHexColor(tier?.color, fallback.color)
      };
    });

  while (normalized.length < 2) {
    const index = normalized.length;
    const fallback = defaults[index] || { label: `Tier ${index + 1}`, color: FALLBACK_BUILDER_DEFAULTS.tiers[index % FALLBACK_BUILDER_DEFAULTS.tiers.length].color };
    normalized.push({ label: fallback.label, color: fallback.color });
  }

  return normalized;
}

function deriveTierArrays(tiers) {
  return tiers.reduce((result, tier) => {
    result.labels.push(tier.label);
    result.colors.push(tier.color);
    return result;
  }, { labels: [], colors: [] });
}

export function buildBallotObject(contestTitle, mode, sortMode, allowExclusion, candidates, ballotOptions = {}, defaultsOverride = {}) {
  const builderDefaults = {
    ...FALLBACK_BUILDER_DEFAULTS,
    ...(defaultsOverride || {})
  };
  const promptForName = ballotOptions.promptForName ?? true;
  const includeVoterName = promptForName;
  const tiers = normalizeTiers(ballotOptions.tiers, builderDefaults, ballotOptions.tierLabels, ballotOptions.tierColors);
  const { labels: tierLabels, colors: tierColors } = deriveTierArrays(tiers);
  const defaultCompletionRule = {
    mode: builderDefaults.completionRuleMode || FALLBACK_BUILDER_DEFAULTS.completionRuleMode,
    count: builderDefaults.completionRuleCount || FALLBACK_BUILDER_DEFAULTS.completionRuleCount
  };
  const pairwiseAlgorithm = ballotOptions.pairwiseAlgorithm || builderDefaults.pairwiseAlgorithm || FALLBACK_BUILDER_DEFAULTS.pairwiseAlgorithm;
  const outputSettings = normalizeOutputSettings(ballotOptions.outputSettings || {}, builderDefaults);
  const ballotTheme = normalizeBallotTheme(ballotOptions.ballotTheme || builderDefaults.ballotTheme || FALLBACK_BUILDER_DEFAULTS.ballotTheme);
  const candidateCardStyle = normalizeCandidateCardStyle(ballotOptions.candidateCardStyle || {}, builderDefaults);
  const bannerImage = String(ballotOptions.bannerImage || '').trim();
  const footerBrandText = String(ballotOptions.footerBrandText || 'made with AI by Juan Solo').trim() || 'made with AI by Juan Solo';
  const footerBrandLogo = String(ballotOptions.footerBrandLogo || '').trim();
  const validCandidates = candidates
    .filter((candidate) => candidate.images.length > 0 || (candidate.name || '').trim())
    .map((candidate) => ({ ...candidate }));
  const sortedCandidates = [...validCandidates];

  if (sortMode === 'alpha') {
    sortedCandidates.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } else if (sortMode === 'random') {
    const randomizedCandidates = shuffleCandidates(validCandidates);
    const randomizedOrder = randomizedCandidates.map((candidate) => candidate.id);
    return {
      contestTitle,
      mode,
      sortMode,
      allowExclusion,
      promptForName,
      includeVoterName,
      tiers,
      tierLabels,
      tierColors,
      completionRule: ballotOptions.completionRule || defaultCompletionRule,
      pairwiseAlgorithm,
      outputSettings,
      completionLabel: ballotOptions.completionLabel || builderDefaults.completionLabel || FALLBACK_BUILDER_DEFAULTS.completionLabel,
      ballotTheme,
      candidateCardStyle,
      bannerImage,
      footerBrandText,
      footerBrandLogo,
      candidateOrder: randomizedOrder,
      candidates: randomizedCandidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        description: candidate.description || '',
        images: candidate.images.map((image) => image.b64)
      }))
    };
  }

  return {
    contestTitle,
    mode,
    sortMode,
    allowExclusion,
    promptForName,
    includeVoterName,
    tiers,
    tierLabels,
    tierColors,
    completionRule: ballotOptions.completionRule || defaultCompletionRule,
    pairwiseAlgorithm,
    outputSettings,
    completionLabel: ballotOptions.completionLabel || builderDefaults.completionLabel || FALLBACK_BUILDER_DEFAULTS.completionLabel,
    ballotTheme,
    candidateCardStyle,
    bannerImage,
    footerBrandText,
    footerBrandLogo,
    candidateOrder: sortedCandidates.map((candidate) => candidate.id),
    candidates: sortedCandidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      description: candidate.description || '',
      images: candidate.images.map((image) => image.b64)
    }))
  };
}
