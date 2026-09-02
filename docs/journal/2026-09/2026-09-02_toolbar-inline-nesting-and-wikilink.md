---
title: "Toolbar — inline marks nest, and a wikilink button"
created: 2026-09-02
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# Toolbar — inline marks nest, and a wikilink button

Two toolbar changes, unrelated to the table work they ship alongside.

## Inline marks were eating each other

`toggleWrap` (bold `**`, italic `*`, strike `~~`, code `` ` ``, inline math
`$`) decides between _wrap_ and _unwrap_ by looking at the characters flanking
the selection. Its "the marks sit just outside" check matched a bare
`sliceDoc(from - m, from) === mark`, so applying **italic** to an already-bold
`**word**` saw a `*` on each side — the inner asterisk of `**` — and _stripped_
it, leaving `*word*`. Bold-then-italic silently deleted the bold. Italic-then-
bold happened to work only because there was no second `*` to satisfy the
`=== "**"` test.

### Fix

`surroundsExactly(before, after, m)` gates both unwrap branches (marks inside
the selection, and marks just outside): a run of the mark character on each side
counts as a strippable instance only when it is long enough — `>= m` for the
two-char marks, and an **odd** length for `*`, since `*x*` and `***x***` carry a
lone italic asterisk but `**x**` does not. So:

- `italic` on `**word**` → `***word***` (nests; run of 2 is even, so wrap)
- `italic` on `***word***` → `**word**` (run of 3 is odd, so strip one)
- `bold` on `***word***` → `*word*` (run of 3 ≥ 2, strip two)
- every mark toggles back off cleanly from any nesting order

## Wikilink button

There was a `link` command for `[text](url)` but nothing for `[[target]]`,
despite wikilinks being a first-class Stylo construct (`onWikiLinkClick`, the
in-place collapse, `remark-wikilink`). Added `wikilink`:

- Registered in `commands.ts` next to `link`, shortcut `Mod-Shift-k`, default
  icon a `[[` double-bracket glyph in `icons.tsx` (matching Wikimedia's
  `Wikilink.svg`), and a slot after `link` in `DEFAULT_TOOLBAR_ITEMS`.
- `toggleWikiLink` / `wikiLinkActive` in `inline.ts` wrap the selection as
  `[[selection]]` (or `[[target]]` when empty) with the target text selected;
  with the caret inside a `[[target|label]]` they unwrap to the display text —
  the label if present, else the target — mirroring how `link` unlinks.
- `wikiLinkAt` scans the caret's line with the shared `WIKILINK_PATTERN` from
  `src/wikilink.ts`, so it never drifts from the render and in-place scanners.

## Verification

`typecheck`, 110 Vitest tests (9 new in `test/toolbar.test.tsx` — bold/italic
nesting in both orders, bold+italic+strike on then off, toggling one mark off
mid-stack, and the three wikilink cases), `build`, `format:check`. Confirmed in
a real Chromium against the playground: `Bold` then `Italic` yields
`***word***`, and the wikilink button wraps and unwraps.
