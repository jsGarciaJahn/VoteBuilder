function createInitialStrategyState() {
  return {
    comparedPairs: new Set(),
    pairWinners: new Map()
  };
}

function cloneStrategyState(state) {
  return {
    comparedPairs: new Set(state.comparedPairs),
    pairWinners: new Map(state.pairWinners)
  };
}

function isStrategyComplete(state, activeCandidates) {
  return getTotalPairCount(activeCandidates) > 0 && state.comparedPairs.size >= getTotalPairCount(activeCandidates);
}

function computeNextPairIds(state, activeCandidates) {
  if (activeCandidates.length < 2) return null;
  const unplayed = getUnplayedPairIds(state.comparedPairs, activeCandidates);
  if (!unplayed.length) return null;
  const index = Math.floor(Math.random() * unplayed.length);
  return unplayed[index];
}

function applyStrategyVote(state, { winnerId, pairKey }) {
  state.comparedPairs.add(pairKey);
  state.pairWinners.set(pairKey, winnerId);
}
