---
title: "In-place canvas configuration"
created: 2026-09-01
type: wiki-reference
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# In-place canvas configuration

The `inPlace` prop turns individual [in-place canvas](../architecture/overview.md)
decoration types off, leaving that construct rendered exactly as it appears in
`mode="source"` — plain text, no cursor-reveal behaviour, nothing atomic.
Specified in [ADR-005](../../journal/2026-09/2026-09-01_adr-005-in-place-decoration-toggles.md).

```tsx
<Stylo
  value={doc}
  onChange={setDoc}
  inPlace={{
    decorations: { tables: false, frontmatter: false },
    table: "cells",
    reveal: "caret",
    contextMenu: true,
    selectionUI: "menu",
  }}
/>
```

## `inPlace.decorations`

Every key is optional and defaults to `true`.

| Key              | Turns off                                                            |
| ---------------- | -------------------------------------------------------------------- |
| `headings`       | ATX heading sizing and `#` hiding                                    |
| `emphasis`       | bold / italic / strikethrough / inline-code styling                  |
| `links`          | `[text](url)` collapse to the link text                              |
| `wikilinks`      | `[[target\|label]]` collapse to the label                            |
| `math`           | `$…$` and `$$…$$` KaTeX widgets                                      |
| `lists`          | `-` / `*` / `+` bullet-glyph substitution                            |
| `tasks`          | interactive `[ ]` / `[x]` checkboxes                                 |
| `blockquote`     | left-border / muted framing, `>` hiding off-caret, and callouts      |
| `horizontalRule` | the rendered `<hr>`                                                  |
| `code`           | inline `` `code` `` styling and the fenced / indented code container |
| `frontmatter`    | the recessed in-place styling of the leading YAML block              |
| `tables`         | the rendered `<table>`                                               |

## `inPlace.table`

How the caret entering a table behaves. Optional, defaults to `"source"`.

| Value      | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"source"` | The rendered `<table>` reveals its aligned pipe source under the caret — Tab / Shift-Tab / Enter walk the cells, widths and the delimiter rebuild live. Obsidian's _Source mode_.                                                                                                                                                                                                                                                                                    |
| `"cells"`  | The rendered `<table>` stays on screen with `contenteditable` cells. Typing rewrites the matching Markdown, re-aligned on every keystroke; Tab / Enter move between cells, past the last cell adds a row; `↓` from the last row and `↑` from the header row return to the document. Hovering the table shows an edge `+` to append a column or row; right-click (or long-press on touch) a cell for insert, delete, and column alignment. Obsidian's _Live Preview_. |

Either way a rendered cell shows inline formatting — `**bold**`, `*em*`,
`~~strike~~`, `` `code` ``, `[links]`, `[[wikilinks]]`, `$math$`. In `"source"`
mode the whole table reveals its pipe source when the caret lands on it; in
`"cells"` mode each cell swaps to its raw Markdown **while it has focus** and
re-renders on blur, so you edit the source in place. With a cell focused the
toolbar's inline buttons and their shortcuts (`Mod-b`, `Mod-i`, `Mod-k`,
`Mod-Shift-k`) wrap the cell's selection; `codeBlock` / `mathBlock` degrade to
inline `` `code` `` / `$math$` there. Specified in
[ADR-006](../../journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md).

## `inPlace.contextMenu`

Optional, defaults to `true`. A right-click inside the canvas opens Stylo's own
menu instead of the browser's. It has **one shape everywhere** (Obsidian's
layout), so nothing jumps around:

| Row                  | Opens                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **Add link**         | A `[[target]]` field. Prefilled + **Remove link** and labelled **Edit link** when the caret is in one. |
| **Add external link** | A `[text](url)` field. Prefilled + **Open link** (fires `onLinkClick`) + **Remove link**, labelled **Edit external link**, when the caret is in one. |
| **Format** ›         | Bold · Italic · Strikethrough · Inline code · Inline math                                     |
| **Paragraph** ›      | Bulleted / Numbered / Task list · Heading 1–3 · **Body** (strip the heading) · Blockquote      |
| **Insert** ›         | Table · Divider · Code block · Block math · Frontmatter — **greyed unless the line is empty** |
| **Cut / Copy / Paste** | Clipboard                                                                                  |

A right-click with no selection first **selects the word under the pointer**, so
the menu acts on that word. Items that can't produce valid Markdown where the
caret sits are shown greyed. On a **blank line** the whole **Format** group is
disabled and **Insert** is the live one (they swap on a line with text); on a
bare caret with no word, the marks are disabled too. Inside an inline
`` `code` `` / `$math$` span every other mark is disabled. Under
`selectionUI: "bar"` or `"none"` the link rows and **Format** are dropped from
the menu (they live on the floating bar or the toolbar); **Paragraph** and
**Insert** always stay.

Two contexts replace the whole menu: a right-click in an **editable table cell**
offers **Format** + clipboard only, and a right-click **inside a fenced code
block** offers a **Language** field (edits the ` ```lang ` info string) with
**Remove code block**, plus clipboard. A right-click outside the text area gets
the browser's own menu. Set `contextMenu: false` to keep the browser menu
everywhere.

