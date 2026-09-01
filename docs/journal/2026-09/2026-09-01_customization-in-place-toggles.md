---
title: "Customization API — in-place decoration toggles"
created: 2026-09-01
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Customization API — in-place decoration toggles

First slice of the developer customization API from
[ADR-002](./2026-09-01_adr-002-editor-ux-and-customization.md), specified in
[ADR-005](./2026-09-01_adr-005-in-place-decoration-toggles.md): a single `inPlace`
prop whose `decorations` record turns individual in-place decoration types off,
leaving that construct as plain source.

## Context

The [in-place canvas](./2026-09-01_in-place-canvas.md) renders twelve Markdown
constructs. Which ones a host wants depends on the field — a CMS body, a comment
box, and a raw-notes surface each want a different subset. The recurring "can we
turn X off?" question through the canvas build is answered here.

## Scope

- **In:** per-type enable/disable toggles for all twelve constructs, via
  `inPlace={{ decorations: { … } }}`. Default is every key `true` — unchanged
  behaviour.
- **Out (deferred, each its own decision):** `reveal: "line" | "node"`,
  frontmatter display mode, table rendering options, any consumer decorator
  hook or CodeMirror extension pass-through.

## Design

- One grouped `inPlace` object prop, so `reveal` and `frontmatter` groups can
  join `decorations` later without new top-level props.
- A CodeMirror `Facet` (`inPlaceConfigFacet`) carries the resolved toggles;
  each of the four decoration producers (view plugin, `blockMathField`,
  `frontmatterField`, `tableField`) reads it and skips a disabled construct.
- The state fields stay singletons — the facet, not a factory, holds config —
  so the existing suite is untouched.
- Config is read at canvas construction; runtime changes need a remount.

## Increments

| #   | Increment                                                         | Status | Notes                                                                                              |
| --- | ----------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| 1   | ADR-005; journal note; ADR + wiki index sync                      | ✅     | Design on paper; deferred items named explicitly.                                                  |
| 2   | `inPlaceConfigFacet`, producer gates, `inPlace` prop, tests, docs | ☐      | `src/inplace/config.ts`; gates in the four producers; `InPlaceConfig` types; playground toggle UI. |

## Log

- 2026-09-01 — increment 1: ADR-005 written; scope fixed to on/off toggles only,
  with reveal mode, frontmatter display mode, table options, and any decorator
  hook explicitly deferred. Shape settled as one `inPlace` object prop;
  mechanism settled as a facet read by all four producers, fields kept as
  singletons. Journal, ADR index, and wiki index synced.

## After this slice

- `inPlace.reveal` — `"line" | "node"` cursor-reveal granularity.
- `inPlace.frontmatter` — `source` / `chip` / `properties` display mode; the
  `properties` panel waits on the deferred YAML exposure work (its own ADR).
- Table rendering options — inline cell formatting, style hooks.
- Consumer decorator hook — its own ADR once concrete use cases exist.
