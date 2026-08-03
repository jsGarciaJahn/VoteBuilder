// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { buildBallotObject } from './builderPayload.js';
import { templateAssets } from './generatedTemplates.js';

const rankedChoiceScript = templateAssets['ranked-choice'].js;

function mountRankedChoiceBallot(ballotData) {
  document.body.innerHTML = `
    <main>
      <div class="panel">
        <h1>Contest</h1>
        <div id="setup">
          <label for="voterName">Your name</label>
          <input id="voterName" type="text" placeholder="Enter your name" />
          <label class="toggle-row" id="excludeToggleRow" hidden>
            <input id="excludeToggle" type="checkbox" />
            Exclude my entry from ranking
          </label>
          <label for="excludeSelect" id="excludeLabel" hidden>Choose your entry</label>
          <select id="excludeSelect" hidden></select>
          <button id="startBtn">Start ranking</button>
        </div>
        <div id="ballot" hidden>
          <h2>Rank candidates from most preferred to least preferred</h2>
          <div class="rank-actions">
            <button id="undoBtn">Undo last pick</button>
            <button id="restartBtn">Restart ranking</button>
          </div>
          <div class="grid" id="cardGrid"></div>
          <h3>Your ranking</h3>
          <ol class="ranking-list" id="rankingList"></ol>
          <div id="unrankZone" class="remove-drop-zone">Drag here to remove a ranking and make the candidate eligible again</div>
          <button id="copyBtn">Copy results</button>
        </div>
      </div>
    </main>
  `;

  globalThis.ballotData = ballotData;
  window.eval(rankedChoiceScript);

  document.getElementById('voterName').value = 'Alice';
  document.getElementById('startBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function getRenderedCardOrder() {
  return Array.from(document.querySelectorAll('#cardGrid .card')).map((card) => card.querySelector('strong')?.textContent?.trim());
}

describe('ranked-choice ballot UI', () => {
  it('renders a different candidate order in the ballot UI when random ordering changes', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const candidates = [
      { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
      { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
      { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
    ];

    const buildBallotWithSequence = (randomValues) => {
      randomValues.forEach((value) => randomSpy.mockReturnValueOnce(value));
      return buildBallotObject('Contest', 'ranked-choice', 'random', false, candidates);
    };

    const firstBallot = buildBallotWithSequence([0, 0.9]);
    const secondBallot = buildBallotWithSequence([0.9, 0.1]);

    mountRankedChoiceBallot(firstBallot);
    const firstOrder = getRenderedCardOrder();

    mountRankedChoiceBallot(secondBallot);
    const secondOrder = getRenderedCardOrder();

    randomSpy.mockRestore();

    expect(firstOrder).not.toEqual(secondOrder);
  });
});
