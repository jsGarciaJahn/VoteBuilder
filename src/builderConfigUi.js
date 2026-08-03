export function initializeBuilderConfigUi({
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
}) {
  function updateVisibility() {
    const isRankedChoice = modeSelect?.value === 'ranked-choice';
    const isTierList = modeSelect?.value === 'tier-list';
    const supportsPromptSettings = true;
    const supportsCompletionSettings = isRankedChoice || isTierList;

    if (exclusionRow) {
      exclusionRow.hidden = false;
    }

    if (promptForNameRow) {
      promptForNameRow.hidden = !supportsPromptSettings;
    }

    if (tiersRow) {
      tiersRow.hidden = !isTierList;
    }

    if (pairwiseAlgorithmRow) {
      pairwiseAlgorithmRow.hidden = modeSelect?.value !== 'pairwise';
    }

    if (completionSettingsRow) {
      completionSettingsRow.hidden = !supportsCompletionSettings;
    }

    if (completionLabelRow) {
      completionLabelRow.hidden = !supportsCompletionSettings;
    }

    if (completionRuleModeSelect && completionRuleCountRow && completionRuleCountInput) {
      const needsCount = completionRuleModeSelect.value === 'minimum-count' || completionRuleModeSelect.value === 'exact-count';
      completionRuleCountRow.hidden = !supportsCompletionSettings || !needsCount;
      completionRuleCountInput.disabled = !supportsCompletionSettings || !needsCount;
    }
  }

  [modeSelect, promptForNameCheckbox, completionRuleModeSelect].forEach((element) => {
    element?.addEventListener('change', updateVisibility);
    element?.addEventListener('input', updateVisibility);
  });

  updateVisibility();
}
