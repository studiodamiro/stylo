---
title: "Formatting toolbar"
created: 2026-09-02
type: wiki-reference
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# Formatting toolbar

A formatting bar sits above every editing surface — `source`, `in-place`, and
the source pane of `split`. `preview` never shows one. It carries no document
state: each button runs a command against the live CodeMirror view, and its
pressed state is read back from the document around the selection.

```tsx
<Stylo value={doc} onChange={setDoc} /> // full default bar
<Stylo value={doc} onChange={setDoc} toolbar={false} /> // no bar
<Stylo
  value={doc}
  onChange={setDoc}
  toolbar={{ items: ["bold", "italic", "|", "h2", "link", "bulletList", "task"] }}
/>
```

## The `toolbar` prop

| Value              | Result                                       |
| ------------------ | -------------------------------------------- |
| omitted / `true`   | The full default bar, in the built-in order. |
| `false`            | No bar.                                      |
| `{ items: [...] }` | Exactly those items, in that order.          |

`items` is a list of command ids with `"|"` for a separator. Unknown ids are
skipped.

## Command ids

| Id              | Action                               | Shortcut                |
| --------------- | ------------------------------------ | ----------------------- |
| `undo` / `redo` | History                              | `Mod-z` / `Mod-Shift-z` |
| `h1` `h2` `h3`  | Set / swap / clear an ATX heading    | `Mod-Alt-1..3`          |
| `body`          | Strip any heading prefix — back to a paragraph | —             |
| `bold`          | Wrap in `**…**`                      | `Mod-b`                 |
| `italic`        | Wrap in `*…*`                        | `Mod-i`                 |
| `strike`        | Wrap in `~~…~~`                      | —                       |
| `code`          | Wrap in `` `…` ``                    | —                       |
| `codeBlock`     | Fence the selected lines in ` ``` `  | —                       |
| `link`          | `[text](url)`, or unlink             | `Mod-k`                 |
| `wikilink`      | `[[target]]`, or unwrap to the label | `Mod-Shift-k`           |
| `quote`         | Toggle a `>` line prefix             | —                       |
| `bulletList`    | Toggle a `-` line prefix             | —                       |
| `orderedList`   | Toggle a `1.` `2.` `3.` line prefix  | —                       |
| `task`          | Toggle a `- [ ]` line prefix         | —                       |
| `hr`            | Insert / remove a `---` divider      | —                       |
| `frontmatter`   | Wrap the doc top in `---`, or unwrap | —                       |
| `table`         | Insert a starter pipe table          | —                       |
| `math`          | Wrap in `$…$`                        | —                       |
| `mathBlock`     | Fence the selected lines in `$$`     | —                       |

The default bar shows every id above, grouped by kind: history · headings ·
inline text (with `link` and `wikilink`) · the three list markers · block
structure (`quote` `hr` `frontmatter` `table`) · code and math.

`Mod` is `Cmd` on macOS and `Ctrl` elsewhere. The shortcuts are bound on the
CodeMirror surface whether or not the visible bar is mounted; `toolbar={false}`
does not remove them.

### Context-aware buttons

A button renders **disabled** (and its shortcut is inert) when the command can't
produce valid Markdown at the caret. What's disabled depends on the line the
caret is on:

| Caret in…                   | Disabled                                                                              | Notes                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| plain paragraph             | nothing                                                                               | —                                                                       |
| **table** cell              | `h1`–`h3`, `quote`, `bulletList`, `orderedList`, `task`, `hr`, `frontmatter`, `table` | inline commands work; `codeBlock` / `mathBlock` **degrade** (see below) |
| **heading** line            | `bulletList`, `orderedList`, `task`, `codeBlock`, `mathBlock`, `frontmatter`, `table` | `h1`–`h3` (the toggle), `quote`, `hr`, and inline stay live             |
| **frontmatter** `---` block | everything except `frontmatter` itself                                                | `frontmatter` stays live so you can toggle the block off                |
| **fenced code** block       | everything except `codeBlock`                                                         | `codeBlock` stays live to unwrap the fence                              |
| **`$$` math** block         | everything except `mathBlock`                                                         | `mathBlock` stays live to unwrap                                        |

**Degrade in a table:** `codeBlock` and `mathBlock` aren't disabled in a cell —
they wrap the selection in inline `` `code` `` / `$math$` instead of a fenced
block. Outside a table they still fence whole lines.

The context check is a line scan plus a syntax-tree lookup, run whenever the
selection, keys, or pointer move.

Every command toggles. The line-prefix commands operate on whole lines: they add
the prefix to the lines in the selection that lack it, and strip it when every
non-blank selected line already carries it; `orderedList` numbers them `1.`,
`2.`, `3.` rather than stamping `1.` on each. `bulletList`, `orderedList`, and
`task` are **mutually exclusive** — pressing one on a line that already has
another list marker swaps the marker in place rather than stacking a second one.
Heading levels swap the same way — `h2` on an `# ` line rewrites it to `## `.
`link` with the caret inside a `[label](url)` **unlinks** it: the label stays,
the `](url)` wrapper is removed. `wikilink` behaves the same for `[[target]]` /
`[[target|label]]` — the display text is kept, the brackets and any `|label` go.
The `bold` / `italic` / `strike` marks **nest** rather than consume one another:
`italic` on `**word**` gives `***word***`, and toggling one mark back off leaves
the others intact. `code` and `math` do **not** nest — inside an inline
`` `…` `` or `$…$` span every other mark (including the other of the two) is
disabled, since `` `**x**` `` / `` $`x`$ `` are not valid; the span's own
button stays live to toggle it off. `codeBlock` and `mathBlock` unwrap when the
caret is inside their fence pair. `hr` drops the divider on its own line,
inserting a blank line first when the current line has text so CommonMark reads
a thematic break rather than a setext H2; with the caret on an existing `---` it
removes it.

