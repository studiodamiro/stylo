---
title: "ADR-007 — Seamless in-place: Markdown markers never shown"
created: 2026-09-03
type: adr
parent: index
tags:
  - stylo/architecture
  - engineering/adr
---

# ADR-007 — Seamless in-place: Markdown markers never shown

- **Status:** Accepted — staged rollout behind `inPlace.reveal`. The default
  stays `"caret"` (the [ADR-004](./2026-09-01_adr-004-in-place-decoration-canvas.md)
  behaviour) until every stage below lands and is dogfooded; then it flips to
  `"never"`. Amends ADR-004 rule 3 ("cursor reveal").
- **Date:** 2026-09-03
- **Deciders:** damiro, Grace

## Context

[ADR-004](./2026-09-01_adr-004-in-place-decoration-canvas.md) rule 3 is
**cursor reveal**: a construct's Markdown markers are hidden on every line
*except* the one the caret is on. Move onto a line and its `#`, `**`, `` ` ``,
`>`, `[]()` reappear so you can edit the raw source; move away and they
re-collapse. This is Obsidian's Live Preview model.

Reveal has a structural cost. When the caret enters a line, that line's text
reflows — sometimes by a few characters (`**`), sometimes by a lot (a long
`](url)`), and the spot the reader was looking at shifts out from under them.
Clicking near inline markup is where it bites: the click resolves against the
collapsed layout, the line then expands, and even when the caret lands on the
correct source character it no longer sits where the eye expects. Chasing that
after the fact is not possible — once the layout has moved, the pixel that was
clicked points at a different character.

The owner wants the in-place canvas to read as a **true editor with no visible
trace of Markdown** — the Notion / Typora "seamless" feel — where markers are
*never* painted, not even on the active line. The canonical model stays a
Markdown string (ADR-001); the markers still exist in it and the file still
round-trips to Obsidian. They are simply never displayed, and the caret never
occupies them as visible characters.

### What this is not

- **Not a document-model change.** The string stays canonical. No
  ProseMirror / Lezer-tree source of truth (ADR-001 stands).
- **Not a new dependency.** Built from CodeMirror decorations, `atomicRanges`,
  and a few `transactionFilter` / input handlers — the same primitives the
  canvas already uses.
- **Not automatic.** It ships behind a flag and becomes the default only after
  the staged work is proven.

## Decision

### 1. A new `inPlace.reveal` mode

`inPlace.reveal: "caret" | "never"`, default `"caret"`.

- `"caret"` — today's behaviour, unchanged.
- `"never"` — marker-hiding decorations are emitted for **every** line in view,
  not just the inactive ones. `revealedLines` no longer suppresses inline-marker
  hiding. Every hidden marker is an atomic range at all times, so the caret
  never lands inside one.

Read once, at mount, like the rest of `InPlaceConfig`.

### 2. Boundary-editing rules (the actual work)

With markers invisible and atomic, editing *at their edges* needs defined
behaviour. One set of rules, applied to every construct:

- **Insertion association.** A text insertion at the boundary between visible
  text and a hidden marker lands on the side the user perceives. Typing after a
  bold word produces `**bold**x`, never `**boldx**`. Enforced by a
  `transactionFilter` that shifts a single boundary insertion to the outer edge
  of the marker.
- **Backspace / Delete over a hidden marker is a no-op.** The markers are not
  removable as text — formatting is removed by re-toggling (selection bar,
  right-click menu, or shortcut) with the construct selected or the caret
  inside it. Predictable, and the toggle is discoverable.
- **Empty-wrapper cleanup.** Deleting the last visible character of a styled
  span removes the now-empty `****` / `` `` `` / `[]()` in the same
  transaction, so the document never carries an invisible empty construct.
- **Line-prefix backspace.** Backspace at visual column 0 of a heading,
  blockquote, or list item removes one level of prefix — heading → paragraph,
  quote → paragraph, list item → outdent then paragraph. The Notion
  "backspace to unstyle" gesture.

### 3. Links and wikilinks get an edit affordance

Collapsed to their label at all times, so the URL / target is unreachable as
text. A small "Edit link…" action (right-click menu entry, and/or a popover on
the collapsed link) opens the target for editing. New UI — its own stage.

### 4. Autoformat on type

To create a construct without ever typing visible markup that lingers:
`## ` at line start becomes a heading and the prefix vanishes; `- ` / `> `
likewise; typing the closing `**` / `` ` `` / `)` of a pair collapses it. Each
is an input rule — its own stage, and each rewrite is one undo step with the
keystroke that triggered it.

### 5. Constructs already at "no markers" are untouched

Fenced code, `$$` math blocks, inline `$…$`, tables, and frontmatter already
render as widgets or keep their source by design. They do not change.

## Staged rollout

Each stage is shippable and testable on its own; the default stays `"caret"`
throughout.

| Stage | Scope |
| ----- | ----- |
| 1 | `inPlace.reveal` flag + infra: under `"never"`, hide inline markers on every line, always atomic. No boundary rules yet — establishes the baseline and shows exactly what breaks. |
| 2 | Inline-mark boundary rules: insertion association, empty-wrapper cleanup, backspace-over-marker no-op. Bold / italic / strike / inline code feel right. |
| 3 | Line-prefix constructs: heading / blockquote / list — backspace-at-column-0 removes the prefix; level / type changes go through the menu and shortcuts. |
| 4 | Links + wikilinks always collapsed, with an "Edit link…" affordance for the target. |
| 5 | Autoformat-on-type input rules (`## `, `- `, `> `, `**…**`, `` `…` ``, `[…](…)`). |
| 6 | Flip the default to `"never"` once 2–5 are solid and dogfooded. `"caret"` stays available. |

