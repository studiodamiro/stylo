---
title: "<Stylo> props"
created: 2026-09-01
type: wiki-reference
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# `<Stylo>` props

`<Stylo>` is a **controlled** component. It never holds a parsed document model —
`value` is the Markdown string and the single source of truth.

```tsx
import { Stylo } from "@damiro/stylo"
import "@damiro/stylo/styles.css"
import "@damiro/stylo/katex.css" // only if you use math in preview

;<Stylo value={doc} onChange={setDoc} />
```

| Prop              | Type                                                                                            | Default      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`           | `string`                                                                                        | _required_   | The canonical Markdown document.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `onChange`        | `(next: string) => void`                                                                        | _required_   | Called with the complete Markdown string on every edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `mode`            | `"in-place" \| "source" \| "preview" \| "split"`                                                | `"in-place"` | Which view to show. **`in-place`** (default) is the live decoration canvas: headings, emphasis, links / wikilinks, `$…$` / `$$…$$` math, rules, blockquotes, list bullets, task checkboxes, and GFM tables render in the surface, with the raw source revealed under the caret. A fenced code block stays as editable source (syntax-highlighted, not replaced); rendered table cells show inline formatting, and in `inPlace.table: "cells"` mode a cell swaps to its raw Markdown while it has focus ([ADR-004](../../journal/2026-09/2026-09-01_adr-004-in-place-decoration-canvas.md), [tracker](../../journal/2026-09/2026-09-01_in-place-canvas.md)). **`source`** is the plain CodeMirror surface and loads no render chunk. **`preview`** and **`split`** render with `react-markdown`; `split` expects the root element to have a bounded height. |
| `onWikiLinkClick` | `(target: string) => void`                                                                      | —            | Fired when a `[[wikilink]]` is activated in the preview or the in-place canvas. `target` is the part before `\|`. Stylo does no navigation itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `onLinkClick`     | `(href: string) => void`                                                                        | —            | Fired by the in-place link editor's **Open link** action (right-click a `[text](url)` link → **Link** → the URL flyout). `href` is the link target. Stylo does no navigation itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `onSave`          | `(value: string) => void`                                                                       | —            | Called with the full Markdown string on `Cmd/Ctrl+S` from any editing surface; the browser's own save dialog is then suppressed. Omit it and `Cmd/Ctrl+S` keeps its default browser behaviour. Stylo holds no dirty state — compare `value` against your last-saved copy. A debounced auto-save hook is deferred; debounce `onChange` yourself for that.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `onFrontmatter`   | `(raw: string \| null) => void`                                                                 | —            | Called on mount and whenever the leading `---` YAML block changes, with its inner text (no fences), or `null` when absent. Stylo does not parse it — pass `raw` to your own YAML parser. Fires in every mode. See [Parsing frontmatter](#parsing-frontmatter).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `inPlace`         | `InPlaceConfig`                                                                                 | —            | Turns individual in-place decoration types off (`decorations`), and picks how the caret entering a table behaves (`table: "source"` \| `"cells"`, default `"source"` — see [ADR-006](../../journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md)). Read once, when the canvas mounts. See [in-place configuration](./in-place-config.md) ([ADR-005](../../journal/2026-09/2026-09-01_adr-005-in-place-decoration-toggles.md)).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `toolbar`         | `boolean \| { items?: (ToolbarCommandId \| "\|")[] }`                                           | `true`       | The formatting bar above the editing surface (`source`, `in-place`, `split`; never `preview`). Omit or `true` for the full default set, `false` to hide it, or `{ items }` to pick and order the buttons. Keyboard shortcuts (`Mod-b`/`i`/`k`, `Mod-Alt-1..3`, `Mod-f` for find / replace) stay bound regardless. See [formatting toolbar](./toolbar.md) ([ADR-002 §2](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md)).                                                                                                                                                                                                                                                                                                                                                                                                          |
| `icons`           | `Partial<Record<ToolbarCommandId, ReactNode>>`                                                  | —            | Replace individual toolbar glyphs, keyed by command id. Any id left out keeps its built-in inline-SVG icon — Stylo ships no icon dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `frontmatter`     | `"hidden" \| "code"`                                                                            | `"hidden"`   | How `preview` (and `split`'s preview pane) shows the leading `---` YAML block. `"hidden"` drops it; `"code"` renders the raw block as `<div class="stylo-frontmatter">` above the body. Restyle it with your own CSS (see below). For structured data use `onFrontmatter`; Stylo bundles no YAML parser ([ADR-001](../../journal/2026-09/2026-09-01_adr-001-editor-architecture.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `codeLanguages`   | `readonly LanguageDescription[] \| ((info: string) => Language \| LanguageDescription \| null)` | —            | Grammars for fenced-code sub-highlighting, forwarded verbatim to `@codemirror/lang-markdown`. Stylo bundles none — pass your own set (`codeLanguages={languages}` from `@codemirror/language-data`, or a hand-built list). Affects the CodeMirror surfaces (`source`, `split`, `in-place`); `preview` is unaffected. Read once, at mount. See [fenced-code highlighting](./code-languages.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `wikiLinkSource`  | `(query: string) => readonly WikiLinkCompletion[] \| Promise<…>`                                | —            | Enables `[[wikilink]]` autocomplete on the CodeMirror surfaces. Called with the target typed so far while the caret is inside an unclosed `[[…`; return your index's matches, already ordered (Stylo does not re-rank or filter). May be async. Off when omitted. Read once, at mount. See [Wikilink autocomplete](#wikilink-autocomplete).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tagSource`       | `(query: string) => readonly TagCompletion[] \| Promise<…>`                                     | —            | Enables `#tag` autocomplete on the CodeMirror surfaces, mirroring `wikiLinkSource`'s contract exactly. Called with the tag typed so far while the caret is inside an unclosed `#…`; return your index's matches, already ordered. May be async. Off when omitted. Read once, at mount. See [Tag autocomplete](#tag-autocomplete).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `embedSource`     | `(ref: string) => ReactNode \| Promise<ReactNode>`                                              | —            | Resolves `![[ref]]` embeds for `preview`, `split`, and the in-place canvas. Called with the raw reference (`Note#Heading`, `pic.png\|320` — suffixes intact); return a node to render in its place, or `null` to keep it literal. May be async. Off when omitted. Recognised only when the `![[…]]` is alone on its line. See [Embeds](#embeds).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `onResolveError`  | `(error: unknown, info: ResolveErrorInfo) => void`                                              | —            | Called when `embedSource`, `wikiLinkSource`, or `tagSource` throws or rejects. `info.source` names which one; `info.input` is the `![[ref]]` reference or the `[[` / `#` query. Observation only — the resolver still falls back (literal text, or no completions). A `null` return is not an error. Reactive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `readOnly`        | `boolean`                                                                                       | `false`      | Render the source surface read-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `placeholder`     | `string`                                                                                        | —            | Shown when the document is empty (source surface).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `className`       | `string`                                                                                        | —            | Added to the root element alongside the internal classes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `canvasHeader`    | `(ctx: { view: EditorView \| null }) => ReactNode`                                              | —            | Host content docked inside the editing surface (`source`, `in-place`, `split`'s source pane; never `preview`) — after the find / replace panel, before the document body. See [Canvas header](#canvas-header) ([ADR-010](../../journal/2026-09/2026-09-12_adr-010-canvas-header-panel.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Config applied at mount

Four props feed the CodeMirror extension configuration and are read **once**,
when the editing surface is constructed: **`inPlace`**, **`codeLanguages`**,
**`wikiLinkSource`**, and **`tagSource`**. Changing any of them on a live
`<Stylo>` has no effect. To
apply a change, give the component a `key` derived from the config so React
remounts it:

```tsx
<Stylo key={mode + JSON.stringify(inPlace)} value={doc} onChange={setDoc} inPlace={inPlace} />
```

Everything else — `value`, `onChange`, every callback, `readOnly`,
`placeholder`, `toolbar`, `icons`, `className`, `embedSource` — is fully reactive
and needs no remount. `embedSource` in particular: the preview is a pure function
of its props, so keep the function identity stable or the render pipeline rebuilds
each frame. (On the in-place canvas `embedSource` is read once at mount, like
`wikiLinkSource` — a later change to it is not picked up there without a remount.)
The rationale for keeping `inPlace` mount-time (rather than a
live-reconfiguration path) is in the
[ADR-005 config-lifecycle amendment](../../journal/2026-09/2026-09-01_adr-005-in-place-decoration-toggles.md).

**A `key` remount is the wrong tool when the backing data changes often.** It
fits `inPlace` and `codeLanguages` — configuration that rarely changes and is
cheap to reconstruct. `wikiLinkSource`, `tagSource`, and `embedSource` are usually backed by
something that changes on every edit or a background refetch (a note index, a
file tree); keying on it would remount the editor on every change and drop
cursor position, undo history, and scroll. Keep the resolver's identity stable
instead — hold the live data in a ref and read through it from a
`useCallback` with an empty dependency array:

```tsx
const treeRef = useRef(tree)
treeRef.current = tree // always current; the callback below never changes

const wikiLinkSource = useCallback((query: string) => searchTree(treeRef.current, query), [])

return <Stylo value={doc} onChange={setDoc} wikiLinkSource={wikiLinkSource} />
```

## Wikilink autocomplete

Pass `wikiLinkSource` to complete `[[wikilinks]]` from your own index. Stylo owns
the trigger (an unclosed `[[…`) and the insert; the host owns the search.

```tsx
type WikiLinkCompletion = { target: string; label?: string }
;<Stylo
  value={doc}
  onChange={setDoc}
  wikiLinkSource={(query) =>
    vault.search(query).map((note) => ({ target: note.path, label: note.title }))
  }
/>
```

- Called with the text typed after `[[`, before any `|`. Return matches
  **already ordered** — `filter: false` is set, so Stylo shows them verbatim.
  Return `[]` for no matches (the popup closes).
- May be `async`; debouncing a network source is the host's call.
- On accept: `[[target]]`, or `[[target|label]]` when `label` is set and differs
  from `target`. A `]]` the user already typed is reused, not duplicated.
- Works on `source`, `split`, and the `in-place` canvas. Inert inside fenced code
  (it is a Markdown-language completion source). `![[embed]]` transclusion is a
  separate prop — see [Embeds](#embeds).
- Uses `@codemirror/autocomplete`, a regular dependency that dedupes onto the
  host's CodeMirror copy.

## Tag autocomplete

Pass `tagSource` to complete `#tags` from your own index — the same
trigger-while-typing UX as `wikiLinkSource`, retriggered on `#` instead of `[[`.

```tsx
type TagCompletion = { tag: string }
;<Stylo
  value={doc}
  onChange={setDoc}
  tagSource={(query) => tagIndex.search(query).map((tag) => ({ tag }))}
/>
```

- Called with the text typed after `#`. Return matches **already ordered** —
  `filter: false` is set, so Stylo shows them verbatim. Return `[]` for no
  matches (the popup closes).
- May be `async`; debouncing a network source is the host's call.
- On accept: the query is replaced with `tag` — no closing delimiter, unlike
  `[[wikilink]]`. No `label`/alias field either: tags have no `#tag|alias`
  syntax.
- Never fires on a `# Heading` marker — the space right after `#` breaks the
  match before any heading text is typed — or mid-word (`word#word`, a URL
  fragment such as `page.md#section`), since the trigger requires `#` to sit at
  the start of a line or after whitespace. Also skips a `#` immediately
  followed by a digit (`#1234`), which reads as an issue or anchor reference,
  not a tag.
- Works on `source`, `split`, and the `in-place` canvas. Inert inside fenced
  code, for the same reason `wikiLinkSource` is.
- Shares the `autocompletion()` extension and its tooltip styling with
  `wikiLinkSource` — no separate CSS to theme.

## Embeds

`![[ref]]` is Obsidian's transclusion syntax — pull another note, a heading, a
block, or an image in where the `![[…]]` sits. Stylo has no vault, so it cannot
resolve `ref` on its own (the same split as `[[wikilinks]]`: Stylo detects,
the host resolves). Pass **`embedSource`** and it is called with the raw
reference; return a React node to render in the embed's place.

```tsx
;<Stylo
  value={doc}
  onChange={setDoc}
  embedSource={(ref) => {
    const [path, size] = ref.split("|") // "Note#Heading", "diagram.png|320"
    if (/\.(png|jpe?g|svg|webp)$/i.test(path)) {
      return <img src={vault.assetUrl(path)} width={size ? Number(size) : undefined} alt="" />
    }
    const note = vault.resolve(path)
    return note ? <Stylo mode="preview" value={note.body} onChange={() => {}} /> : null
  }}
/>
```

- The **raw reference** goes to `embedSource` verbatim — `#heading`, `#^blockid`,
  and `|size` suffixes intact. Stylo does not parse them (in an embed `|` is a
  size hint, not a label, so `WIKILINK_PATTERN` does not apply). Parse what you
  need.
- May be `async` (a vault lookup, a `fetch`). While it resolves — and if it
  rejects or resolves to `null` — the literal `![[ref]]` text stands in, so a
  reference is never silently dropped.
- **Resolutions are cached by `ref`** (per `embedSource` identity), so an embed
  scrolled out of the canvas and back is not re-fetched and does not flash. Vary
  the `ref` or pass a new `embedSource` if a reference's content can change;
  rejections are not cached.
- Works on **`preview`, `split`, and the in-place canvas** (ADR-009). On the
  canvas the resolved node is portalled into the rendered line; put the caret on
  the line to reveal the raw `![[ref]]` for editing. Interactive host content
  keeps its own clicks — click the slot's own margin (or a pending / failed
  embed's literal text) to reveal instead. Toggle it with
  `inPlace={{ decorations: { embeds: false } }}`.
- A `![[…]]` **alone on its line** renders as a **block**; one **mid-sentence**
  renders **inline**, flowing with the surrounding text. Return phrasing content
  (a `<span>`, an `<img>`, a chip — not a block `<div>`) for the inline case, or
  the browser nests block inside inline. `![[…]]` inside inline or fenced code
  stays literal, and — on the **in-place canvas only** — so does a `![[…]]`
  inside a table cell (that surface is for editing tabular text; `preview` /
  `split` transclude in cells normally).
- Block renders into `<div class="stylo-embed"><div class="stylo-embed-content">…`
  (`preview` / `split`) or `<div class="cm-inplace-embed">…` (canvas); inline
  into `<span class="stylo-embed"><span class="stylo-embed-content
stylo-embed-inline">…` (`preview` / `split`) or `<span
class="cm-inplace-embed-inline">…` (canvas). `.stylo-embed-content`,
  `.stylo-embed-inline`, and `--stylo-embed-accent` are the shared override
  points; zero the padding and border to drop the block frame.
- Off entirely when `embedSource` is omitted — `![[ref]]` then renders as it did
  before (the leading `!` as text, `[[ref]]` as a wikilink).

## Canvas header

`toolbar.render` wraps content _before_ the whole editing surface — useful for
chrome that sits above everything, but there's no way from there to land
content _inside_ the canvas, below CodeMirror's own top panels (the find /
replace panel) and above the document body. `canvasHeader` reaches that seam:

```tsx
<Stylo value={doc} onChange={setDoc} canvasHeader={({ view }) => <FrontmatterCard view={view} />} />
```

- Renders on `source`, `in-place`, and the source pane of `split`; never
  `preview` (there is no CodeMirror surface to dock into).
- Docks _under_ the find / replace panel, so it never moves when the panel
  opens or closes — only the document body shifts down to make room. Compare
  `toolbar`, which always sits above the panel regardless of what a
  `toolbar.render` wrapper puts around it.
- Built on the same `showPanel` mechanism as the search panel itself (ordered
  after it), so host content lives in the same coordinate system, not a
  separately positioned overlay.
- `view` is the live `EditorView` once the surface has mounted. Read once, at
  mount — like `inPlace` and `wikiLinkSource`, a changed function is not
  picked up without a remount, though the function's own closures (state,
  props it reads) are of course free to change on every call.
- No default styling — the panel is a plain, unstyled container. Style
  whatever `canvasHeader` returns yourself.

See [ADR-010](../../journal/2026-09/2026-09-12_adr-010-canvas-header-panel.md)
for the reasoning behind the seam and how it composes with `toolbar.render`.

## Resolver errors

`embedSource`, `wikiLinkSource`, and `tagSource` fail quietly by design — a
rejected `embedSource` leaves the literal `![[ref]]`, a rejected
`wikiLinkSource` or `tagSource` shows no completions. Pass
**`onResolveError(error, info)`** to observe those failures (log them, show a
toast) without changing the fallback:

```tsx
<Stylo
  value={doc}
  onChange={setDoc}
  embedSource={resolveEmbed}
  wikiLinkSource={searchIndex}
  onResolveError={(err, { source, input }) => {
    console.error(`${source} failed for "${input}"`, err)
  }}
/>
```

`info.source` is `"embedSource"`, `"wikiLinkSource"`, or `"tagSource"`;
`info.input` is the reference or query it was called with. A resolver that
returns `null` has not failed — that is the "keep it literal" result — and
does not fire this. The callback is reactive; swap it freely.

## Ref — imperative handle

`<Stylo>` forwards a `ref` to a small imperative handle (`StyloHandle`, exported)
for the things a controlled `value` cannot express — focus, navigation, and
inserting at the caret:

```tsx
import { Stylo, type StyloHandle } from "@damiro/stylo"

const editor = useRef<StyloHandle>(null)

;<Stylo ref={editor} value={doc} onChange={setDoc} />

editor.current?.scrollToHeading("Background") // open a note, jump to a heading
editor.current?.insertAtCursor("![](…)") //     drop text in at the caret
```

| Method                  | Returns              | Notes                                                                                                                           |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `focus()`               | `void`               | Move keyboard focus into the editing surface.                                                                                   |
| `scrollToHeading(text)` | `boolean`            | Caret to the first ATX heading whose text matches `text` (trimmed, case-insensitive); scrolls it to the top. `true` if matched. |
| `insertAtCursor(md)`    | `void`               | Replace the selection, or insert at the caret when it is empty. No effect when `readOnly`.                                      |
| `getView()`             | `EditorView \| null` | The underlying CodeMirror view. An escape hatch — **not** covered by semver; the other three are.                               |

Every method is inert (`null` / `false` / no-op) in `preview` mode and before the
surface has mounted.

## Styling tokens

Stylo ships structural CSS only. The palette comes from twelve CSS custom
properties you can set on `.stylo` or any ancestor:

| Token                      | Default           | Role                                             |
| -------------------------- | ----------------- | ------------------------------------------------ |
| `--stylo-bg`               | `#ffffff`         | surface background                               |
| `--stylo-surface-floating` | `#ffffff`         | background for floating popups (menu, selbar, …) |
| `--stylo-text`             | `#09090b`         | body text                                        |
| `--stylo-text-muted`       | `#71717a`         | secondary text                                   |
| `--stylo-border`           | `#e4e4e7`         | borders and rules                                |
| `--stylo-accent`           | `#18181b`         | active / pressed states                          |
| `--stylo-link`             | `#2563eb`         | links and wikilinks (no underline)               |
| `--stylo-ring`             | `#a1a1aa`         | focus ring                                       |
| `--stylo-radius`           | `0.5rem`          | corner radius                                    |
| `--stylo-font-size`        | `0.9375rem`       | base editor font size — sizes inside track it    |
| `--stylo-font-family`      | system sans stack | prose font — in-place canvas, sticky toolbar     |
| `--stylo-font-family-mono` | `ui-monospace, …` | code font — source mode, code spans, `pre`       |

Defaults follow shadcn/ui's neutral conventions as a visual reference; no
Tailwind or shadcn code is bundled.

`--stylo-surface-floating` is a concrete colour, not an alias of `--stylo-bg`:
setting `--stylo-bg: transparent` to embed the editor in an existing card leaves
the context menu, selection bar, URL input, and link-hover tooltip opaque. Set
it too when you theme `--stylo-bg` to a non-default colour. `--stylo-ring` is the
focus ring only — the in-place menu's active row follows `--stylo-accent`.

`--stylo-radius`, `--stylo-font-size`, `--stylo-font-family`, and
`--stylo-font-family-mono` are not colours: one value each serves both themes, so
they live only in the light block. `--stylo-font-family` covers the editing prose
surface and the fixed-position sticky toolbar; the `preview` surface deliberately
inherits its prose font from wherever you mount `<Stylo>`.

### Dark mode

Every colour token above (and the table, callout, and syntax tokens below) ships
a **dark value as well as a light one**. The dark set activates under a `.dark`
or `[data-theme="dark"]` ancestor — or the same marker on `.stylo` itself — the
convention `next-themes` and shadcn use; Stylo does not switch on
`prefers-color-scheme`, so your theme layer toggles the class. The dark rule is
`:where(...)`-wrapped, so your own override on `.stylo` still wins at equal
specificity. `color-scheme` is set for both themes. Override a token and you are
responsible for both states.

### Table and guide tokens

Rendered tables (in-place **and** preview) and the in-place nested-list indent
guides read a few extra tokens. Each defaults to a value derived from the palette
above, so tables look the same until you override one.

| Token                     | Default                         | Role                                             |
| ------------------------- | ------------------------------- | ------------------------------------------------ |
| `--stylo-table-border`    | `var(--stylo-border)`           | cell borders                                     |
| `--stylo-table-header-bg` | `color-mix(--stylo-border 30%)` | header-row fill                                  |
| `--stylo-table-stripe-bg` | `transparent`                   | even body rows — set it to enable zebra striping |
| `--stylo-guide`           | `var(--stylo-border)`           | nested-list indent-guide rules                   |
| `--stylo-callout-note`    | `#3b82f6`                       | callout accent — `note` / `info` bucket          |
| `--stylo-callout-tip`     | `#22c55e`                       | callout accent — `tip` / `success` bucket        |
| `--stylo-callout-warn`    | `#f59e0b`                       | callout accent — `question` / `warning` bucket   |
| `--stylo-callout-danger`  | `#ef4444`                       | callout accent — `failure` / `danger` bucket     |
| `--stylo-callout-example` | `#a855f7`                       | callout accent — `example` / `quote` bucket      |

Each callout bucket sets `--stylo-callout-accent` from its token above; override
that per type instead (`.stylo-callout-note { --stylo-callout-accent: … }`) for
finer control.

### Syntax colours

Fenced code is highlighted through a token palette in the same style — set these
on `.stylo` or any ancestor. They only take effect where a real language grammar
runs (see [Fenced-code highlighting](./code-languages.md)); Markdown structure is
styled separately.

| Token                     | Default   | Role                               |
| ------------------------- | --------- | ---------------------------------- |
| `--stylo-syntax-keyword`  | `#7c3aed` | keywords, modifiers                |
| `--stylo-syntax-string`   | `#0a7c2f` | strings, regexps, attribute values |
| `--stylo-syntax-escape`   | `#b45309` | escape sequences                   |
| `--stylo-syntax-comment`  | `#8a8f98` | comments, metadata (italic)        |
| `--stylo-syntax-number`   | `#b45309` | numeric literals                   |
| `--stylo-syntax-constant` | `#b45309` | booleans, `null`, named constants  |
| `--stylo-syntax-function` | `#2563eb` | function and macro names           |
| `--stylo-syntax-type`     | `#a16207` | type, class, and namespace names   |
| `--stylo-syntax-property` | `#0f766e` | object properties, attribute names |
| `--stylo-syntax-tag`      | `#cf222e` | markup tag names                   |
| `--stylo-syntax-invalid`  | `#dc2626` | parse errors                       |

Variable names, operators, and punctuation are left as body text on purpose, to
keep the block calm.

## Frontmatter in preview

With `frontmatter="code"`, the raw `---` block renders as
`<div class="stylo-frontmatter">` above the body. That class is plain (not
scoped), so your own stylesheet — imported after `@damiro/stylo/styles.css` —
overrides it at equal specificity:

```css
/* restyle the block */
.stylo-frontmatter {
  border-left-color: var(--stylo-accent);
  background: none;
}
/* rename the label */
.stylo-frontmatter::before {
  content: "Metadata";
}
/* drop the label */
.stylo-frontmatter::before {
  content: none;
}
```

The default is a recessed, monospace block with an uppercase `Frontmatter`
label.

## Parsing frontmatter

Stylo bundles no YAML parser — parsing is a policy (schema, dates, tags,
multi-document) that belongs to your app. It gives you the raw block two ways:

- **`onFrontmatter(raw)`** — fired on mount and on every change to the block,
  with the text between the fences or `null`. Best for a live "properties" panel.
- **`splitFrontmatter(md)`** — exported from the package; returns
  `{ frontmatter, body } | null` synchronously from any string.

```tsx
import { Stylo, splitFrontmatter } from "@damiro/stylo"
import YAML from "yaml" // your choice of parser

const [meta, setMeta] = useState<Record<string, unknown>>({})

;<Stylo
  value={doc}
  onChange={setDoc}
  onFrontmatter={(raw) => setMeta(raw ? (YAML.parse(raw) ?? {}) : {})}
/>

// …or, without the callback:
const { frontmatter } = splitFrontmatter(doc) ?? { frontmatter: "" }
```

A rendered key/value panel and a built-in parser stay deferred — see the
[ADR-001 amendment](../../journal/2026-09/2026-09-04_frontmatter-callback.md).

## Math (preview)

`$…$` and `$$…$$` are rendered with KaTeX. KaTeX's stylesheet and fonts are
**not** in `@damiro/stylo/styles.css` — import them once yourself:

```ts
import "@damiro/stylo/katex.css" // a re-export of katex/dist/katex.min.css
```

The rationale (engine choice, why the stylesheet is separate) is in
[ADR-003](../../journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md).
