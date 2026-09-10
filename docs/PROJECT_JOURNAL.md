---
title: "Stylo — Project Journal & ADR Index"
created: 2026-09-01
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/standard
---

# Stylo — Project Journal & ADR Index

Master index for the engineering journal (`docs/journal/YYYY-MM/`). Chronological
milestones and Architectural Decision Records, newest first.

## Architectural Decision Records

| ADR                                                                                   | Title                                                                 | Status   | Date       |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------- | ---------- |
| [ADR-009](./journal/2026-09/2026-09-11_adr-009-react-nodes-in-the-in-place-canvas.md) | Rendering host React nodes in the in-place canvas                     | Accepted | 2026-09-11 |
| [ADR-008](./journal/2026-09/2026-09-04_adr-008-codemirror-peer-dependency.md)         | CodeMirror and Lezer as peer dependencies                             | Accepted | 2026-09-04 |
| [ADR-007](./journal/2026-09/2026-09-03_adr-007-seamless-in-place.md)                  | Seamless in-place: Markdown markers never shown                       | Accepted | 2026-09-03 |
| [ADR-006](./journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md)          | Interactive rendered-table editing                                    | Accepted | 2026-09-02 |
| [ADR-005](./journal/2026-09/2026-09-01_adr-005-in-place-decoration-toggles.md)        | In-place decoration toggles                                           | Accepted | 2026-09-01 |
| [ADR-004](./journal/2026-09/2026-09-01_adr-004-in-place-decoration-canvas.md)         | In-place decoration canvas                                            | Accepted | 2026-09-01 |
| [ADR-003](./journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md)               | Math rendering engine and KaTeX asset delivery                        | Accepted | 2026-09-01 |
| [ADR-002](./journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md)        | Editor UX, Customization API, and Design System                       | Accepted | 2026-09-01 |
| [ADR-001](./journal/2026-09/2026-09-01_adr-001-editor-architecture.md)                | Editor architecture: compose from primitives, plain text is canonical | Accepted | 2026-09-01 |

## Milestones

