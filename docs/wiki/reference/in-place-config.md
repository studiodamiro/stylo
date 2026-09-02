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

| Value      | Behaviour                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"source"` | The rendered `<table>` reveals its aligned pipe source under the caret — Tab / Shift-Tab / Enter walk the cells, widths and the delimiter rebuild live. Obsidian's _Source mode_.                                                                                                                              |
| `"cells"`  | The rendered `<table>` stays on screen with `contenteditable` cells. Typing rewrites the matching Markdown, re-aligned on every keystroke; Tab / Enter move between cells, past the last cell adds a row; `↓` from the last row and `↑` from the header row return to the document. Obsidian's _Live Preview_. |

Either way a rendered cell shows inline formatting — `**bold**`, `*em*`,
`~~strike~~`, `` `code` ``, `[links]`, `[[wikilinks]]`, `$math$`. In `"source"`
mode the whole table reveals its pipe source when the caret lands on it; in
`"cells"` mode each cell swaps to its raw Markdown **while it has focus** and
re-renders on blur, so you edit the source in place. Specified in
[ADR-006](../../journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md).

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
- Structural controls on the `"cells"` widget — add/remove column, remove row,
  set alignment.
- A consumer-supplied decorator hook for custom in-place node types.

See the [in-place canvas tracker](../../journal/2026-09/2026-09-01_in-place-canvas.md)
for what each of the twelve constructs above does when it is on.
