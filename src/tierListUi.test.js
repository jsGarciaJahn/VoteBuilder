// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { templateAssets } from './generatedTemplates.js';

const tierListScript = templateAssets['tier-list'].js;

function mountTierListBallot(ballotData) {
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
          <h2>Assign each candidate to a tier</h2>
          <div class="tier-list" id="tierList"></div>
          <h3>Available candidates</h3>
          <div class="grid tier-candidate-grid" id="cardGrid"></div>
        </div>
      </div>
    </main>
  `;

  globalThis.ballotData = ballotData;
  window.eval(tierListScript);
}

function createTransfer(candidateId) {
  return {
    effectAllowed: 'move',
    payload: { 'text/plain': candidateId },
    setData(type, value) {
      this.payload[type] = value;
    },
    getData(type) {
      return this.payload[type] || '';
    }
  };
}

function dispatchDragEvent(target, type, transfer) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = transfer;
  target.dispatchEvent(event);
}

describe('tier-list ballot UI', () => {
  it('renders configured tier labels after voting starts', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: false,
      tiers: [
        { label: 'God', color: '#112233' },
        { label: 'Great', color: '#445566' },
        { label: 'Good', color: '#778899' }
      ],
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] }
      ]
    });

    const labels = Array.from(document.querySelectorAll('#tierList .tier-item strong')).map((entry) => entry.textContent?.trim());
    expect(labels).toEqual(['God', 'Great', 'Good']);
    const tierItems = Array.from(document.querySelectorAll('#tierList .tier-item'));
    expect(tierItems[0].dataset.tierColor).toBe('#112233');
    expect(tierItems[1].dataset.tierColor).toBe('#445566');
    expect(tierItems[2].dataset.tierColor).toBe('#778899');
  });

  it('assigns a candidate to a tier when dropped onto that tier', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: false,
      tiers: [{ label: 'S', color: '#112233' }, { label: 'A', color: '#445566' }],
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    const card = document.querySelector('#cardGrid .card[data-id="1"]');
    const targetTier = document.querySelector('#tierList .tier-item[data-tier="A"]');

    dispatchDragEvent(card, 'dragstart', createTransfer('1'));
    dispatchDragEvent(targetTier, 'drop', createTransfer('1'));

    const updatedTier = document.querySelector('#tierList .tier-item[data-tier="A"]');
    expect(updatedTier.textContent).toContain('Banana');
    expect(document.querySelector('#cardGrid .card[data-id="1"]')).toBeNull();
    expect(document.getElementById('copyBtn').disabled).toBe(true);
  });

  it('supports undo and restart controls for tier assignments', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: false,
      tiers: [{ label: 'S', color: '#112233' }, { label: 'A', color: '#445566' }],
      completionRule: { mode: 'at-least-one' },
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    const card = document.querySelector('#cardGrid .card[data-id="1"]');
    const targetTier = document.querySelector('#tierList .tier-item[data-tier="S"]');

    dispatchDragEvent(card, 'dragstart', createTransfer('1'));
    dispatchDragEvent(targetTier, 'drop', createTransfer('1'));

    expect(document.querySelector('#tierList .tier-item[data-tier="S"]').textContent).toContain('Banana');
    expect(document.getElementById('copyBtn').disabled).toBe(false);

    document.getElementById('undoBtn').click();
    expect(document.querySelector('#tierList .tier-item[data-tier="S"]').textContent).not.toContain('Banana');
    expect(document.querySelector('#cardGrid .card[data-id="1"]')).not.toBeNull();

    dispatchDragEvent(document.querySelector('#cardGrid .card[data-id="1"]'), 'dragstart', createTransfer('1'));
    dispatchDragEvent(document.querySelector('#tierList .tier-item[data-tier="S"]'), 'drop', createTransfer('1'));
    document.getElementById('restartBtn').click();

    expect(document.querySelector('#tierList .tier-item[data-tier="S"]').textContent).not.toContain('Banana');
    expect(document.querySelector('#cardGrid .card[data-id="1"]')).not.toBeNull();
  });

  it('reorders candidates within the same tier by dropping onto another card', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: false,
      tiers: [{ label: 'S', color: '#112233' }, { label: 'A', color: '#445566' }],
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
        { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
      ]
    });

    dispatchDragEvent(document.querySelector('#cardGrid .card[data-id="1"]'), 'dragstart', createTransfer('1'));
    dispatchDragEvent(document.querySelector('#tierList .tier-item[data-tier="S"]'), 'drop', createTransfer('1'));
    dispatchDragEvent(document.querySelector('#cardGrid .card[data-id="2"]'), 'dragstart', createTransfer('2'));
    dispatchDragEvent(document.querySelector('#tierList .tier-item[data-tier="S"]'), 'drop', createTransfer('2'));

    let order = Array.from(document.querySelectorAll('#tierList .tier-item[data-tier="S"] .tier-assigned-card strong')).map((entry) => entry.textContent?.trim());
    expect(order).toEqual(['Banana', 'Apple']);

    dispatchDragEvent(document.querySelector('#tierList .tier-item[data-tier="S"] .tier-assigned-card[data-id="2"]'), 'dragstart', createTransfer('2'));
    dispatchDragEvent(document.querySelector('#tierList .tier-item[data-tier="S"] .tier-assigned-card[data-id="1"]'), 'drop', createTransfer('2'));

    order = Array.from(document.querySelectorAll('#tierList .tier-item[data-tier="S"] .tier-assigned-card strong')).map((entry) => entry.textContent?.trim());
    expect(order).toEqual(['Apple', 'Banana']);
  });

  it('moves an assigned candidate back to the available pool when dropped on the pool', () => {
      mountTierListBallot({
        contestTitle: 'Contest',
        mode: 'tier-list',
        promptForName: false,
        tiers: [{ label: 'S', color: '#112233' }, { label: 'A', color: '#445566' }],
        completionRule: { mode: 'all-ranked' },
        candidates: [
          { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
          { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] }
        ]
      });

      const card = document.querySelector('#cardGrid .card[data-id="1"]');
      const targetTier = document.querySelector('#tierList .tier-item[data-tier="S"]');
      const pool = document.getElementById('cardGrid');

      dispatchDragEvent(card, 'dragstart', createTransfer('1'));
      dispatchDragEvent(targetTier, 'drop', createTransfer('1'));

      let tierAfterAssign = document.querySelector('#tierList .tier-item[data-tier="S"]');
      expect(tierAfterAssign.textContent).toContain('Banana');
      expect(document.querySelector('#cardGrid .card[data-id="1"]')).toBeNull();

      const assignedCard = document.querySelector('.tier-assigned-card[data-id="1"]');
      dispatchDragEvent(assignedCard, 'dragstart', createTransfer('1'));
      dispatchDragEvent(pool, 'drop', createTransfer('1'));

      tierAfterAssign = document.querySelector('#tierList .tier-item[data-tier="S"]');
      expect(tierAfterAssign.textContent).not.toContain('Banana');
      expect(document.querySelector('#cardGrid .card[data-id="1"]')).not.toBeNull();
  });

  it('shows or hides name prompt based on promptForName configuration', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: true,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] }
      ]
    });

    expect(document.getElementById('namePrompt').hidden).toBe(false);

    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      promptForName: false,
      candidates: [
        { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] }
      ]
    });

    expect(document.getElementById('namePrompt').hidden).toBe(true);
  });

  it('supports excluding one candidate from tier-list voting', () => {
    mountTierListBallot({
      contestTitle: 'Contest',
      mode: 'tier-list',
      allowExclusion: true,
      promptForName: false,
      tiers: [{ label: 'S', color: '#112233' }, { label: 'A', color: '#445566' }],
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

    const visibleCards = Array.from(document.querySelectorAll('#cardGrid .card strong')).map((entry) => entry.textContent?.trim());
    expect(visibleCards).toEqual(['Banana', 'Cherry']);
  });
});
