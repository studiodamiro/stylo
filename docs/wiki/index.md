---
title: "Stylo Wiki — Home"
created: 2026-09-01
type: wiki-reference
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# Stylo Wiki

Concept-based documentation for **Stylo**, a plain-text-first Markdown editor for
React with first-class LaTeX (KaTeX) support.

## Navigation

### Architecture

- [[architecture/overview|System Overview]] — the plain-text-first model, the
  composed stack, and the render pipeline.

### Guides

_Pending first release._

### Reference

- [[reference/props|`<Stylo>` props]] — the current prop surface, styling tokens,
  and math setup.
- [[reference/toolbar|Formatting toolbar]] — the `toolbar` prop, command ids,
  keyboard shortcuts, and the `icons` override.
- [[reference/in-place-config|In-place canvas configuration]] — the `inPlace`
  prop and its decoration toggles.
- [[reference/code-languages|Fenced-code highlighting]] — the `codeLanguages`
  prop and how to opt into language grammars.

## Engineering journal

Chronological milestones and Architectural Decision Records live outside the wiki,
under `docs/journal/YYYY-MM/`. The master ADR index is
[`docs/PROJECT_JOURNAL.md`](../PROJECT_JOURNAL.md).

| ADR     | Title                                                                 | Status   |
| ------- | --------------------------------------------------------------------- | -------- |
| ADR-005 | In-place decoration toggles                                           | Accepted |
| ADR-004 | In-place decoration canvas                                            | Accepted |
| ADR-003 | Math rendering engine and KaTeX asset delivery                        | Accepted |
| ADR-002 | Editor UX, Customization API, and Design System                       | Accepted |
| ADR-001 | Editor architecture: compose from primitives, plain text is canonical | Accepted |
