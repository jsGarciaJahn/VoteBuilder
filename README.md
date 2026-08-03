# VoteBuilder

VoteBuilder is a lightweight web app for creating standalone voting ballots from images and candidate data. It supports ranked-choice, tier-list, and pairwise ballots, and it can generate self-contained ballot HTML that runs without any additional build step.

## What the app does

VoteBuilder combines a builder experience and a ballot runtime:

- The builder lets you create a contest, add candidates, upload images, and configure ballot behavior.
- The generated ballot is a standalone HTML experience that can be shared with voters.
- Ballot results are copied to the clipboard so they can be pasted into a spreadsheet or reporting workflow.

## Core features

### Builder experience

The builder in [public/index.html](public/index.html) and [public/js/app.js](public/js/app.js) includes:

- Contest title configuration
- Ballot mode selection for:
  - Ranked choice
  - Tier list
  - Pairwise
- Ordering options:
  - Keep the builder-defined order
  - Sort alphabetically
  - Randomize the displayed order when the ballot opens
- Optional exclusion behavior so a voter can exclude one candidate during setup
- Optional name prompting for the voter
- Optional inclusion of the voter name in the copied ballot payload
- Completion-rule configuration for the ranked-choice flow:
  - Require all ranked entries
  - Require at least one ranked entry
  - Require a minimum count
  - Require an exact count
- Custom completion button label
- Lightweight ballot themes:
  - Default
  - Modern
  - High contrast
- Image upload and candidate management
- Drag-and-drop image handling into the image pool and candidate cards
- Batch creation of candidates from uploaded images
- Candidate reordering and removal in the builder

### Ballot modes

#### Ranked choice

The ranked-choice ballot is the most feature-rich experience. It supports:

- Click-to-rank candidates from the candidate grid
- Drag-and-drop ranking into a ranked list
- Dragging ranked cards back out to remove them
- Dragging candidates from the grid into the ranking list to add them
- Undo and restart actions
- Completion-state handling based on the configured rule
- Sticky action bar with completion, undo, and restart controls
- One-time auto-scroll to the ranking summary when the threshold is first reached
- Optional exclusion selection during setup
- Name prompt and theme support
- Randomized display order when configured

#### Tier list

The tier-list mode lets voters assign candidates to tiers such as S, A, B, C, and D, then copy the assignment payload.

#### Pairwise

The pairwise mode presents candidates in matchup-style selections and builds a ranking from the choices made.

## Project structure

- [public/](public/) — Builder UI HTML, CSS, and JavaScript
- [templates/](templates/) — Ballot templates and runtime logic for each mode
- [src/](src/) — Shared payload builder, generated template bundle, and regression tests
- [build-templates.js](build-templates.js) — Compiles the ballot templates into the generated asset bundle
- [docs/](docs/) — Planning and implementation notes

## How generation works

The builder serializes candidate and ballot settings into a payload object with [src/builderPayload.js](src/builderPayload.js). The templates in [templates/](templates/) are compiled into [src/generatedTemplates.js](src/generatedTemplates.js) by [build-templates.js](build-templates.js), which the builder uses to render the generated ballot experience.

## Development and testing

### Install dependencies

```bash
npm install
```

### Build the generated ballot templates

```bash
npm run build
```

### Run the test suite

```bash
npm run test
```

### Watch tests while developing

```bash
npm run test:watch
```

## Testing coverage

The project includes regression tests for:

- Builder payload serialization
- Ranked-choice ballot runtime behavior
- Setup and UI interactions
- Generated template integration

## Notes

The generated ballots are intended to be standalone and easy to distribute. They do not require a server to run locally, although serving the project through a simple static host is the most straightforward way to preview the builder UI.
