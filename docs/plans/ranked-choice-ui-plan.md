# Ranked-choice ballot UI planning

## Goal

Create a simpler, more intuitive ranked-choice ballot experience that relies on drag-and-drop as the primary interaction while keeping the interface uncluttered and touch-friendly.

## Working approach

The work is organized into iterative tickets. Completed items have been moved to a separate archive document so the active backlog stays focused on what remains to be implemented.

See [ranked-choice-ui-plan-completed.md](ranked-choice-ui-plan-completed.md) for the completed work.

## Ticket backlog

### Priority 5 — Builder experience and publishing

#### Ticket F1 — Split the builder into tabbed workspaces
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: none
- Description: Reorganize the builder experience into separate tabs for configuration, preview, and publishing so the setup flow stays focused and the preview is easier to use.
- Scope:
  - Add a tab bar with Builder, Preview, and Publish views.
  - Keep the existing editing controls in the Builder tab.
  - Make the Preview tab a dedicated place to inspect the ballot without cluttering the setup flow.
- Why now: The builder is becoming more powerful, and a tabbed structure will keep it usable as more features are added.

#### Ticket F2 — Render a live ballot preview from the current builder state
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: F1
- Description: Show a live preview of the ballot inside the builder using the current contest settings, candidates, and ballot options.
- Scope:
  - Reuse the existing payload builder and generated ballot templates.
  - Render the preview in an isolated container or iframe so it behaves like a real ballot without interfering with the editor.
  - Refresh the preview automatically when the builder state changes.
- Why now: This is the core usability improvement for the builder and makes the authoring experience much more intuitive.

#### Ticket F3 — Add preview controls for testing the voter flow
- Status: planned
- Priority: medium
- Complexity: medium
- Depends on: F2
- Description: Make the preview more useful by letting the user step through the voter experience inside the tab.
- Scope:
  - Support opening the setup flow and moving into the ballot experience from the preview.
  - Allow a quick “simulate voter” path for ranked-choice and other ballot modes.
  - Keep the preview focused on validation rather than full export workflow.
- Why now: A preview that only shows static content is less valuable than one that can be exercised like a real ballot.

#### Ticket F4 — Add a publish and export surface for generated ballots
- Status: planned
- Priority: medium
- Complexity: medium
- Depends on: F1
- Description: Add a dedicated publishing area so the user can export or share a finished ballot from the builder without leaving the app.
- Scope:
  - Add a Publish tab with actions such as download HTML and copy shareable output.
  - Keep the structure extensible so future hosted-link or bot-based publishing routes can be added later.
  - Make the workflow feel consistent with the preview experience.
- Why now: Previewing the ballot is only half the workflow; users also need a clear path to publish or distribute it.

#### Ticket F5 — Remove preview error popups during setup
- Status: planned
- Priority: high
- Complexity: low
- Depends on: F2
- Description: Prevent the preview from interrupting the builder with alerts or other popup-based error states while the user is still configuring the ballot.
- Scope:
  - Suppress preview-related warnings during initial setup.
  - Keep the preview silent until it has enough state to render a valid ballot.
  - Avoid alert popups that distract from the builder workflow.
- Why now: The preview should support the authoring workflow without making the builder feel brittle or noisy.

#### Ticket F6 — Refresh preview after batch image generation
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: F2
- Description: Ensure the ballot preview updates immediately after batch image generation creates new candidates.
- Scope:
  - Trigger a preview refresh after bulk candidate creation from uploaded images.
  - Keep the preview and builder state aligned after batch operations.
- Why now: Users expect preview updates to follow the latest builder state, especially after bulk actions.

#### Ticket F7 — Make builder settings adaptive for ranked-choice mode
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: F1
- Description: Make the builder’s advanced settings smarter so irrelevant or impossible options are hidden or disabled based on the selected ballot mode and the current configuration.
- Scope:
  - Hide or disable voter-name inclusion controls when name prompting is off.
  - Hide or disable the required-count input unless the selected completion rule needs it.
  - Only show ranked-choice-specific settings when the ballot mode is ranked choice.
  - Keep the configuration UI coherent and impossible-state-free.
- Why now: The builder should guide users instead of forcing them to manage irrelevant options.

#### Ticket F8 — Fix ranked-choice drag reordering in the preview and generated ballot
- Status: planned
- Priority: high
- Complexity: medium
- Depends on: F2
- Description: Correct the ranked-choice interaction so dragged entries are reordered rather than removed when dropped into a new position.
- Scope:
  - Restore the intended reorder behavior for ranked entries in the preview and generated ballot runtime.
  - Preserve removal behavior when the dragged item is dropped outside the ranking list.
  - Keep the experience consistent between preview and exported ballot output.
- Why now: Reordering is a core ranked-choice interaction and is currently broken.

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
