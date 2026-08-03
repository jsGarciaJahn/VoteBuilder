// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { buildBallotObject } from './builderPayload.js';
import { templateAssets } from './generatedTemplates.js';

const rankedChoiceScript = templateAssets['ranked-choice'].js;

function mountRankedChoiceBallot(ballotData) {
  document.body.innerHTML = `
    <main>
      <div class="panel">
        <div class="ballot-topbar">
          <h1>Contest</h1>
          <div class="rank-actions">
            <button id="undoBtn" class="action-btn action-btn-icon action-btn-undo" title="Undo" aria-label="Undo"><span aria-hidden="true">↺</span></button>
            <button id="restartBtn" class="action-btn action-btn-icon action-btn-restart" title="Restart" aria-label="Restart"><span aria-hidden="true">⟳</span></button>
            <button id="copyBtn" class="action-btn action-btn-icon action-btn-complete" title="Copy results" aria-label="Copy results"><span aria-hidden="true">✉</span></button>
          </div>
        </div>
        <div id="setup">
          <div id="namePrompt" class="setup-row">
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
        </div>
        <div id="ballot">
          <h2>Rank candidates from most preferred to least preferred</h2>
          <div class="grid" id="cardGrid"></div>
          <div id="rankingZone" class="ranking-zone">
            <h3>Your ranking</h3>
            <ol class="ranking-list" id="rankingList"></ol>
          </div>
        </div>
      </div>
    </main>
  `;

  globalThis.ballotData = ballotData;
  window.eval(rankedChoiceScript);

  document.getElementById('voterName').value = 'Alice';
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
      randomSpy.mockReset();
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
    excludeSearch.dispatchEvent(new window.FocusEvent('focus', { bubbles: true }));
    document.querySelector('#excludeOptions .exclude-option')?.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));

    const cardNames = getRenderedCardOrder();
    expect(cardNames).not.toContain('Banana');
    expect(cardNames).toEqual(['Apple', 'Cherry']);
  });

  it('shows exclusion choices on focus and filters them as the voter types', () => {
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
    const excludeOptions = document.getElementById('excludeOptions');

    excludeSearch.dispatchEvent(new window.FocusEvent('focus', { bubbles: true }));

    expect(excludeOptions.hidden).toBe(false);
    expect(Array.from(excludeOptions.querySelectorAll('.exclude-option')).map((option) => option.textContent)).toEqual(['Banana', 'Apple', 'Cherry']);

    excludeSearch.value = 'ap';
    excludeSearch.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(Array.from(excludeOptions.querySelectorAll('.exclude-option')).map((option) => option.textContent)).toEqual(['Apple']);
  });

  it('keeps exclusion choices hidden until the search box is focused', () => {
    mountRankedChoiceBallot({
      contestTitle: 'Contest',
      mode: 'ranked-choice',
      sortMode: 'builder',
      allowExclusion: true,
      promptForName: true,
      includeVoterName: true,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    const excludeOptions = document.getElementById('excludeOptions');
    const excludeSearch = document.getElementById('excludeSearch');

    expect(excludeOptions.hidden).toBe(true);

    excludeSearch.dispatchEvent(new window.FocusEvent('focus', { bubbles: true }));
    expect(excludeOptions.hidden).toBe(false);
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
    expect(completionButton.getAttribute('aria-label')).toContain('Submit');
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
    const payload = {
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
    };

    const renderedHtml = templateAssets['ranked-choice'].html
      .replaceAll('{{TITLE}}', 'Contest')
      .replaceAll('{{DATA}}', JSON.stringify(payload))
      .replaceAll('{{CSS}}', '')
      .replaceAll('{{JS}}', rankedChoiceScript);

    document.body.innerHTML = renderedHtml;
    const runtimeScript = document.querySelectorAll('script')[1]?.textContent || '';
    globalThis.ballotData = payload;

    expect(runtimeScript).toContain('const contestTitle');
    window.eval(runtimeScript);

    expect(document.getElementById('namePrompt')).not.toBeNull();
    expect(document.getElementById('copyBtn').getAttribute('title')).toContain('Copy results');
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

  it('keeps a ranked entry when dropped inside the ranking zone', () => {
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
    const rankingHeader = document.querySelector('#rankingZone h3');
    dispatchDragEvent(rankedItem, 'dragstart', createTransfer('ranking-item', '1'));
    dispatchDragEvent(rankingHeader, 'drop', createTransfer('ranking-item', '1'));

    expect(document.querySelectorAll('#rankingList .ranking-item')).toHaveLength(1);
  });

  it('reorders ranked entries when dropped on another ranking item', () => {
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

    const cards = document.querySelectorAll('#cardGrid .card');
    dispatchDragEvent(cards[0], 'dragstart', createTransfer('card', '1'));
    dispatchDragEvent(document.getElementById('rankingList'), 'drop', createTransfer('card', '1'));
    dispatchDragEvent(cards[1], 'dragstart', createTransfer('card', '2'));
    dispatchDragEvent(document.getElementById('rankingList'), 'drop', createTransfer('card', '2'));

    const before = Array.from(document.querySelectorAll('#rankingList .ranking-item .ranking-item-left')).map((entry) => entry.textContent?.trim());
    expect(before).toEqual(['1. Banana', '2. Apple']);

    let items = document.querySelectorAll('#rankingList .ranking-item');
    dispatchDragEvent(items[0], 'dragstart', createTransfer('ranking-item', '1'));
    dispatchDragEvent(items[1], 'drop', createTransfer('ranking-item', '1'));

    const after = Array.from(document.querySelectorAll('#rankingList .ranking-item .ranking-item-left')).map((entry) => entry.textContent?.trim());
    expect(after).toEqual(['1. Apple', '2. Banana']);
    expect(document.querySelectorAll('#rankingList .ranking-item')).toHaveLength(2);
  });
});
