import { JSDOM } from 'jsdom';
import { templateAssets } from './src/generatedTemplates.js';
import { buildBallotObject } from './src/builderPayload.js';

const rankedChoiceScript = templateAssets['ranked-choice'].js;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.MouseEvent = window.MouseEvent;
globalThis.Event = window.Event;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });

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

const candidates = [
  { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
  { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
  { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
];

const orig = Math.random;
Math.random = () => 0.1;
const firstBallot = buildBallotObject('Contest', 'ranked-choice', 'random', false, candidates);
Math.random = () => 0.9;
const secondBallot = buildBallotObject('Contest', 'ranked-choice', 'random', false, candidates);
Math.random = orig;

console.log('payload1', firstBallot.candidateOrder);
console.log('payload2', secondBallot.candidateOrder);

mountRankedChoiceBallot(firstBallot);
console.log('render1', getRenderedCardOrder());

mountRankedChoiceBallot(secondBallot);
console.log('render2', getRenderedCardOrder());
