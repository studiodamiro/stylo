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
- **2026-09-03 — Stage 1 hands-on findings.** With `"never"` and no boundary
  rules: bold / italic / strikethrough, headings (including combined with inline
  marks), and bullet / numbered / task lists all already read and edit
  seamlessly. Links render clean but there is **no way to edit the URL** yet
  (Stage 4). Two selection-bar fixes fell out: it now dismisses on scroll rather
  than chasing the selection, and it is suppressed where no inline action
  applies (a fenced-code / `$$` / frontmatter selection). Playground now
  defaults to `reveal: "never"` and `table: "cells"`.
- **2026-09-03 — Stage 4 landed (links).** The right-click menu's "Link" row is
  now a URL field flyout (`MenuField` in `context-menu.ts`): empty over a
  selection (wraps it as `[sel](url)` on Enter); prefilled with **Open link** /
  **Remove link** when the caret is inside a `[text](url)`. New `onLinkClick`
  prop (`StyloProps` → `InPlaceView` → `linkOpenFacet`); Stylo does not
  navigate. **Wikilinks still use the plain toggle** — the same field for
  `[[target|label]]` is the immediate next step. Deferred within Stage 4: a
  click / hover affordance on a collapsed link (right-click is the only route
  for now), and paste-a-URL-onto-a-selection autoformat (Stage 5).
- **2026-09-03 — Stage 4 finished (wikilinks) + Stage 2 first slice + Stage 5
  hover.** Hands-on `"never"` dogfooding surfaced three problems, now fixed:
  - _Backspace / Delete ate the marker._ Because hidden markers are atomic, the
    stock delete skipped the whole range and removed the marker itself —
    stranding its partner, and for a nested `***word***` stripping a level of
    formatting per keypress. New `edit-boundaries.ts` — a `Prec.high`
    Backspace / Delete keymap that **steps over the run of hidden markers and
    removes the real character beyond them**: Backspace at the front of a bold
    word deletes the space before it, the bold stays. Marker runs are crossed
    using the live decoration set, so `***` counts as one step. The one
    exception is deleting a wrapper's last inner character — the now-empty
    markers go with it. Covers emphasis / strong / strike / inline code /
    `[text](url)` / `[[wikilink]]`; only fires while those markers are hidden.
    First slice of Stage 2; insertion association at a hidden edge and
    line-prefix backspace still to come. Known edge: emptying a *nested*
    wrapper can leave `****`.
  - _Arrow keys stopped between adjacent hidden markers._ `EditorView.
    atomicRanges` only skips a range the caret sits *strictly* inside, so the
    `**` + `*` of a `***word***` prefix left a landable seam at their junction —
    arrow keys rested there and typing split the marks (you got italic-only
    text mid-run). `buildDecorations` now **coalesces touching replace ranges**
    into one before handing them to `atomicRanges`, so a marker run is crossed
    as a single unit. The rendered decoration set is untouched.
  - _Arrow keys "crawled" — a press that didn't move the caret._ A coalesced
    run still leaves *both* its edges as caret stops, and with the markers
    hidden the two render at the same point, so one ArrowLeft/ArrowRight looked
    like a no-op. `edit-boundaries.ts` now also handles Left/Right: when a step
    only crossed hidden markers it takes one more, so every press moves the
    caret visibly. (Left and Right settle on opposite edges of a run, which is
    invisible.)
  - _Wikilink had no target editor._ `wikiLinkRow` now mirrors `linkRow` — a
    prefilled **Wikilink** field with **Remove link** when the caret is in a
    `[[target|label]]`, an empty field that wraps a selection as
    `[[target|sel]]` (or `[[sel]]`) otherwise. Reachable from the right-click
    menu and the floating bar's wikilink button. `wikiLinkPartsIn` added
    alongside `linkPartsIn`.
  - _No way to see a collapsed link's destination._ `link-hover.ts` — a
    `hoverTooltip` (no new dependency) showing the raw `(url)` / `[[target]]`
    in a `.cm-inplace-href-tip` bubble. The hover half of Stage 5; click and
    autoformat still pending.