### Rollout log

- **2026-09-03 — Stage 1 landed.** `inPlace.reveal: "caret" | "never"` added
  (`RevealMode` in `types.ts`, `revealModeFacet` seeded by `inPlaceExtension`).
  Under `"never"`, `buildDecorations` swaps the caret reveal set for an empty
  one, so every inline marker stays hidden on every line; inline `$…$` math is
  the one exception and keeps caret reveal for now. No boundary rules yet —
  editing near a hidden marker is expected to misbehave; that is the Stage 2
  input. Playground has a `reveal` selector next to `table editing`.

## Consequences

### Positive

- The in-place canvas reads as a WYSIWYG editor — no marker chrome, nothing
  shifts on click or caret entry, the reveal class of bug is gone by
  construction.
- The Markdown string stays canonical; files still round-trip to Obsidian and
  plain-text tools untouched.
- No new dependency; the mechanism is decorations + `atomicRanges` + filters.
- The [right-click menu and selection bar](./2026-09-03_context-menu-and-selection-bar.md)
  become the primary formatting path — work already done, now load-bearing.
- Fully staged and flagged: no destabilisation of the shipped `"caret"`
  behaviour while building.

### Costs / considerations

- **Boundary editing is where rich-text editors spend their bug budget.** Caret
  at the start / end of a span, an empty span, nested emphasis, a selection
  straddling a marker — each needs explicit tests.
- A deliberate departure from Obsidian's interaction model, which reveals the
  active line. Recorded so it is a decision, not a drift.
- `atomicRanges` + selection is, per ADR-002, "the classic source of CodeMirror
  rich-editing bugs". More of the canvas now depends on it.
- Undo granularity for autoformat rewrites must fold into the triggering
  keystroke, or undo feels broken.
- Accessibility: the rendered DOM now never shows structural markers, so the
  semantic layer matters more. In-place headings today are `.cm-line` size
  classes, not real `<hN>` — worth revisiting as a follow-up.
- Pasted Markdown should ideally autoformat rather than sit as literal markup;
  covered once stage 5 exists.

## Alternatives rejected

- **Keep cursor reveal, fix the click mapping.** Investigated first. When
  CodeMirror maps a click it already accounts for the hidden (replaced)
  characters, so the caret lands on the right *source* position; the problem is
  the line then reflowing out from under the pointer. A post-reveal
  re-placement lands on whichever character the pixel now covers — a *different*
  one — so there is no correct-after-the-fact fix. The seam is the reveal
  itself.
- **Full WYSIWYG on a tree model (ProseMirror / Lexical / TipTap).** Forks the
  source of truth away from the Markdown string; lossy for frontmatter,
  wikilinks, and math; fights any other tool editing the same file. Rejected in
  [ADR-001](./2026-09-01_adr-001-editor-architecture.md) and still rejected.
- **Hide markers with zero-width CSS instead of `Decoration.replace`.** Leaves
  the characters in the DOM, breaking CodeMirror's position mapping (it would
  count them) — the exact failure this ADR is trying to remove.
- **Flip `reveal: "never"` on immediately, no stages.** Ships broken
  boundary-editing to every consumer before the rules exist. Staged behind the
  flag instead, mirroring how ADR-004 staged its own default flip.
- **A per-construct reveal toggle** (`reveal: { emphasis: "never", links:
  "caret" }`). More surface than the problem needs; a single mode is enough
  until evidence says otherwise.
