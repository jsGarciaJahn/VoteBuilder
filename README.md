# VoteBuilder

VoteBuilder is a web app for creating standalone voting ballots from candidate data and images. It supports ranked-choice, tier-list, and pairwise ballots, and compiles mode-specific HTML, CSS, and JavaScript payloads for distribution.

## Current state

- Builder UI is in [public/index.html](public/index.html) and [public/js/app.js](public/js/app.js).
- Generated ballot assets are compiled into [src/generatedTemplates.js](src/generatedTemplates.js) via [build-templates.js](build-templates.js).
- Shared builder/runtime logic is modularized in [src](src).
- Regression tests are in [tests](tests).

## Key features

### Builder features

- Contest and ballot configuration.
- Ballot mode selection: ranked-choice, tier-list, pairwise.
- Ordering modes: builder order, alphabetical, randomized ballot order.
- Optional voter-name prompt and optional exclusion selection.
- Pairwise algorithm selection, including tournament-style options.
- Completion rule and completion label configuration.
- Ballot theming with dynamic catalog loading from [public/themes](public/themes).
- Candidate-card display controls including variant, cycle timing, and image height.
- Image pool upload, drag-drop candidate composition, and batch candidate creation.
- Preview viewport toggle (desktop and mobile).
- Workspace persistence and project save/load using .bcd files from the File menu.

### Output features

- Delivery methods: clipboard, file download, mailto.
- Content formats: plain text, JSON, CSV.
- Format-specific options: file name base, CSV delimiter, mailto fields.
- Shared output normalization and formatting in [src/outputSettings.js](src/outputSettings.js).

### Ballot runtime features

- Standalone generated ballots for ranked-choice, tier-list, and pairwise voting.
- Shared ballot shell and setup fragment composition from [templates/shared](templates/shared).
- Shared runtime helpers split by concern:
  - [templates/shared/ballot-core.js](templates/shared/ballot-core.js)
  - [templates/shared/ballot-media.js](templates/shared/ballot-media.js)
  - [templates/shared/ballot-exclusion.js](templates/shared/ballot-exclusion.js)
  - [templates/shared/ballot-ranking.js](templates/shared/ballot-ranking.js)
  - [templates/shared/ballot-output.js](templates/shared/ballot-output.js)
- Mode-aware CSS composition using shared base and overlays:
  - [templates/shared/ballot-base.css](templates/shared/ballot-base.css)
  - [templates/shared/ballot-ranking-list.css](templates/shared/ballot-ranking-list.css)
  - [templates/shared/ballot-tier-list.css](templates/shared/ballot-tier-list.css)
  - [templates/shared/ballot-ranking.css](templates/shared/ballot-ranking.css)
  - [templates/shared/ballot-tier.css](templates/shared/ballot-tier.css)
  - [templates/shared/ballot-pairwise.css](templates/shared/ballot-pairwise.css)

## Project structure

- [public](public): builder UI, styles, themes, static assets.
- [src](src): shared modules and generated template bundle.
- [templates](templates): source templates for ballot HTML/CSS/JS composition.
- [tests](tests): Vitest regression and UI behavior tests.
- [docs](docs): planning and implementation notes.
- [architecture.md](architecture.md): current architecture and next-step plan.

## Build and test

Install dependencies:

npm install

Build templates:

npm run build

Run tests:

npm run test

Watch tests:

npm run test:watch

## How template generation works

1. Builder state is serialized with [src/builderPayload.js](src/builderPayload.js).
2. [build-templates.js](build-templates.js) composes shared and mode-specific HTML/CSS/JS template parts.
3. The compiled template map is written to [src/generatedTemplates.js](src/generatedTemplates.js).
4. The builder injects serialized data into the selected template at generation time.

## Notes

- Ballots are generated as standalone artifacts and can be distributed without a backend.
- For local development, serving the project via a static host is recommended.