- **2026-09-03 — `inPlace.selectionBar` became `inPlace.selectionUI`.**
  `"menu" | "bar" | "none"`, default `"menu"`. A selection now gets exactly one
  affordance: the inline group in the right-click menu (`"menu"`), the floating
  bar with the menu's inline group suppressed (`"bar"`), or neither with only
  the toolbar (`"none"`). The old boolean always showed both the bar and the
  menu's inline group, which read as redundant. The main toolbar is unchanged
  and orthogonal — always on unless the `toolbar` prop hides it.
- **2026-09-03 — Right-click menu made word-aware.** A right-click with no
  selection now **selects the word under the pointer** (as a highlighted word
  would), so the menu acts on that word instead of showing a list of block/
  insert actions irrelevant to it.
- **2026-09-03 — Right-click menu regrouped to Obsidian's layout.** One shape
  everywhere: `Add link` / `Add external link` (the `[[…]]` and `[…](…)`
  fields), a separator, then **Format** (bold / italic / strike / code / math),
  **Paragraph** (list types / headings / quote) and **Insert** (table / divider
  / code / math / frontmatter) as submenus, a separator, then Cut / Copy /
  Paste. `classifyContext` and its `"selection" | "block" | "plain"` branching
  are gone — every item carries its own `disabled`, so an action that can't
  apply is greyed rather than the menu changing shape. **Format** groups the
  three text marks, then inline code + inline math. The whole **Insert** submenu
  is disabled (its flyout won't open) off an empty line, rather than every item
  inside greyed. Under `selectionUI: "bar"` / `"none"` the link rows and
  **Format** drop out (they live on the bar / toolbar); **Paragraph** and
  **Insert** always stay. A table cell offers **Format** + clipboard only.
- **2026-09-03 — Blank-line polish + a fenced-code Language field.** On a lone
  blank line `toggleLinePrefix` now *starts* the list / quote (it used to skip
  blank lines outright, so the bullet button did nothing on an empty line). The
  `wrap()` commands (bold / italic / strike / code / math) report `disabled`
  when the caret has no word under it — wrapping empty space just dropped a
  literal `****`. In the right-click menu, **Format** is a disabled group on a
  blank line and **Insert** is the enabled one; they swap on a line with text.
  When the caret is inside a fenced code block the menu becomes a focused
  **Language** field (edits the ` ```ts ` info string, which is otherwise hidden
  in the seamless canvas) plus **Remove code block** and clipboard —
  `fenceInfoAt` in `toolbar/fence.ts`, `codeBlockRow` in the menu.
- **2026-09-03 — "Body" command + inline-literal mutual exclusion.** New `body`
  toolbar command (`clearHeading`) strips any ATX heading prefix — the explicit
  "back to a paragraph" that toggling the active heading level did obliquely.
  It sits in **Paragraph** after the heading levels, active (checked) when the
  line is already body. Separately, `wrap()` commands now report `disabled`
  when the selection is inside an inline `` `code` `` or `$math$` span that is
  not their own — applying code inside math (or vice versa, or a text mark
  inside either) produced literal `` ` `` / `$` in the output. The span's own
  mark stays live so it can still be toggled off.
- **2026-09-03 — Stage 5 click affordance + boundary / clipboard polish.**
  - _Collapsed links had no click route to an edit._ Hover (`link-hover.ts`)
    shows the destination; there was still no way to change it without a
    right-click. `link-click.ts` — under `reveal: "never"`, a plain click on a
    collapsed `[text](url)` opens the same URL field the menu and selection bar
    use, positioned at the pointer. External links only: a wikilink click is
    navigation (`onWikiLinkClick`), and `InPlaceView` always forwards a wrapper
    handler so the extension can't distinguish "nav wanted" from "nothing
    passed" — the wikilink target stays editable via hover + right-click.
    `"caret"` mode is untouched: a click there already reveals the source on
    that line.
  - _Nested wrapper emptied to a bare `****`._ `edit-boundaries.ts` removed only
    one level of wrapper when its last inner character went, so emptying
    `***x***` left `****`. The removal now walks outward while each enclosing
    wrapper would also be left empty, taking the whole nest in one change.
  - _Menu "Paste" silently no-opped without async clipboard read._ It is now a
    disabled row with a `title` pointing at the keyboard shortcut when
    `navigator.clipboard.readText` is unavailable, rather than a live button that
    does nothing. (`MenuAction` gained an optional `title`.)
  - _Inline `$…$` math reveal_ stays caret-line-revealed under `"never"` on
    purpose: the widget replaces the whole span, so the LaTeX has no on-screen
    home and the caret line is the only way to reach it. It is a tracked
    exception until a dedicated math-source affordance lands (the parallel of the
    Stage 4 link field); the comment in `decorate.ts` records this.
- **2026-09-03 — Stage 2 completed + Stage 3 landed.**
  - _Insertion association._ `edit-insert-assoc.ts` — an `EditorState.
    transactionFilter` that redirects a single insertion sitting exactly on a
    hidden wrapper's content edge to the far side of the marker run: typing
    after a bold word gives `**bold**x`, never `**boldx**`; the mirror at the
    front gives `x**bold**`. A nested `***word***` is crossed as a unit
    (tree-walked mark run, not one level at a time). Emphasis / strong / strike /
    inline code only — a link keeps its directly editable label, so `wrapAt`
    grew an `emphasisOnly` flag. Undo / redo / table-widget serialise
    transactions are passed through untouched. This closes Stage 2 (delete- and
    arrow-over-marker landed 2026-09-03; empty-wrapper cleanup the same day).
  - _Line-prefix backspace (Stage 3)._ `edit-line-prefix.ts` — a `Prec.high`
    Backspace keymap, ahead of the step-over-markers one. At visual column 0 of
    a hidden-prefix line it removes one level instead of joining upward: heading
    → paragraph, blockquote → one `> ` out, list → outdent a step then drop the
    marker, task → paragraph. Fires only while the prefix is actually hidden, so
    `reveal: "caret"` with the caret on the line is untouched. Level / type
    changes still go through the menu, toolbar, and shortcuts.
- **2026-09-04 — Step-over-markers extended to `Shift`-arrow.** The Stage 2
  arrow fix only bound bare `ArrowLeft` / `ArrowRight`; `Shift`-arrow fell
  through to the stock `select*` commands, which park the head on the near edge
  of a hidden run just the same, so selecting across `**bold**` cost one dead
  press per marker. `arrowAcrossMarkers` in `edit-boundaries.ts` grew an
  `extend` mode — same "took only hidden markers, take one more" rule, but it
  keeps the anchor and moves the head — and the keymap now also binds
  `Shift-ArrowLeft` / `Shift-ArrowRight`. Word- and line-wise motions
  (`Alt` / `Mod` arrow) are left on the default: each jump clears a whole word,
  so they do not rest on a hidden edge.
- **2026-09-04 — …and the extra step is now allowed to leave the line.** A bold
  word as the first thing on a line still cost two presses: the run sits against
  the line start, so the "take one more" step landed on the line above and an
  over-cautious same-line guard refused it, parking the caret invisibly on the
  hidden `**`. The guard is gone — `onlyHiddenMarkers` already never spans a
  newline, so a run that reaches column 0 (or the line end, going right) now
  hands the press straight to the end of the line above / start of the line
  below, as a column-0 `ArrowLeft` should. The only remaining no-op is the very
  first line of the document, where there is genuinely nowhere further left.
- **2026-09-04 — Three hidden-marker rough edges, from hands-on use under
  `"never"`.**
  - _Right-click selects the whole marked phrase._ The word-aware right-click
    (`menu-plugin.ts`) selected only the word under the pointer, so a Bold
    toggle on `**two words**` hit just one. It now probes `wrapAt(state, pos,
    emphasisOnly)` first and, inside a hidden-marker construct, selects the
    entire content span; a plain word still selects just the word, a link keeps
    its own label.
  - _Fenced code reveals its ``` on caret entry, even under `"never"`._ The
    fence lines were replaced with nothing and collapsed on every line under
    `"never"`, with no way to see or delete a fence to unwrap the block. Fenced
    code now reads the real caret-reveal set (via a `caretRevealed` field on
    `NodeCtx`), the same standing exception the `$$` math block already has —
    the delimiter has no other on-screen affordance. Inline `` `code` `` is
    unchanged: it edits like `**bold**` and toggles from the Format menu.
  - _Table-cell right-click gained the Format group, force-enabled._ A cell's
    selection lives in the DOM, so `cmd.disabled(state)` (reading the collapsed
    `state.selection`) greyed every inline mark. `toAction` now takes an
    `inCell` flag that forces the mark rows live — the same move the floating
    selection bar makes — and the editable-table widget appends
    `cellSelectionRows(view)` (Format ▸ + clipboard) under its structural rows,
    so one menu covers the table and the selected text. The canvas menu no
    longer has a table fall-through path.
- **2026-09-04 — Follow-ups on the same three, from a second pass of use.**
  - _Phrase select works with the line revealed too._ `wrapAt` returns `null`
    when a line's markers are shown (boundary editing does not apply then), so
    under `reveal: "caret"` a right-click on a bold phrase whose line the caret
    had already revealed fell back to one word. `wrapAt` gained an
    `ignoreReveal` flag; the right-click menu passes it, since selecting a span
    is not an edit and should not care whether the markers are visible.
  - _Interleaved marks now strip in any order._ Applying bold, strike, italic
    (in that order) nests them interleaved — `**~~*word*~~**` — and removing a
    mark then failed: `wrapOp` paired the left run's *outermost* `*` group with
    the right run's *innermost* one (both were "the first group"), so the widths
    disagreed and it wrapped again instead of unwrapping, sometimes stacking
    `****` that the parser then showed literally. It now lists the mark-char
    groups outermost-first on both sides (the right run is reversed) and strips
    the outermost pair whose widths match. A 36-case apply-order × remove-order
    sweep round-trips to plain text.
  - _Right-click auto-selects the word in a table cell._ Matching the canvas: a
    right-click in the cell being edited, with nothing selected, now selects the
    word under the pointer (`selectWordAtPoint` in `table-cell-dom.ts`, using the
    existing `offsetFromPoint`), so the Format group appears without a manual
    drag. On whitespace or punctuation it leaves the caret where it is.
- **2026-09-04 — Phrase select widened to links, and to marked runs in a cell.**
  - _Links and wikilinks._ The right-click's `wrapAt` probe was `emphasisOnly`,
    so a click in `[two words](url)` or `[[Page|a label]]` fell back to one
    word. It now includes the link constructs; the selection is the label / the
    target, which is also what "Edit link" then operates on.
  - _Marked runs inside a table cell._ `selectWordAtPoint` widens the same way
    via a new `markedContentAt` string scan (`inline-ops.ts`): a right-click on
    `**bold phrase**` in a cell selects `bold phrase`, so a Format toggle covers
    the run rather than one word. The delimiters do briefly show while the cell
    holds focus for the menu — an editable cell always shows its raw Markdown
    while focused, that is how it is edited — and re-hide when focus leaves.
    Removing that flash would need a formatting path that works on the rendered
    cell through its model string; deferred until it is asked for.
- **2026-09-04 — Formatting a link now wraps the link, and renders.** Two halves
  of one bug: bolding a right-clicked link produced `[**text**](url)` (marks
  *inside* the label), and the canvas then showed those `**` literally because
  the decoration walk stopped at the `Link` node and never reached the nested
  `StrongEmphasis`.
  - `Wrap` gained a `kind` (`"mark"` | `"link"`); a right-click on a link or
    wikilink now selects the *whole* construct, so Bold / Italic / Strike wrap
    it — `**[text](url)**`, `**[[Page]]**` — never landing a mark inside a label
    that is not a Markdown context. `markedContentAt` does the same in a cell.
  - `nodes.ts` no longer returns `false` from the `Link` branch, so emphasis /
    code inside a label (`[**text**](url)`, however it got there) also has its
    markers hidden and its text styled.

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
