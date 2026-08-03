# Architecture Plan & Roadmap: Standalone Ballot System

## Executive Summary

The objective of this refactoring and feature expansion is to transition the project into a maintainable, modular multi-file web application for the Builder, while continuing to output zero-dependency, single-file HTML documents for the Generated Ballots.

By removing the constraint of packing the builder itself into a single file, we gain standard developer tooling benefits (clean separation of concerns, native syntax highlighting, modular CSS/JS files) without sacrificing the core user benefit: portable, self-contained ballot files that run offline anywhere.

---

## 1. System Architecture

### 1.1 Developer Environment (Builder)

The Builder UI will exist as a standard multi-file static web application organized into clear modules:

* HTML (index.html): Focuses exclusively on layout, document structure, and accessibility semantic markup.
* CSS (styles/): Divided into modular stylesheets for layout grid, candidate cards, drag-and-drop states, and responsive breakpoints.
* JS (src/): Separated into functional modules handling state management, image processing/compression, DOM rendering, and template injection.

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
├── package.json
├── build-templates.js
│
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── mobile.css
│   └── js/
│       ├── app.js
│       ├── state.js
│       ├── pool.js
│       ├── candidate.js
│       ├── imageProcessor.js
│       └── generator.js
│
└── templates/
    ├── shared/
    │   ├── ballot-base.css
    │   └── voter-core.js
    │
    ├── ranked-choice/
    │   ├── template.html
    │   └── logic.js
    │
    ├── tier-list/
    │   ├── template.html
    │   └── logic.js
    │
    └── pairwise/
        ├── template.html
        └── logic.js
```

---

## 3. Core Technical Objectives

### 3.1 Separation of Concerns & Template Ingestion

* No inline JS strings: voting templates in templates/ are written as standard, syntax-highlighted HTML, CSS, and JS files.
* Build step (build-templates.js): a simple Node script reads the raw contents of templates/* files and writes them to src/generatedTemplates.js as exported JavaScript objects.
* Zero runtime overhead: the build step only runs when templates are changed.

### 3.2 Mobile-First & Touch Optimization for Ballots

Because generated ballots are often opened on smartphones, all template variants should adhere to mobile UX guidelines:

* Desktop: full drag-and-drop support.
* Mobile: tap-friendly controls or simplified gestures.
* Responsive layouts: grid transitions and touch targets sized appropriately.

### 3.3 Multi-Mode Voting Systems

Support three distinct voting modes configured in the Builder:

| Voting Mode | Description | Output Format |
| --- | --- | --- |
| Ranked Choice | Reorder candidates in linear preference. | Ordered array |
| Tier List | Drag or tap candidates into custom tier buckets. | Tier mapping |
| Pairwise | Present two candidates side-by-side and record preferences. | Matchup record |

---

## 4. Execution Roadmap

### Phase 1: Source Refactoring & Project Restructuring

* Establish the file tree.
* Extract the Builder UI into separate files.
* Write build-templates.js to compile template files into generated assets.

### Phase 2: Mobile UX & Touch Control Layer

* Overhaul CSS for generated ballot outputs with responsive layouts.
* Implement touch-friendly controls alongside drag-and-drop listeners.
* Redesign the ranking UI for smaller screens.

### Phase 3: Voting Mode Expansion

* Ranked Choice: Standardize voter-core scripts and export routines.
* Tier List: Implement tier bucket drop zones and export serialization.
* Pairwise Comparison: Implement matchup generation and scoring logic.
* Builder Update: Add voting style selection and preview configuration.

---

## 5. Success Criteria

1. Maintainability: the developer experience operates in standard files with full IDE support.
2. Portability: generating a ballot produces a single self-contained HTML file with zero external dependencies.
3. Mobile Usability: voters can comfortably complete ballots on mobile devices without relying exclusively on drag-and-drop.
