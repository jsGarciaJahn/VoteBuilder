# Architecture Plan & Roadmap: Standalone Ballot System

## Executive Summary

The objective of this refactoring and feature expansion is to transition the project into a maintainable, modular multi-file web application for the **Builder**, while continuing to output **zero-dependency, single-file HTML documents** for the **Generated Ballots**.

By removing the constraint of packing the builder itself into a single file, we gain standard developer tooling benefits (clean separation of concerns, native syntax highlighting, modular CSS/JS files) without sacrificing the core user benefit: **portable, self-contained ballot files that run offline anywhere**.

---

## 1. System Architecture

### 1.1 Developer Environment (Builder)

The Builder UI will exist as a standard multi-file static web application organized into clear modules:

* **HTML (`index.html`)**: Focuses exclusively on layout, document structure, and accessibility semantic markup.
* **CSS (`styles/`)**: Divided into modular stylesheets for layout grid, candidate cards, drag-and-drop states, and responsive breakpoints.
* **JS (`src/`)**: Separated into functional modules handling state management, image processing/compression, DOM rendering, and template injection.

### 1.2 Build & Generation Pipeline (Ballots)

To produce single-file, zero-dependency generated ballots without writing JavaScript inside escaped string templates, we use a lightweight build pipeline.

```text
  [ Developer Modifies Source Files ]
                  │
   src/templates/ (HTML / CSS / JS for Voting Modes)
                  │
                  ▼
         [ Node Build Script ]  ── (Injects raw template assets)
                  │
                  ▼
      src/generatedTemplates.js  ── (Pre-compiled raw string imports)
                  │
                  ▼
         [ Builder App Run ]    ── (Injects user candidate data + Base64 images)
                  │
                  ▼
     [ Downloadable Ballot File ] ── (Single self-contained .html file)

```

---

## 2. Directory Structure

```text
project-root/
├── package.json                   # Minimal script config & dev server setup
├── build-templates.js             # Lightweight script compiling templates to JS string modules
│
├── public/                        # Builder Application Entry (Hosted / Static Files)
│   ├── index.html                 # Main Builder layout
│   ├── css/
│   │   ├── main.css               # Builder base layout & typography
│   │   ├── components.css         # Cards, drag-drop zones, buttons
│   │   └── mobile.css             # Builder responsive tweaks
│   └── js/
│       ├── app.js                 # App initialization & global event listeners
│       ├── state.js               # Reactive or explicit candidate state manager
│       ├── pool.js                # Image pool drag/drop logic
│       ├── candidate.js           # Candidate card CRUD operations
│       ├── imageProcessor.js      # Canvas resizing & Base64 compression
│       └── generator.js           # Injects JSON state into chosen ballot template
│
└── templates/                     # Source code for standalone ballot outputs
    ├── shared/
    │   ├── ballot-base.css        # Responsive, touch-friendly voter CSS
    │   └── voter-core.js          # Shared voter logic (Exclusion, Clipboard, Export)
    │
    ├── ranked-choice/             # Ranked Choice Voting Mode
    │   ├── template.html
    │   └── logic.js
    │
    ├── tier-list/                 # Tier List Voting Mode (S / A / B / C / D)
    │   ├── template.html
    │   └── logic.js
    │
    └── pairwise/                  # Pairwise / Elo Voting Mode (Head-to-Head)
        ├── template.html
        └── logic.js

```

---

## 3. Core Technical Objectives

### 3.1 Separation of Concerns & Template Ingestion

* **No Inline JS Strings**: Voting templates in `templates/` are written as standard, syntax-highlighted HTML, CSS, and JS files.
* **Build Step (`build-templates.js`)**: A simple Node script (~40 lines) reads the raw contents of `templates/*` files, minifies/escapes them safely, and writes them out into `src/generatedTemplates.js` as exported JavaScript objects.
* **Zero Runtime Overhead**: The build step only runs when templates are changed during development.

### 3.2 Mobile-First & Touch Optimization for Ballots

Because generated ballots are often opened on smartphones, all template variants must adhere to strict mobile UX guidelines:

* **Hybrid Control Paradigm**:
* **Desktop**: Full drag-and-drop support for fast reordering.
* **Mobile**: Dedicated, high-contrast tap controls (e.g., *Move Up / Move Down*, *Assign to Tier A*, *Quick Tap to Select*).


* **Responsive Layouts**:
* Grid transitions from multi-column layout on desktop to single-column card stacks on mobile devices (`max-width: 600px`).
* Sticky ranking headers convert to collapsible bottom sheets or drawer overlays to conserve viewport height.


* **Touch Targets**: Minimum interactive element size of `44px x 44px` for all buttons and drag handles.

### 3.3 Multi-Mode Voting Systems

Expand the versatility of generated ballots by supporting three distinct voting modes configured in the Builder:

| Voting Mode | Description | Ideal Use Case | Output Format |
| --- | --- | --- | --- |
| **Ranked Choice** | Reorder candidates in linear preference (#1, #2, #3...). | Contests with 3 to 12 entries. | Ordered Array: `["B", "A", "C"]` |
| **Tier List** | Drag or tap candidates into custom tier buckets (S, A, B, C, D). | Large subjective sets (15–40 images). | Tier Mapping: `{ S: ["A"], A: ["B", "C"] }` |
| **Pairwise (Elo)** | Present 2 candidates side-by-side; voter clicks their favorite in repeated matchups. | Large pools where sorting 20+ items sequentially causes decision fatigue. | Matchup Record / Ranked Score List |

---

## 4. Execution Roadmap

### Phase 1: Source Refactoring & Project Restructuring

* [ ] Establish the file tree (`public/`, `templates/`, `scripts/`).
* [ ] Extract the Builder UI into separate `index.html`, modular CSS stylesheets, and modular JS scripts.
* [ ] Write `build-templates.js` to compile standard template files into clean string imports for `generator.js`.

### Phase 2: Mobile UX & Touch Control Layer

* [ ] Overhaul CSS for generated ballot outputs using CSS grid/flexbox with media queries for small viewports.
* [ ] Implement tap-to-rank / tap-to-move secondary controls for mobile touchscreens alongside existing drag-and-drop listeners.
* [ ] Redesign sticky ranking UI into a collapsible slide-out drawer for screens under `600px`.

### Phase 3: Voting Mode Expansion

* [ ] **Ranked Choice**: Standardize shared voter core scripts and clipboard export routines.
* [ ] **Tier List**: Implement tier bucket drop zones, custom tier customization in the builder, and tier export serialization.
* [ ] **Pairwise Comparison**: Implement random pairing generation, win/loss recording algorithm, and progress bar for pairwise completions.
* [ ] **Builder Update**: Add voting style selection dropdown and preview configuration options to the builder UI.

---

## 5. Success Criteria

1. **Maintainability**: The developer experience operates entirely in standard files (`.html`, `.css`, `.js`) with full IDE linting and zero escaping artifacts.
2. **Portability**: Generating a ballot produces a single, self-contained HTML file containing images, styles, and voting logic with **zero external dependencies or external web requests**.
3. **Mobile Usability**: Voters can comfortably complete ballots on mobile devices without relying exclusively on mobile drag-and-drop features.