### Picking and ordering the groups

`contextMenu` also takes an object to choose which top-level groups appear and
in what order:

```tsx
inPlace={{ contextMenu: { groups: ["paragraph", "insert", "clipboard"] } }}
```

`groups` is any subset of `"link" | "format" | "paragraph" | "insert" |
"clipboard"`, in the order you want them (separated in the rendered menu). Omit
it for all five in the default order. `link` and `format` still yield to
`selectionUI` — listing them has no effect when the marks live on the bar or the
toolbar. The table-cell and fenced-code contexts honour `format` / `clipboard`
from the list but are otherwise fixed.

## `inPlace.selectionUI`

Optional, defaults to `"menu"`. Picks the affordance a non-empty text selection
gets. Only one applies at a time, so the same buttons never appear twice.

| Value    | A selection gets                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------- |
| `"menu"` | The inline-mark group inside the right-click menu (bold / italic / strike / code, Link and Wikilink fields, inline math). No floating bar. |
| `"bar"`  | A floating bar above the selection with those same inline-mark buttons; the right-click menu drops its inline group. |
| `"none"` | Neither — the main toolbar is the only formatting surface.                                          |

The main editor toolbar is independent of this setting: it is always present
unless hidden through the `toolbar` prop, and it always acts on the current
selection.

The floating bar's link and wikilink buttons open the same URL / target field
the right-click menu uses, rather than dropping a `[text](url)` / `[[target]]`
placeholder.

The bar also follows a text selection **inside an editable table cell**
(`table: "cells"`), where the mark buttons apply to the cell; the link and
wikilink buttons there fall back to the plain toggle, since the field editor
works on the document selection.

### `inPlace.selectionBarItems`

Optional. An ordered subset of `bold` / `italic` / `strike` / `code` / `link` /
`wikilink` / `math` — the bar shows exactly these, in this order. Omit for all
seven. Unknown ids are ignored; an empty or all-invalid list falls back to the
default.

```tsx
inPlace={{ selectionUI: "bar", selectionBarItems: ["bold", "italic", "link"] }}
```

Both surfaces are styled through stable class names — `.cm-inplace-menu`,
`.cm-inplace-menu-item`, `.cm-inplace-selbar`, `.cm-inplace-selbar-btn` — and
inherit the `--stylo-*` tokens. Specified in the
[right-click menu and selection bar note](../../journal/2026-09/2026-09-03_context-menu-and-selection-bar.md)
and the [ADR-002 §Deferred amendment](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md).

## Callouts

A blockquote whose first line is `> [!type]` (optionally `> [!type] Title`, or a
`-` / `+` fold marker that Stylo parses but ignores) renders as a tinted box on
both the in-place canvas and the preview surface. The many Obsidian type names
collapse to five colour buckets — `note`, `tip`, `warn`, `danger`, `example` —
and the raw type is kept on a `data-callout` attribute that a `::before` label
reads. Off-caret the `[!type]` token is hidden and the rest of the line is the
title. Gated by `decorations.blockquote`.

Style hooks: `.cm-inplace-callout` / `.cm-inplace-callout-<bucket>` /
`.cm-inplace-callout-head` on the canvas, `.stylo-callout` /
`.stylo-callout-<bucket>` in preview. Each bucket sets `--stylo-callout-accent`
from `--stylo-callout-<bucket>` (`#3b82f6` / `#22c55e` / `#f59e0b` / `#ef4444` /
`#a855f7` by default) — override either level to reskin.

## Link & wikilink hover

Hovering a link or `[[wikilink]]` in the canvas shows a small bubble with its
destination — the raw `(url)` or the `[[target]]`. Under `reveal: "never"` that
destination is otherwise never on screen, so this is the way to read it without
turning the link into an edit. Gated by `decorations.links` /
`decorations.wikilinks`; styled through `.cm-inplace-href-tip`.

## Applied at mount

The config is read once, when the in-place canvas is constructed. Changing
`inPlace` on an already-mounted `<Stylo>` has no effect until the component
remounts — give it a `key` derived from the config if you need it to react to
a toggle change live.

## Not in this pass

Deferred, each its own later decision:

- `inPlace.reveal` — `"line" | "node"` cursor-reveal granularity.
- `inPlace.frontmatter` — a `source` / `inline` / `properties` display mode; the
  `properties` panel needs YAML parsing and its own dependency.
- Drag-to-reorder rows / columns and multi-cell selection on the `"cells"` widget.
- A consumer-supplied decorator hook for custom in-place node types.

See the [in-place canvas tracker](../../journal/2026-09/2026-09-01_in-place-canvas.md)
for what each of the twelve constructs above does when it is on.
