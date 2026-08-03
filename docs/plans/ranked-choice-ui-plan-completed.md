# Ranked-choice ballot UI completed work

This document archives the work that has already been implemented and verified for the VoteBuilder ranked-choice experience.

## Completed foundation work

### Ticket A1 — Define ballot completion model in the builder
- Status: done
- Priority: high
- Description: Added builder-level configuration for completion behavior, including the completion rule and the label shown on the final action.

### Ticket A2 — Expose completion state to the ballot runtime
- Status: done
- Priority: high
- Description: Updated the generated ballot runtime to read the completion configuration from the ballot payload and expose it as runtime state.

## Completed core interaction work

### Ticket B1 — Replace the current ranking controls with drag-first interaction
- Status: done
- Priority: high
- Description: Simplified the ranked-entry experience by removing extra controls and relying on drag-first interaction.

### Ticket B2 — Support removing ranked entries by dragging outside the list
- Status: done
- Priority: high
- Description: Allowed ranked entries to be removed by dragging them outside the ranking list.

### Ticket B3 — Support adding ranked entries by dragging from the card grid
- Status: done
- Priority: high
- Description: Added support for dragging candidates from the card grid into the ranking list.

## Completed ballot UI refinement work

### Ticket C1 — Rework the top action bar
- Status: done
- Priority: medium
- Description: Replaced the copy-focused action with a compact sticky completion action bar.

### Ticket C2 — Improve visual feedback and readability
- Status: done
- Priority: medium
- Description: Added clearer button styling, hover/focus feedback, and stronger visual contrast.

### Ticket C3 — Add completion-threshold auto-scroll
- Status: done
- Priority: medium
- Description: Added one-time auto-scroll to the ranking summary when the configured completion threshold is first reached.

## Completed mobile and polish work

### Ticket D1 — Improve touch interaction and drag affordance
- Status: done
- Priority: medium
- Description: Added drag handles and improved the touch experience for ranking and removal.

### Ticket D2 — Add lightweight ballot theming
- Status: done
- Priority: low
- Description: Introduced lightweight ballot themes for default, modern, and high-contrast presentation.

## Completed testability and regression work

### Ticket E1 — Cover builder payload wiring for new ballot settings
- Status: done
- Priority: high
- Description: Added regression tests for completion rules, name toggles, and theme serialization.

### Ticket E2 — Cover ranked-choice runtime interaction flows
- Status: done
- Priority: high
- Description: Added regression tests for drag-to-add, drag-to-remove, completion state, and auto-scroll behavior.

### Ticket E3 — Cover ballot setup and accessibility behaviors
- Status: done
- Priority: medium
- Description: Added tests around setup visibility, exclusion behavior, and keyboard-accessible controls.

### Ticket E4 — Cover generated ballot integration end to end
- Status: done
- Priority: medium
- Description: Added integration-style coverage for the generated ballot bundle and runtime mounting flow.
