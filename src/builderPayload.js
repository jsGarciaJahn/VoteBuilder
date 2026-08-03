export function buildBallotObject(contestTitle, mode, sortMode, allowExclusion, candidates) {
  const validCandidates = candidates.filter((candidate) => candidate.images.length > 0).map((candidate) => ({ ...candidate }));
  const sortedCandidates = [...validCandidates];

  if (sortMode === 'alpha') {
    sortedCandidates.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } else if (sortMode === 'random') {
    for (let i = sortedCandidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedCandidates[i], sortedCandidates[j]] = [sortedCandidates[j], sortedCandidates[i]];
    }
  }

  return {
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
  };
}
