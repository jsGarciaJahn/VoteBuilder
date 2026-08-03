# Ranked-choice ballot UI planning

## Goal

Create a simpler, more intuitive ranked-choice ballot experience that relies on drag-and-drop as the primary interaction while keeping the interface uncluttered and touch-friendly.

## Working approach

The work is organized into iterative tickets. Each ticket is scoped so it can be implemented, tested, and reviewed independently. The order below reflects dependencies: foundational builder configuration should be completed first, then shared ballot behaviors, then polish and UX refinement.

## Ticket backlog

### Priority 0 — Foundation

#### Ticket A1 — Define ballot completion model in the builder
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: none
- Description: Add builder-level configuration for the completion behavior of the ranked-choice ballot. This should cover the completion rule and the label shown on the final action.
- Scope:
  - Add support for completion modes: require all, require at least one, require an exact number, and require a minimum number.
  - Add a builder option for the final action label: Done, Finish, or Submit.
  - Store the selected values in the generated ballot payload so the runtime can use them.
- Why first: The completion rule and action label are foundational for the rest of the flow. Most other UI work depends on having a known completion state.

#### Ticket A2 — Expose completion state to the ballot runtime
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: A1
- Description: Update the generated ballot runtime to read the completion configuration from the ballot payload and expose it as runtime state.
- Scope:
  - Read the configured rule and label from the ballot data.
  - Expose simple helpers that determine whether the current ranking satisfies the rule.
  - Make the completion state available to the UI layer.
- Why second: The ballot UI cannot behave correctly without knowing when the ranking is complete.

### Priority 1 — Core ballot interaction

#### Ticket B1 — Replace the current ranking controls with drag-first interaction
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: A2
- Description: Simplify the ranked-entry experience by removing the extra controls on the right side of each ranked item and switching to drag-first interaction.
- Scope:
  - Remove the current reorder buttons from the ranking list.
  - Keep drag-and-drop as the primary way to reorder ranked entries.
  - Preserve the existing click-to-rank behavior as a fallback for adding entries.
- Why now: This is the core interaction change and should be implemented before more polish is added.

#### Ticket B2 — Support removing ranked entries by dragging outside the list
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: B1
- Description: Remove the dedicated remove/drop zone and instead allow a ranked entry to be removed by dragging it outside the ranking list and releasing it.
- Scope:
  - Detect drag exit from the ranking list.
  - Remove the dragged entry when dropped outside the list.
  - Keep the interaction intuitive and predictable.
- Why now: Removal is part of the core ranking workflow and should be implemented alongside reordering.

#### Ticket B3 — Support adding ranked entries by dragging from the card grid
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: B1
- Description: Let candidates from the main grid be dragged into the ranking list to add them.
- Scope:
  - Detect drag start from the card grid.
  - Allow dropping onto the ranking list to add the candidate.
  - Keep click-to-rank as a fallback to avoid breaking usability.
- Why now: This extends the drag workflow to the add path and completes the main interaction model.

### Priority 2 — Ballot UI refinement

#### Ticket C1 — Rework the top action bar
- Status: planned
- Priority: medium
- Complexity: medium
- Depends on: A2, B1
- Description: Replace the current copy-oriented action with a more general completion action and make the toolbar compact and sticky.
- Scope:
  - Rename or generalize the current action from Copy results to a completion action such as Done, Finish, or Submit.
  - Keep the action bar sticky at the top of the ballot.
  - Use standard icons for Undo, Restart, and the completion action.
  - Keep the layout slim and readable.
- Why here: This builds on the new completion state and improves the ballot’s main navigation area.

#### Ticket C2 — Improve visual feedback and readability
- Status: planned
- Priority: medium
- Complexity: medium
- Depends on: C1
- Description: Make the ballot controls easier to recognize and use by adding clearer visual treatment and subtle interaction feedback.
- Scope:
  - Apply conventional color cues to Undo, Restart, and completion actions.
  - Add subtle hover, focus, and drag-over transitions.
  - Improve contrast and readability of the controls and ranking list.
- Why here: This is polish and should follow the structural changes.

#### Ticket C3 — Add completion-threshold auto-scroll
- Status: planned
- Priority: medium
- Complexity: low
- Depends on: A2, C1
- Description: When the ranking first reaches the configured completion threshold, smoothly scroll the ranking list into view so the completed selection can be reviewed before finishing.
- Scope:
  - Trigger the scroll only once when the threshold is first reached.
  - Avoid repeating the scroll on later edits.
  - Keep the top action bar visible during the scroll.
- Why here: This is an enhancement to the completion experience and fits after the completion state is available.

### Priority 3 — Mobile and polish

#### Ticket D1 — Improve touch interaction and drag affordance
- Status: planned
- Priority: medium
- Complexity: medium
- Depends on: B1, B2, B3
- Description: Make the ranking and removal interaction feel natural on touch devices.
- Scope:
  - Add a dedicated drag handle for ranked entries.
  - Keep the ranking list visually contained so it does not feel like the whole screen is a scroll surface.
  - Make removal by dragging outside the list feel predictable on touch.
- Why later: This is important, but it is best implemented after the core drag interactions are working.

#### Ticket D2 — Add lightweight ballot theming
- Status: planned
- Priority: low
- Complexity: medium
- Depends on: A1, C1
- Description: Add a small set of simple ballot themes so the generated ballot can adopt a more polished look without becoming overly customizable.
- Scope:
  - Add a few readable visual themes.
  - Apply the selected theme in the generated ballot UI.
  - Keep the options lightweight and focused on clarity and contrast.
- Why later: Theming is valuable but not required for core interaction correctness.

## UX principles

- Keep the interface visually clean and avoid permanent controls that duplicate drag behavior.
- Make the ranking list the central interaction surface.
- Use clear drag states so the gesture is discoverable without requiring explanatory text.
- Preserve current functionality while making the interaction feel more direct and touch-friendly.
- Keep the ballot flow flexible for future completion behaviors beyond clipboard copying.

## Implementation notes

- The ranked list should highlight when a dragged item is over it.
- Dropping a dragged item outside the list should remove it from the ranking.
- A dragged item should be visually distinct while in motion.
- The top action area should remain visible while the ballot content scrolls.
- The completion action should be disabled until the configured rule is satisfied.

## Success criteria

- The ballot feels less cluttered.
- Ranked entries can be reordered through drag-and-drop alone.
- Ranked entries can be removed without a dedicated drop zone.
- Candidates can be added to the ranking by dragging from the card grid.
- The top action area stays useful without overwhelming the page.
- The completion action is flexible enough to support future export or submission flows.
- The experience remains intuitive on both desktop and mobile.
