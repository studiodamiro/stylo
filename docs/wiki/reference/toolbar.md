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

| Value               | Result                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| omitted / `true`    | The full default bar, in the built-in order.                                |
| `false`             | No bar.                                                                     |
| `{ items: [...] }`  | Exactly those items, in that order.                                         |
| `{ items, render }` | …with the rendered bar wrapped or replaced.                                 |
| `{ items, sticky }` | …fixed to the window bottom, above the keyboard. See [On touch](#on-touch). |

`items` is a list of built-in command ids with `"|"` for a separator, and — mixed
in anywhere — [custom item](#custom-items) objects. Unknown ids are skipped.

## Custom items

An entry in `items` can be an object instead of a built-in id. It runs against
the same live `EditorView` the built-ins do and reports its own pressed and
disabled state:

```tsx
import type { ToolbarCustomItem } from "@damiro/stylo"

const insertImage: ToolbarCustomItem = {
  id: "insert-image", // stable, unique — also the React key and `data-command`
  title: "Insert image", // tooltip + aria-label
  icon: <ImageIcon size={16} />, // any ReactNode
  run: (view) => openAssetPicker(view), // return value ignored
  isActive: (state) => false, // optional — drives aria-pressed / data-active
  disabled: (state) => false, // optional — renders the button disabled
}

;<Stylo value={doc} onChange={setDoc} toolbar={{ items: ["bold", "italic", "|", insertImage] }} />
```

`isActive` and `disabled` are re-read from the state on every selection, key,
and pointer change, exactly like a built-in's context check. `id` must not
collide with a built-in id or another custom item — it is used as the React key
and rendered as `data-command="<id>"` for styling and test hooks (built-in
buttons carry `data-command` too).

Custom items have **no `keys` field**. Built-in shortcuts are compiled into
CodeMirror's keymap when the editor is constructed, so a custom binding would
need its own keymap — bind it yourself against
[`getView()`](./props.md#imperative-handle) for now.

## The render slot

`toolbar.render` wraps or replaces the rendered bar:

```tsx
toolbar={{
  items: ["bold", "italic"],
  render: (bar, { view }) => (
    <div className="my-toolbar-row">
      {bar}
      <SaveStatus view={view} />
    </div>
  ),
}}
```

`bar` is the built-in `<div role="toolbar">` element. Return it wrapped, append
your own chrome next to it, or ignore it and return something else entirely.
`view` is `null` on the first render and becomes the live `EditorView` once the
editing surface mounts. `render` is called when `<Stylo>` itself re-renders — on
mount, when the view arrives, and on any prop change — not on the bar's internal
pressed-state updates.

## On touch

```tsx
<Stylo value={doc} onChange={setDoc} toolbar={{ sticky: "bottom" }} />
<Stylo value={doc} onChange={setDoc} toolbar={{ sticky: "top" }} />
```

`sticky` fixes the bar to an edge of the **window** — not to wherever
`<Stylo>` sits on the page. `true` is an alias for `"bottom"`. Off by default:
window-relative positioning is right for a full-screen editor and wrong for a
small embedded field (a comment box, a form), so turn it on deliberately
rather than it firing from a device check. Combine it with your own
responsive check (`toolbar={{ sticky: isMobileViewport && "bottom" }}`) if you
only want it below a breakpoint.

Both positions drop the bar from wrapping to a single horizontally-scrolling
row and grow each button to a 40px touch target. The editing surface gets a
matching padding on that edge so the bar's resting height doesn't sit over the
document's first or last line. Only one sticky instance is meant to be on
screen at once — two `<Stylo>` editors both set to `sticky` would stack their
bars at the same window edge.

### `"bottom"` — above the keyboard

Rides up above the on-screen keyboard as one opens, using the
`visualViewport` API (`useKeyboardInset`). Two things to know before you rely
on it:

**Pair it with a viewport meta tag.** By default, a mobile browser shrinks
only the _visual_ viewport for the keyboard, not the _layout_ viewport a plain
`position: fixed` bottom offset is computed against — `sticky` compensates
with a `visualViewport`-driven `transform`, but the more reliable fix is
telling the browser to shrink the layout viewport too:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, interactive-widget=resizes-content"
/>
```

Stylo cannot add this to your page itself — it's your `<meta>` tag, not
Stylo's — so add it yourself alongside `sticky: "bottom"`. Without it, the bar
still tracks the keyboard through `useKeyboardInset`, just with an extra layer
of browser-timing between the keyboard opening and the bar's repaint that the
meta tag sidesteps entirely.

**It can render behind a platform's own keyboard accessory bar.** iOS docks
an input accessory bar (field-navigation arrows, a Done button) directly above
the keyboard for any focused editable element. That bar is native browser
chrome, not part of the page — no `z-index` on a web element can render above
it. There is no fix for this from Stylo's side; if it matters for your layout,
use `"top"` instead.

### `"top"` — no keyboard involved at all

Pins to the top edge instead. Nothing ever eats into the top of the screen the
way a keyboard eats the bottom, so this needs no `visualViewport` tracking, no
meta tag pairing, and can't collide with a platform's accessory bar. Prefer it
over `"bottom"` unless you specifically want the bar to travel with the
keyboard.

It has its own on-device finding: a plain `position: fixed; top: 0` element
can disappear and fail to reliably reappear while scrolling on iOS Safari —
WebKit has a long-documented history of losing track of a fixed element across
its own address-bar show/hide animation (separate from the keyboard), and
separately across a nested `overflow: hidden` ancestor, which `<Stylo>`'s own
root element carries. A static `transform: translateZ(0)` on the bar (forcing
its own compositing layer — the fix `"bottom"` already gets for free from its
keyboard-tracking `translateY()`) closes the first cause but was reported
insufficient on its own. Any `sticky` bar is now also rendered through a React
portal straight onto `document.body`, so it is never a descendant of
`<Stylo>`'s root (or of whatever the host page nests `<Stylo>` inside) in the
first place — the same technique overlay libraries use for dialogs and toasts,
for the same reason. `translateZ(0)` stays on as a second, low-cost layer of
defence.

Between the selection callout racing a long-press, the input accessory bar
out-layering `"bottom"`, and two rounds of this scroll-disappearing bug, four
distinct native-chrome interactions turned up from one day of hands-on
testing — none reproducible from a headless browser. Treat `position: fixed`
pinned to the real window as powerful but squarely in the path of whatever
quirks the host browser's own chrome has; budget for a real device pass, not
just the test suite, before shipping a sticky change.

### `stickyVisibility` — fade it out when nothing is focused

```tsx
<Stylo value={doc} onChange={setDoc} toolbar={{ sticky: "top", stickyVisibility: "dynamic" }} />
```

Optional, defaults to `"consistent"` (always visible whenever `sticky` is
set). `"dynamic"` fades the bar out — `opacity`, not removed from the DOM —
while the editing surface is unfocused, and back in the moment it gains focus,
so it doesn't sit over the content while you're scrolling to read rather than
edit. Ignored when `sticky` is off.

The context menu and the table's structural menu are reachable on touch too —
a long-press opens them, the same as a right-click. See
[in-place config · On touch](./in-place-config.md#on-touch).

## Command ids

| Id              | Action                                                   | Shortcut                |
| --------------- | -------------------------------------------------------- | ----------------------- |
| `undo` / `redo` | History                                                  | `Mod-z` / `Mod-Shift-z` |
| `save`          | Call the `onSave` prop with the document                 | `Mod-s`                 |
| `h1` `h2` `h3`  | Set / swap / clear an ATX heading                        | `Mod-Alt-1..3`          |
| `body`          | Strip any heading prefix — back to a paragraph           | —                       |
| `bold`          | Wrap in `**…**`                                          | `Mod-b`                 |
| `italic`        | Wrap in `*…*`                                            | `Mod-i`                 |
| `strike`        | Wrap in `~~…~~`                                          | —                       |
| `underline`     | Wrap in `<u>…</u>` (raw HTML) — _not in the default bar_ | `Mod-u`                 |
| `code`          | Wrap in `` `…` ``                                        | —                       |
| `codeBlock`     | Fence the selected lines in ` ``` `                      | —                       |
| `link`          | `[text](url)`, or unlink                                 | `Mod-k`                 |
| `wikilink`      | `[[target]]`, or unwrap to the label                     | `Mod-Shift-k`           |
| `quote`         | Toggle a `>` line prefix                                 | —                       |
| `bulletList`    | Toggle a `-` line prefix                                 | —                       |
| `orderedList`   | Toggle a `1.` `2.` `3.` line prefix                      | —                       |
| `task`          | Toggle a `- [ ]` line prefix                             | —                       |
| `hr`            | Insert / remove a `---` divider                          | —                       |
| `frontmatter`   | Wrap the doc top in `---`, or unwrap                     | —                       |
| `table`         | Insert a starter pipe table                              | —                       |
| `math`          | Wrap in `$…$`                                            | —                       |
| `mathBlock`     | Fence the selected lines in `$$`                         | —                       |

The default bar shows every id above **except `save` and `underline`**, grouped
by kind: history · headings · inline text (with `link` and `wikilink`) · the
three list markers · block structure (`quote` `hr` `frontmatter` `table`) · code
and math.

`save` is opt-in: add it to `items` yourself. It renders **disabled** until an
[`onSave`](./props.md) prop is wired, so it stays out of the default bar rather
than sitting there greyed out for every consumer. `Mod-s` triggers the
same path with or without the button; with no `onSave` handler it does nothing and
the browser keeps the key. A "saved / saving" status pill is not built in — see
the [auto-save guide](../guides/autosave.md).

`underline` is opt-in for a different reason: Markdown has no underline, so the
command writes a raw `<u>…</u>` HTML pair. That renders underlined wherever the
consuming app renders inline HTML (Obsidian, GitHub, anything running
`rehype-raw` or similar). Stylo's own bundled `preview` does **not** enable raw
HTML, so `<u>` tags there show through as text — enable it only if your render
path handles inline HTML. `Mod-u` is bound on every editing surface (like the
other inline shortcuts) whether or not the button is shown.

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
disabled, since `` `**x**` `` / ``$`x`$`` are not valid; the span's own
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
amended 2026-09-02 to the single-`items`-list shape, 2026-09-04 to allow custom
item objects in that list plus a `render` slot, and 2026-09-04 again for the
`sticky` touch mode. Build notes:
[toolbar milestone](../../journal/2026-09/2026-09-02_toolbar.md).
