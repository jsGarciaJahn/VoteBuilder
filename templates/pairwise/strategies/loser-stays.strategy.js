function createInitialStrategyState(activeCandidates) {
  return {
    currentLeaderId: activeCandidates[0]?.id || '',
    comparedPairs: new Set(),
    pairWinners: new Map()
  };
}

function cloneStrategyState(state) {
  return {
    currentLeaderId: state.currentLeaderId,
    comparedPairs: new Set(state.comparedPairs),
    pairWinners: new Map(state.pairWinners)
  };
}

function isStrategyComplete(state, activeCandidates) {
  return getTotalPairCount(activeCandidates) > 0 && state.comparedPairs.size >= getTotalPairCount(activeCandidates);
}

function computeNextPairIds(state, activeCandidates) {
  if (activeCandidates.length < 2 || isStrategyComplete(state, activeCandidates)) return null;

  const candidateById = new Map(activeCandidates.map((candidate) => [candidate.id, candidate]));
  if (!candidateById.has(state.currentLeaderId)) {
    state.currentLeaderId = activeCandidates[0].id;
  }

  const directOpponent = findNextOpponentForLeader(state.currentLeaderId, state.comparedPairs, activeCandidates);
  if (directOpponent) {
    return [state.currentLeaderId, directOpponent.id];
  }

  for (const candidate of activeCandidates) {
    const fallbackOpponent = findNextOpponentForLeader(candidate.id, state.comparedPairs, activeCandidates);
    if (fallbackOpponent) {
      state.currentLeaderId = candidate.id;
      return [candidate.id, fallbackOpponent.id];
    }
  }

  return null;
}

function applyStrategyVote(state, { pair, winnerId, pairKey }) {
  const loserId = winnerId === pair[0].id ? pair[1].id : pair[0].id;
  state.comparedPairs.add(pairKey);
  state.pairWinners.set(pairKey, winnerId);
  state.currentLeaderId = loserId;
}
