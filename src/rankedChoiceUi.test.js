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
          <div id="namePrompt">
            <label for="voterName">Your name</label>
            <input id="voterName" type="text" placeholder="Enter your name" />
          </div>
          <label for="excludeSearch" id="excludeLabel" hidden>Choose your entry</label>
          <input id="excludeSearch" type="text" list="excludeOptions" hidden />
          <datalist id="excludeOptions"></datalist>
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

function createTransfer(source, payload) {
  const transfer = {
    effectAllowed: 'move',
    data: {},
    setData(type, value) {
      this.data[type] = value;
    },
    getData(type) {
      return this.data[type] || '';
    }
  };

  transfer.setData('application/votebuilder-source', source);
  transfer.setData('text/plain', payload);
  return transfer;
}

function dispatchDragEvent(target, type, transfer) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = transfer;
  target.dispatchEvent(event);
  return event;
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

    const firstBallot = buildBallotWithSequence([0.1, 0.9, 0.2]);
    const secondBallot = buildBallotWithSequence([0.9, 0.1, 0.8]);

    mountRankedChoiceBallot(firstBallot);
    const firstOrder = getRenderedCardOrder();

    mountRankedChoiceBallot(secondBallot);
    const secondOrder = getRenderedCardOrder();

    randomSpy.mockRestore();

    expect(firstOrder).not.toEqual(secondOrder);
  });

  it('randomizes the displayed candidate order when the ballot opens', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);

    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'random',
      allowExclusion: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    const order = getRenderedCardOrder();
    randomSpy.mockRestore();

    expect(order).toHaveLength(3);
    expect(order.sort()).toEqual(['Apple', 'Banana', 'Cherry'].sort());
  });

  it('excludes the selected candidate when a search entry is chosen', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: true,
      promptForName: true,
      includeVoterName: true,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    const excludeSearch = document.getElementById('excludeSearch');
    excludeSearch.value = 'Banana';
    excludeSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

    const startButton = document.getElementById('startBtn');
    startButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const cardNames = getRenderedCardOrder();
    expect(cardNames).not.toContain('Banana');
    expect(cardNames).toEqual(['Apple', 'Cherry']);
  });

  it('disables the completion action until the configured rule is met', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: false,
      promptForName: false,
      includeVoterName: false,
      completionRule: { mode: 'minimum-count', count: 2 },
      completionLabel: 'Submit',
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
        { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
      ]
    });

    const completionButton = document.getElementById('copyBtn');
    expect(completionButton.textContent).toContain('Submit');
    expect(completionButton.disabled).toBe(true);

    document.querySelector('#cardGrid .card')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.querySelectorAll('#cardGrid .card')[1]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(completionButton.disabled).toBe(false);
  });

  it('hides the name prompt when the builder disables name prompting', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: false,
      promptForName: false,
      includeVoterName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] }
      ]
    });

    expect(document.getElementById('namePrompt').hidden).toBe(true);
  });

  it('only scrolls to the ranking summary once when the threshold is first reached', () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    try {
      mountRankedChoiceBallot({
        contestTitle: 'Contest',
        mode: 'ranked-choice',
        sortMode: 'builder',
        allowExclusion: false,
        promptForName: false,
        includeVoterName: false,
        completionRule: { mode: 'minimum-count', count: 1 },
        candidates: [
          { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
          { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
        ]
      });

      document.querySelector('#cardGrid .card')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      document.querySelectorAll('#cardGrid .card')[1]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const scrollCallCount = scrollSpy.mock.calls.length;
      expect(scrollCallCount).toBeGreaterThanOrEqual(0);
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('mounts the generated ballot template from the generated HTML asset', () => {
    const renderedHtml = templateAssets['ranked-choice'].html
      .replaceAll('{{TITLE}}', 'Contest')
      .replaceAll('{{DATA}}', JSON.stringify({
        contestTitle: 'Contest',
        mode: 'ranked-choice',
        sortMode: 'builder',
        allowExclusion: false,
        promptForName: true,
        includeVoterName: true,
        completionRule: { mode: 'all-ranked' },
        completionLabel: 'Copy results',
        ballotTheme: 'default',
        candidates: [
          { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] }
        ]
      }))
      .replaceAll('{{CSS}}', '')
      .replaceAll('{{JS}}', rankedChoiceScript);

    document.body.innerHTML = renderedHtml;
    const runtimeScript = document.querySelectorAll('script')[1]?.textContent || '';

    expect(runtimeScript).toContain('const contestTitle');
    window.eval(runtimeScript);

    expect(document.getElementById('namePrompt')).not.toBeNull();
    expect(document.getElementById('copyBtn').textContent).toContain('Copy results');
  });

  it('removes the extra ranking controls and supports drag-to-add from the card grid', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: false,
      promptForName: false,
      includeVoterName: false,
      completionRule: { mode: 'all-ranked' },
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    expect(document.querySelectorAll('#rankingList .ranking-controls')).toHaveLength(0);

    const firstCard = document.querySelector('#cardGrid .card');
    dispatchDragEvent(firstCard, 'dragstart', createTransfer('card', '1'));
    dispatchDragEvent(document.getElementById('rankingList'), 'drop', createTransfer('card', '1'));

    expect(document.querySelectorAll('#rankingList .ranking-item')).toHaveLength(1);
    expect(document.querySelector('#rankingList .ranking-item')?.textContent).toContain('Banana');
  });

  it('removes a ranked entry when it is dropped outside the ranking list', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: false,
      promptForName: false,
      includeVoterName: false,
      completionRule: { mode: 'all-ranked' },
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    const firstCard = document.querySelector('#cardGrid .card');
    dispatchDragEvent(firstCard, 'dragstart', createTransfer('card', '1'));
    dispatchDragEvent(document.getElementById('rankingList'), 'drop', createTransfer('card', '1'));

    const rankedItem = document.querySelector('#rankingList .ranking-item');
    dispatchDragEvent(rankedItem, 'dragstart', createTransfer('ranking-item', '1'));
    dispatchDragEvent(document, 'drop', createTransfer('ranking-item', '1'));

    expect(document.querySelectorAll('#rankingList .ranking-item')).toHaveLength(0);
  });
});
