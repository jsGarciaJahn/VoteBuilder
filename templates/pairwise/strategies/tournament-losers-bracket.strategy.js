function createInitialStrategyState(activeCandidates) {
  const ids = activeCandidates.map((candidate) => candidate.id);
  return {
    phase: 'winners',
    winnersQueue: [...ids],
    winnersNext: [],
    losersQueue: [],
    losersNext: [],
    winnersChampion: '',
    losersChampion: '',
    championId: ids.length === 1 ? ids[0] : '',
    finalRound: 0,
    done: ids.length < 2,
    eliminatedIds: [],
    finalRankingIds: ids.length < 2 ? [...ids] : [],
    pairWinners: new Map()
  };
}

function cloneStrategyState(state) {
  return {
    phase: state.phase,
    winnersQueue: [...state.winnersQueue],
    winnersNext: [...state.winnersNext],
    losersQueue: [...state.losersQueue],
    losersNext: [...state.losersNext],
    winnersChampion: state.winnersChampion,
    losersChampion: state.losersChampion,
    championId: state.championId,
    finalRound: state.finalRound,
    done: state.done,
    eliminatedIds: [...state.eliminatedIds],
    finalRankingIds: [...state.finalRankingIds],
    pairWinners: new Map(state.pairWinners)
  };
}

function finalizeTournamentRanking(state, championId, activeCandidates) {
  const champion = String(championId || '').trim();
  if (!champion) {
    state.finalRankingIds = [];
    return;
  }

  state.championId = champion;
  const seen = new Set([champion]);
  const ordered = [champion];

  [...state.eliminatedIds].reverse().forEach((candidateId) => {
    if (!candidateId || seen.has(candidateId)) return;
    seen.add(candidateId);
    ordered.push(candidateId);
  });

  activeCandidates.forEach((candidate) => {
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      ordered.push(candidate.id);
    }
  });

  state.finalRankingIds = ordered;
}

function getStrategyRankingIds(state, activeCandidates) {
  if (!state.done) return [];
  if (Array.isArray(state.finalRankingIds) && state.finalRankingIds.length === activeCandidates.length) {
    return [...state.finalRankingIds];
  }
  if (activeCandidates.length <= 1) {
    return activeCandidates.map((candidate) => candidate.id);
  }
  return [];
}

function isStrategyComplete(state) {
  return state.done === true;
}

function computeNextPairIds(state, activeCandidates) {
  if (activeCandidates.length < 2 || state.done) return null;

  for (let step = 0; step < 16; step += 1) {
    if (state.phase === 'winners') {
      if (state.winnersQueue.length >= 2) {
        return [state.winnersQueue[0], state.winnersQueue[1]];
      }

      if (state.winnersQueue.length === 1) {
        state.winnersNext.push(state.winnersQueue.shift());
      }

      if (state.winnersQueue.length === 0) {
        if (state.winnersNext.length > 1) {
          state.winnersQueue = state.winnersNext.splice(0);
          continue;
        }

        if (state.winnersNext.length === 1) {
          state.winnersChampion = state.winnersNext.shift();
          state.phase = 'losers';
          continue;
        }

        state.done = true;
        return null;
      }
    }

    if (state.phase === 'losers') {
      state.losersQueue = state.losersQueue.filter((id) => id !== state.winnersChampion);
      state.losersNext = state.losersNext.filter((id) => id !== state.winnersChampion);

      if (state.losersQueue.length >= 2) {
        return [state.losersQueue[0], state.losersQueue[1]];
      }

      if (state.losersQueue.length === 1) {
        state.losersNext.push(state.losersQueue.shift());
      }

      if (state.losersQueue.length === 0) {
        if (state.losersNext.length > 1) {
          state.losersQueue = state.losersNext.splice(0);
          continue;
        }

        if (state.losersNext.length === 1) {
          state.losersChampion = state.losersNext.shift();
          if (!state.winnersChampion || !state.losersChampion || state.winnersChampion === state.losersChampion) {
            state.done = true;
            return null;
          }
          state.phase = 'grand-final';
          state.finalRound = 0;
          return [state.winnersChampion, state.losersChampion];
        }

        state.done = true;
        return null;
      }
    }

    if (state.phase === 'grand-final') {
      if (state.done) return null;
      return [state.winnersChampion, state.losersChampion];
    }
  }

  return null;
}

function applyStrategyVote(state, { winnerId, pairKey, activeCandidates }) {
  state.pairWinners.set(pairKey, winnerId);

  if (state.phase === 'winners') {
    const contenderA = state.winnersQueue.shift();
    const contenderB = state.winnersQueue.shift();
    if (contenderA && contenderB) {
      const loserId = winnerId === contenderA ? contenderB : contenderA;
      state.winnersNext.push(winnerId);
      state.losersQueue.push(loserId);
    }
    return;
  }

  if (state.phase === 'losers') {
    const contenderA = state.losersQueue.shift();
    const contenderB = state.losersQueue.shift();
    if (contenderA && contenderB) {
      const loserId = winnerId === contenderA ? contenderB : contenderA;
      state.losersNext.push(winnerId);
      state.eliminatedIds.push(loserId);
    }
    return;
  }

  if (state.phase === 'grand-final') {
    if (state.finalRound === 0 && winnerId === state.winnersChampion) {
      state.eliminatedIds.push(state.losersChampion);
      finalizeTournamentRanking(state, state.winnersChampion, activeCandidates);
      state.done = true;
    } else if (state.finalRound === 0 && winnerId === state.losersChampion) {
      state.finalRound = 1;
    } else {
      const runnerUpId = winnerId === state.winnersChampion ? state.losersChampion : state.winnersChampion;
      state.eliminatedIds.push(runnerUpId);
      finalizeTournamentRanking(state, winnerId, activeCandidates);
      state.done = true;
    }
  }
}
