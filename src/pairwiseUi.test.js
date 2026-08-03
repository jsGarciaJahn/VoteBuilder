// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { pairwiseStrategyImplementations, templateAssets } from './generatedTemplates.js';

const pairwiseScriptTemplate = templateAssets.pairwise.js;

function getPairwiseScript(ballotData) {
  const selectedAlgorithm = ballotData?.pairwiseAlgorithm || 'winner-stays';
  const strategyImplementation = pairwiseStrategyImplementations[selectedAlgorithm]
    || pairwiseStrategyImplementations['winner-stays']
    || '';
  return pairwiseScriptTemplate.replace('/*__PAIRWISE_STRATEGY_IMPLEMENTATION__*/', strategyImplementation);
}

function mountPairwiseBallot(ballotData) {
  document.body.innerHTML = `
    <main>
      <div class="panel">
        <div class="ballot-topbar">
          <h1>Contest</h1>
          <div class="rank-actions">
            <button id="undoBtn" class="action-btn action-btn-icon action-btn-undo" title="Undo" aria-label="Undo"><span aria-hidden="true">↺</span></button>
            <button id="restartBtn" class="action-btn action-btn-icon action-btn-restart" title="Restart" aria-label="Restart"><span aria-hidden="true">⟳</span></button>
            <button id="copyBtn" class="action-btn action-btn-icon action-btn-complete" title="Submit" aria-label="Submit"><span aria-hidden="true">✉</span></button>
          </div>
        </div>
        <div id="ballot">
          <div id="namePrompt" class="setup-row" hidden>
            <label for="voterName">Your name</label>
            <div class="setup-control">
              <input id="voterName" type="text" placeholder="Enter your name" />
            </div>
          </div>
          <div id="excludeField" class="exclude-field setup-row" hidden>
            <label for="excludeSearch" id="excludeLabel">Choose your entry</label>
            <div class="setup-control">
              <input id="excludeSearch" type="text" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="excludeOptions" />
              <div id="excludeOptions" class="exclude-options" role="listbox" hidden></div>
            </div>
          </div>
          <h2>Choose your favorite in each matchup</h2>
          <div id="matchup"></div>
          <div id="rankingZone" class="ranking-zone" hidden>
            <h3>Your ranking</h3>
            <ol class="ranking-list" id="rankingList"></ol>
          </div>
        </div>
      </div>
    </main>
  `;

  globalThis.ballotData = ballotData;
  window.eval(getPairwiseScript(ballotData));
}

describe('pairwise ballot controls', () => {
  it('uses topbar controls and enables submit only after voting is complete', () => {
    mountPairwiseBallot({
      contestTitle: 'Contest',
      mode: 'pairwise',
      promptForName: false,
      completionLabel: 'Submit results',
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    const submitButton = document.getElementById('copyBtn');
    const undoButton = document.getElementById('undoBtn');
    const restartButton = document.getElementById('restartBtn');

    expect(submitButton.disabled).toBe(true);
    expect(undoButton.disabled).toBe(true);
    expect(restartButton.disabled).toBe(true);
    expect(submitButton.title).toBe('Submit results');
    expect(new Set(Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice)).size).toBe(2);

    document.querySelector('#matchup .pairwise-option[data-choice="1"]').click();
    expect(undoButton.disabled).toBe(false);
    expect(restartButton.disabled).toBe(false);
    expect(submitButton.disabled).toBe(true);
    expect(new Set(Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice)).size).toBe(2);

    document.querySelector('#matchup .pairwise-option[data-choice="1"]').click();
    expect(submitButton.disabled).toBe(true);
    expect(new Set(Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice)).size).toBe(2);

    document.querySelector('#matchup .pairwise-option[data-choice="2"]').click();
    expect(submitButton.disabled).toBe(false);

    expect(document.getElementById('rankingZone').hidden).toBe(false);
    const rankedNames = Array.from(document.querySelectorAll('#rankingList .ranking-item .ranking-item-left')).map((entry) => entry.textContent?.replace(/^\d+\.\s*/, '').trim());
    expect(rankedNames).toEqual(['Banana', 'Apple', 'Cherry']);
  });

  it('supports undo and restart actions', () => {
    mountPairwiseBallot({
      contestTitle: 'Contest',
      mode: 'pairwise',
      promptForName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    document.querySelector('#matchup .pairwise-option[data-choice="1"]').click();
    expect(document.getElementById('copyBtn').disabled).toBe(false);

    document.getElementById('undoBtn').click();
    expect(document.getElementById('copyBtn').disabled).toBe(true);

    document.querySelector('#matchup .pairwise-option[data-choice="1"]').click();
    document.getElementById('restartBtn').click();
    expect(document.getElementById('copyBtn').disabled).toBe(true);
    expect(document.querySelector('#matchup .pairwise-option[data-choice="1"]')).not.toBeNull();
  });

  it('supports excluding one candidate from pairwise comparisons', () => {
    mountPairwiseBallot({
      contestTitle: 'Contest',
      mode: 'pairwise',
      allowExclusion: true,
      promptForName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    const excludeField = document.getElementById('excludeField');
    const excludeSearch = document.getElementById('excludeSearch');
    expect(excludeField.hidden).toBe(false);

    excludeSearch.value = 'Apple';
    excludeSearch.dispatchEvent(new Event('input', { bubbles: true }));

    const choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices.sort()).toEqual(['1', '3']);

    document.querySelector('#matchup .pairwise-option[data-choice="1"]').click();
    expect(document.getElementById('rankingZone').hidden).toBe(false);
    expect(document.getElementById('copyBtn').disabled).toBe(false);
  });

  it('keeps the winner in the next matchup until their pairings are exhausted', () => {
    mountPairwiseBallot({
      contestTitle: 'Contest',
      mode: 'pairwise',
      promptForName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] },
        { id: '4', name: 'Date', description: '', images: [{ b64: 'data:image/jpeg;base64,DDD' }] }
      ]
    });

    let choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices).toEqual(['1', '2']);

    document.querySelector('#matchup .pairwise-option[data-choice="2"]').click();

    choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices).toEqual(['2', '3']);

    document.querySelector('#matchup .pairwise-option[data-choice="2"]').click();

    choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices).toEqual(['2', '4']);
  });

  it('supports loser-stays sequencing when configured', () => {
    mountPairwiseBallot({
      contestTitle: 'Contest',
      mode: 'pairwise',
      pairwiseAlgorithm: 'loser-stays',
      promptForName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    let choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices).toEqual(['1', '2']);

    document.querySelector('#matchup .pairwise-option[data-choice="2"]').click();

    choices = Array.from(document.querySelectorAll('#matchup .pairwise-option')).map((entry) => entry.dataset.choice);
    expect(choices).toEqual(['1', '3']);
  });
});
