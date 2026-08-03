export function buildBallotObject(contestTitle, mode, sortMode, allowExclusion, candidates, ballotOptions = {}) {
  const validCandidates = candidates.filter((candidate) => candidate.images.length > 0).map((candidate) => ({ ...candidate }));
  const sortedCandidates = [...validCandidates];

  if (sortMode === 'alpha') {
    sortedCandidates.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  return {
    contestTitle,
    mode,
    sortMode,
    allowExclusion,
    promptForName: ballotOptions.promptForName ?? true,
    includeVoterName: ballotOptions.includeVoterName ?? true,
    candidates: sortedCandidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      description: candidate.description || '',
      images: candidate.images.map((image) => image.b64)
    }))
  };
}