| Date       | Entry                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-11 | [Tracker — making Stylo dependable for downstream projects](./journal/2026-09/2026-09-11_dependable-tracker.md)                                           |
| 2026-09-11 | [`![[embed]]` reaches the in-place canvas — a portal registry](./journal/2026-09/2026-09-11_inplace-embeds.md)                                            |
| 2026-09-10 | [`![[embed]]` transclusion — Stylo detects, the host renders (`embedSource`)](./journal/2026-09/2026-09-10_embed-transclusion.md)                         |
| 2026-09-10 | [`[[wikilink]]` autocomplete — the host indexes, Stylo triggers and inserts](./journal/2026-09/2026-09-10_wikilink-autocomplete.md)                       |
| 2026-09-10 | [A browser test harness — Playwright over the in-place canvas](./journal/2026-09/2026-09-10_browser-test-harness.md)                                      |
| 2026-09-10 | [Font-family tokens — the prose and mono stacks move onto the contract](./journal/2026-09/2026-09-10_font-family-tokens.md)                               |
| 2026-09-10 | [A font-size token, and the selection bar yielding to the right-click menu](./journal/2026-09/2026-09-10_font-size-token-and-menu-selbar-coordination.md) |
| 2026-09-10 | [Toolbar customizer — step 2, drag-and-drop (feature complete)](./journal/2026-09/2026-09-10_toolbar-customizer-step-2.md)                                |
| 2026-09-10 | [Toolbar customizer — step 1, the keyboard-only core](./journal/2026-09/2026-09-10_toolbar-customizer-step-1.md)                                          |
| 2026-09-10 | [Design — the `<StyloToolbarSettings />` toolbar customizer](./journal/2026-09/2026-09-10_toolbar-customizer-design.md)                                   |
| 2026-09-10 | [Find / replace — `@codemirror/search` wired in](./journal/2026-09/2026-09-10_find-and-replace.md)                                                        |
| 2026-09-10 | [Token decoupling — floating-surface token, ring/accent split, scrollbar styling](./journal/2026-09/2026-09-10_token-decoupling-and-scrollbars.md)        |
| 2026-09-09 | [Touch context menu, and the layout that pins a toolbar for free](./journal/2026-09/2026-09-09_touch-menu-and-full-height-layout.md)                      |
| 2026-09-04 | [Frontmatter as a raw callback](./journal/2026-09/2026-09-04_frontmatter-callback.md)                                                                     |
| 2026-09-04 | [Save hook, imperative ref handle, and a dark palette](./journal/2026-09/2026-09-04_save-imperative-handle-dark-mode.md)                                  |
| 2026-09-03 | [In-place canvas — menu groups, selection bar in cells, callouts](./journal/2026-09/2026-09-03_menu-groups-cell-bar-callouts.md)                          |
| 2026-09-03 | [In-place canvas — shared table menu, table style hooks, list indent guides](./journal/2026-09/2026-09-03_table-menu-shell-and-list-guides.md)            |
| 2026-09-03 | [In-place canvas — right-click menu and selection bar](./journal/2026-09/2026-09-03_context-menu-and-selection-bar.md)                                    |
| 2026-09-03 | [In-place canvas — boxed blocks hold off the editor frame](./journal/2026-09/2026-09-03_boxed-block-gutter.md)                                            |
| 2026-09-02 | [Structural controls on the editable table](./journal/2026-09/2026-09-02_table-structural-controls.md)                                                    |
| 2026-09-02 | [Syntax highlighting — a token palette for fenced code](./journal/2026-09/2026-09-02_syntax-highlighting.md)                                              |
| 2026-09-02 | [Toolbar inline commands inside editable table cells](./journal/2026-09/2026-09-02_table-cell-inline-commands.md)                                         |
| 2026-09-02 | [Editable table cells — per-cell Markdown reveal](./journal/2026-09/2026-09-02_table-cell-reveal.md)                                                      |
| 2026-09-02 | [In-place table cells — inline formatting](./journal/2026-09/2026-09-02_table-cell-inline-formatting.md)                                                  |
| 2026-09-02 | [Toolbar — inline marks nest, a wikilink button, table-aware block commands](./journal/2026-09/2026-09-02_toolbar-inline-nesting-and-wikilink.md)         |
| 2026-09-02 | [Interactive table cells — editing inside the rendered `<table>`](./journal/2026-09/2026-09-02_interactive-table-cells.md)                                |
| 2026-09-02 | [Table editing — insert, cell navigation, live pipe alignment](./journal/2026-09/2026-09-02_table-editing.md)                                             |
| 2026-09-02 | [Typography rhythm — Tailwind `prose` as the reference](./journal/2026-09/2026-09-02_typography-rhythm.md)                                                |
| 2026-09-02 | [Preview frontmatter display — the `frontmatter` prop](./journal/2026-09/2026-09-02_preview-frontmatter.md)                                               |
| 2026-09-02 | [Declarative formatting toolbar](./journal/2026-09/2026-09-02_toolbar.md)                                                                                 |
| 2026-09-02 | [`codeLanguages` prop — fenced-code sub-highlighting, opt-in](./journal/2026-09/2026-09-02_code-languages-prop.md)                                        |
| 2026-09-02 | [In-place canvas — click-to-position accuracy](./journal/2026-09/2026-09-02_in-place-click-mapping.md)                                                    |
| 2026-09-01 | [Customization API — in-place decoration toggles](./journal/2026-09/2026-09-01_customization-in-place-toggles.md)                                         |
| 2026-09-01 | [In-place canvas — build tracker](./journal/2026-09/2026-09-01_in-place-canvas.md)                                                                        |
| 2026-09-01 | [Split mode — source and preview side by side](./journal/2026-09/2026-09-01_split-mode.md)                                                                |
| 2026-09-01 | [Foundation milestone — build, source and preview modes](./journal/2026-09/2026-09-01_foundation-milestone.md)                                            |
| 2026-09-01 | [Drop `@codemirror/language-data` for a pass-through `codeLanguages` prop](./journal/2026-09/2026-09-01_drop-codemirror-language-data.md)                 |
| 2026-09-01 | [Project Genesis — Stylo extracted from Sympose](./journal/2026-09/2026-09-01_project-genesis.md)                                                         |