`frontmatter` toggles the leading `---` YAML block. With none present, the top
of the document — line 1 through the last selected line — is wrapped in `---`
fences, so you can type the keys, select them, and click. With a block present,
only the two fence lines are removed; the YAML text stays in the document.
Keeping frontmatter out of rendered output is the `preview` pipeline's job (it
already strips it), not this toggle's.

## Editing tables

`table` drops a 2-column starter (header, delimiter, one empty row) and selects
`Column 1`. While the caret is inside any pipe table — on every CodeMirror
surface, `toolbar={false}` or not:

- **Tab** / **Shift-Tab** move to the next / previous cell, wrapping across
  rows. Tab past the last cell **adds a row**.
- **Enter** moves to the cell below, **adding a row** at the bottom.
- Every edit **re-aligns the pipes** — each column padded to its widest cell,
  the delimiter rebuilt with the right `:` alignment markers — in the same
  undo step as the edit.

Outside a table, Tab and Enter behave normally. Editing happens on the raw
pipe source (kept tidy); an interactive rendered-table editor is
[ADR-006](../../journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md).

## Replacing icons

The built-in glyphs are inline SVG (`H1`/`H2`/`H3` are text; `fm` is monospace). No
icon package is bundled. Override any subset with the `icons` prop, keyed by
command id:

```tsx
import { Bold, Italic, CheckSquare } from "lucide-react"

;<Stylo
  value={doc}
  onChange={setDoc}
  icons={{
    bold: <Bold size={16} />,
    italic: <Italic size={16} />,
    task: <CheckSquare size={16} />,
  }}
/>
```

Any id you leave out keeps its default glyph.

### Reserved glyphs

Two glyphs are drawn in the house style but not yet wired, pending the deferred
`save` and `preview` toolbar items (ADR-002 §2). When those commands land they
drop straight into `DEFAULT_ICONS`:

```tsx
save: <Svg d="M5 3h11l3 3v15H5z|M8 3v6h7V3|M8 21v-6h8v6" />
preview: <Svg d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
```

## Styling

The bar is structural CSS driven by the `--stylo-*` tokens (see
[props](./props.md)). It reads `--stylo-bg`, `--stylo-border`,
`--stylo-text-muted` / `--stylo-text`, `--stylo-accent` (the pressed state), and
`--stylo-ring` (keyboard focus).

## Background

The declarative-toolbar decision is
[ADR-002 §2](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md),
amended 2026-09-02 to the single-`items`-list shape. Build notes:
[toolbar milestone](../../journal/2026-09/2026-09-02_toolbar.md).
