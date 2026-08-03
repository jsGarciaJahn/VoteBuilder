// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initializeBuilderConfigUi } from '../src/builderConfigUi.js';

describe('initializeBuilderConfigUi', () => {
  it('shows tier-list-specific settings while keeping global prompt and exclusion settings visible', () => {
    document.body.innerHTML = `
      <select id="mode"><option value="ranked-choice">Ranked choice</option><option value="tier-list">Tier list</option></select>
      <div id="promptForNameRow"></div>
      <input id="promptForName" type="checkbox" checked />
      <div id="tiersRow"></div>
      <div id="pairwiseAlgorithmRow"></div>
      <div id="exclusionRow"></div>
      <div id="completionSettingsRow"></div>
      <div id="completionLabelRow"></div>
      <select id="completionRuleMode"><option value="minimum-count">Minimum count</option></select>
      <div id="completionRuleCountRow"></div>
      <input id="completionRuleCount" type="number" />
    `;

    const modeSelect = document.getElementById('mode');
    const promptForNameRow = document.getElementById('promptForNameRow');
    const promptForNameCheckbox = document.getElementById('promptForName');
    const tiersRow = document.getElementById('tiersRow');
    const pairwiseAlgorithmRow = document.getElementById('pairwiseAlgorithmRow');
    const exclusionRow = document.getElementById('exclusionRow');
    const completionSettingsRow = document.getElementById('completionSettingsRow');
    const completionLabelRow = document.getElementById('completionLabelRow');
    const completionRuleModeSelect = document.getElementById('completionRuleMode');
    const completionRuleCountRow = document.getElementById('completionRuleCountRow');
    const completionRuleCountInput = document.getElementById('completionRuleCount');

    initializeBuilderConfigUi({
      modeSelect,
      promptForNameRow,
      promptForNameCheckbox,
      tiersRow,
      pairwiseAlgorithmRow,
      exclusionRow,
      completionSettingsRow,
      completionLabelRow,
      completionRuleModeSelect,
      completionRuleCountRow,
      completionRuleCountInput
    });

    modeSelect.value = 'tier-list';
    modeSelect.dispatchEvent(new Event('change'));

    expect(exclusionRow.hidden).toBe(false);
    expect(promptForNameRow.hidden).toBe(false);
    expect(tiersRow.hidden).toBe(false);
    expect(pairwiseAlgorithmRow.hidden).toBe(true);
    expect(completionSettingsRow.hidden).toBe(false);
    expect(completionLabelRow.hidden).toBe(false);
    expect(completionRuleCountRow.hidden).toBe(false);
  });

  it('keeps prompt and exclusion rows visible in pairwise mode', () => {
    document.body.innerHTML = `
      <select id="mode"><option value="ranked-choice">Ranked choice</option><option value="pairwise">Pairwise</option></select>
      <div id="promptForNameRow"></div>
      <input id="promptForName" type="checkbox" checked />
      <div id="tiersRow"></div>
      <div id="pairwiseAlgorithmRow"></div>
      <div id="exclusionRow"></div>
      <div id="completionSettingsRow"></div>
      <div id="completionLabelRow"></div>
      <select id="completionRuleMode"><option value="all-ranked">All ranked</option></select>
      <div id="completionRuleCountRow"></div>
      <input id="completionRuleCount" type="number" />
    `;

    const modeSelect = document.getElementById('mode');
    const promptForNameRow = document.getElementById('promptForNameRow');
    const promptForNameCheckbox = document.getElementById('promptForName');
    const tiersRow = document.getElementById('tiersRow');
    const pairwiseAlgorithmRow = document.getElementById('pairwiseAlgorithmRow');
    const exclusionRow = document.getElementById('exclusionRow');
    const completionSettingsRow = document.getElementById('completionSettingsRow');
    const completionLabelRow = document.getElementById('completionLabelRow');
    const completionRuleModeSelect = document.getElementById('completionRuleMode');
    const completionRuleCountRow = document.getElementById('completionRuleCountRow');
    const completionRuleCountInput = document.getElementById('completionRuleCount');

    initializeBuilderConfigUi({
      modeSelect,
      promptForNameRow,
      promptForNameCheckbox,
      tiersRow,
      pairwiseAlgorithmRow,
      exclusionRow,
      completionSettingsRow,
      completionLabelRow,
      completionRuleModeSelect,
      completionRuleCountRow,
      completionRuleCountInput
    });

    expect(promptForNameRow.hidden).toBe(false);
    expect(exclusionRow.hidden).toBe(false);
    expect(tiersRow.hidden).toBe(true);
    expect(pairwiseAlgorithmRow.hidden).toBe(true);

    modeSelect.value = 'pairwise';
    modeSelect.dispatchEvent(new Event('change'));

    expect(promptForNameRow.hidden).toBe(false);
    expect(exclusionRow.hidden).toBe(false);
    expect(tiersRow.hidden).toBe(true);
    expect(pairwiseAlgorithmRow.hidden).toBe(false);
  });

  it('shows count row only for count-based completion modes in ranked choice', () => {
    document.body.innerHTML = `
      <select id="mode"><option value="ranked-choice">Ranked choice</option></select>
      <div id="promptForNameRow"></div>
      <input id="promptForName" type="checkbox" checked />
      <div id="tiersRow"></div>
      <div id="pairwiseAlgorithmRow"></div>
      <div id="exclusionRow"></div>
      <div id="completionSettingsRow"></div>
      <div id="completionLabelRow"></div>
      <select id="completionRuleMode">
        <option value="all-ranked">All ranked</option>
        <option value="minimum-count">Minimum count</option>
      </select>
      <div id="completionRuleCountRow"></div>
      <input id="completionRuleCount" type="number" />
    `;

    const modeSelect = document.getElementById('mode');
    const promptForNameRow = document.getElementById('promptForNameRow');
    const promptForNameCheckbox = document.getElementById('promptForName');
    const tiersRow = document.getElementById('tiersRow');
    const pairwiseAlgorithmRow = document.getElementById('pairwiseAlgorithmRow');
    const exclusionRow = document.getElementById('exclusionRow');
    const completionSettingsRow = document.getElementById('completionSettingsRow');
    const completionLabelRow = document.getElementById('completionLabelRow');
    const completionRuleModeSelect = document.getElementById('completionRuleMode');
    const completionRuleCountRow = document.getElementById('completionRuleCountRow');
    const completionRuleCountInput = document.getElementById('completionRuleCount');

    initializeBuilderConfigUi({
      modeSelect,
      promptForNameRow,
      promptForNameCheckbox,
      tiersRow,
      pairwiseAlgorithmRow,
      exclusionRow,
      completionSettingsRow,
      completionLabelRow,
      completionRuleModeSelect,
      completionRuleCountRow,
      completionRuleCountInput
    });

    expect(completionRuleCountRow.hidden).toBe(true);
    expect(completionRuleCountInput.disabled).toBe(true);

    completionRuleModeSelect.value = 'minimum-count';
    completionRuleModeSelect.dispatchEvent(new Event('change'));

    expect(completionRuleCountRow.hidden).toBe(false);
    expect(completionRuleCountInput.disabled).toBe(false);
  });
});
