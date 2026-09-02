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
    contextMenu: true,
    selectionBar: true,
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
| `blockquote`     | left-border / muted framing, and `>` hiding off-caret                |
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

Optional, defaults to `true`. A right-click inside the canvas opens a
context-aware Stylo menu instead of the browser's:

| Where you right-click                        | The menu offers                                              |
| -------------------------------------------- | ----------------------------------------------------------- |
| Over a selection                             | Inline marks (bold / italic / strike / code / link / wikilink / math) + Cut / Copy / Paste |
| In a code block, quote, list, heading, divider, `$$` math, or frontmatter | That block's toggles + an **Insert** submenu + clipboard |
| In a plain paragraph                         | **Insert** (table / divider / code block / block math / frontmatter) + clipboard |
| In a table cell, caret only                  | Insert / delete row · column, column alignment              |
| In a table cell, with text selected          | Inline marks + clipboard                                    |
| Outside the text area                        | The browser's own menu                                      |

Set `false` to keep the browser's menu everywhere. The menu carries the same
enabled / active state as the toolbar — an action that can't produce valid
Markdown at that spot is shown greyed or left out.

## `inPlace.selectionBar`

Optional, defaults to `true`. A floating bar appears above a non-empty text
selection (below it near the top of the editor) with the inline-mark buttons
only — bold, italic, strikethrough, inline code, link, wikilink, inline math.
Block and insert actions are on the right-click menu, not here. Set `false` to
turn the bar off.

Both surfaces are styled through stable class names — `.cm-inplace-menu`,
`.cm-inplace-menu-item`, `.cm-inplace-selbar`, `.cm-inplace-selbar-btn` — and
inherit the `--stylo-*` tokens. Specified in the
[right-click menu and selection bar note](../../journal/2026-09/2026-09-03_context-menu-and-selection-bar.md)
and the [ADR-002 §Deferred amendment](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md).

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
