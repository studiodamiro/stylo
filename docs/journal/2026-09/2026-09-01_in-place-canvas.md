---
title: "In-place canvas — build tracker"
created: 2026-09-01
type: journal
parent: index
tags:
  - stylo/journal
  - engineering/milestone
---

# In-place canvas — build tracker

Living checklist for the `in-place` view mode: Obsidian-style live preview where
the raw Markdown stays in the document and CodeMirror **view decorations** render
it in place, stepping back to source when the cursor enters a node. Update the
increment table and the log as each piece lands.

The architecture and the scope below are formalised in **ADR-004** — write that
first (increment 0).

## v1 scope

### Decorated in v1

- Headings — display size, `#` markers hidden off the cursor line
- Emphasis — bold / italic / strikethrough / inline code; markers hidden
  off-cursor
- Links + wikilinks — collapse `[text](url)` and `[[target|label]]` to the
  label; activating a wikilink fires `onWikiLinkClick`
- Block math `$$…$$` — replaced with a rendered KaTeX widget; arrow or click to
  edit
- Inline math `$…$` — inline KaTeX widget
- Horizontal rule — rendered line
- Blockquote — left border and muted colour; markers kept
- List markers — bullet glyph styling
- Task checkboxes — interactive `<input>` toggling `[ ]` ⇄ `[x]` in the source
  _(pulled in from the deferred list before the default flip — a raw `- [ ]`
  under the default mode reads as unfinished; ADR-004 scope amendment)_

### Explicitly out of v1 (stay source-styled)

- Rendered tables _(planned as increment 8, after the default flip)_
- Highlighted code fences (waits on the `codeLanguages` pass-through prop)
- Image inline previews
- Embeds / transclusions

## Standing decisions

- **Default `mode` stayed `source`** until in-place was proven; increment 7
  flipped it to `in-place` (ADR-002 §1). `mode="source"` stays the plain
  surface that loads no render chunk.
- **The in-place plugin is lazy-loaded** (like `Preview`), so it carries `katex`
  into its own chunk and `mode="source"` consumers never fetch it.
- Decorations are built over the **visible viewport only**, rebuilt on
  `docChanged`, viewport change, and `selectionSet` (for cursor reveal).
- Replaced block widgets are marked `atomic` so the caret steps over them
  instead of into hidden text.
- Each increment is its own commit, verifiable in the playground.

## Increments

| #   | Increment                                                                         | Status | Commit | Notes                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | ADR-004 — decoration architecture + v1 scope                                      | ✅     | —      | Merged into this tracker; see [ADR-004](./2026-09-01_adr-004-in-place-decoration-canvas.md).                                                                    |
| 1   | Plugin skeleton, viewport decoration builder, cursor-reveal mechanism, headings   | ✅     | —      | `src/inplace/*`; lazy `InPlaceView`; ATX headings at display size, `#` hidden off the caret line.                                                               |
| 2   | Emphasis — bold / italic / strikethrough / inline code                            | ✅     | —      | Inline rule table in `decorate.ts`; canvas switched to a proportional font (code stays monospace).                                                              |
| 3   | Links + wikilinks                                                                 | ✅     | —      | `Link` case + regex `[[…]]` scan with a code-context guard; shared pattern in `src/wikilink.ts`; delegated click → `onWikiLinkClick`.                           |
| 4   | Block and inline math widgets (KaTeX)                                             | ✅     | —      | `math.ts` split out: inline / one-line `$$` in the plugin, multi-line `$$` in a `StateField` (plugins can't replace line breaks); `atomicRanges` from both.     |
| 5   | Horizontal rule, blockquote, list markers, hide frontmatter                       | ✅     | —      | `nodes.ts` split from `decorate.ts`; `HrWidget` / `BulletWidget`; `frontmatterField` hides the YAML behind a "Properties" chip; task items left as source.      |
| 6   | Cursor-reveal edge cases + `atomicRanges` pass                                    | ✅     | —      | Atomic set now derived from every replacing decoration (markers + widgets), not just widgets. Line-span reveal kept; per-node reveal deferred to the API pass.  |
| 6b  | Task checkboxes                                                                   | ✅     | —      | `CheckboxWidget` replaces `[ ]` / `[x]`; toggling dispatches a one-char change. `- ` hidden on task rows. Pulled in from the deferred list (ADR-004 amendment). |
| 7   | Flip default `mode` to `in-place`; ADR-002 amendment; wiki + props updates        | ✅     | —      | `Stylo` defaults to `in-place`; `types.ts` / playground updated; ADR-002 §1 and ADR-004 marked complete; `props.md` + `overview.md` synced.                     |
| 8   | Rendered tables — GFM `Table` node → a `block: true` widget, click to edit source | ☐      |        | After the flip; larger, and its "edit = reveal source" model differs from the rest.                                                                             |

Mark a row `✅` and fill in the commit hash as it lands.

## Log

- 2026-09-01 — tracker created; v1 scope and standing decisions agreed.
- 2026-09-01 — increment 0: ADR-004 written; ADR-002 §1 given a rollout pointer;
  index and wiki tables synced.
- 2026-09-01 — increment 1: `src/inplace/` decoration plugin (viewport-scoped
  builder, `revealedLines` cursor-reveal, base theme); lazy `InPlaceView` wired
  into `Stylo`; `useCodeMirror` gained an `extensions` option. ATX headings
  render at display size with `#` markers hidden off the caret line. The
  "unimplemented mode" warning is gone now that every `mode` is handled.
- 2026-09-01 — increment 2: `decorate.ts` rebuilt around an unordered range list
  sorted by `Decoration.set` (so nested and overlapping spans are legal); a
  shared inline rule table covers strong / emphasis / strikethrough / inline
  code, hiding each marker off the caret line. The canvas now renders in a
  proportional font (`inPlaceTheme` raised with `Prec.high` to beat the base
  monospace theme); inline code and fenced/indented code keep a monospace class.
- 2026-09-01 — increment 3: the `[[…]]` pattern moved to `src/wikilink.ts` and is
  now shared with `remark-wikilink`. `decorate.ts` styles standard `[text](url)`
  links (hiding `[` and the `](url)` tail) and runs a regex pass for wikilinks,
  collapsing them to the label and skipping matches inside code spans/blocks.
  A collapsed wikilink carries `data-stylo-wikilink`; a delegated `click`
  handler in `inPlaceExtension` calls `onWikiLinkClick`, threaded from `Stylo`
  through `InPlaceView` via a ref. Also fixed: the heading branch no longer
  stops the tree walk, so emphasis and links inside a heading are decorated.
- 2026-09-01 — increment 4: the in-place module was split for the 200-line
  ceiling — `scan.ts` (shared `inCodeContext` / `rangeRevealed`), `wikilinks.ts`,
  `math.ts`. `math.ts` renders `$…$` and single-line `$$…$$` from the viewport
  plugin and multi-line `$$…$$` blocks from a `StateField` (a `ViewPlugin` may
  not emit a replacement that spans line breaks); the field scans the whole
  document, acceptable because `$$` blocks are few. Widgets call
  `katex.render` directly. `atomicRanges` are provided from both the plugin and
  the field so the caret steps over rendered math. `katex` is now shared
  (deduplicated) between the preview and in-place chunks.
- 2026-09-01 — increment 5: the tree-node handling moved from `decorate.ts` into
  `nodes.ts`, leaving `decorate.ts` a thin orchestrator. Added horizontal rules
  (an `<hr>` widget, atomic), blockquote line framing (border + muted colour,
  `>` kept), and `-` / `*` / `+` list markers swapped for a `•` glyph — task
  items (`- [ ]`, which the grammar wraps in a `Task` node) are left as source
  since checkboxes are deferred. `frontmatter.ts` finds the leading `---` … `---`
  block by hand (no grammar node) and a state field hides it behind a
  "Properties" chip, revealed when the caret enters it; `decorate.ts` skips
  every node inside that range. Chip-vs-rendered-properties is recorded as a v1
  API-pass decision.
- 2026-09-01 — fenced code fix: fenced / indented code blocks render inside a
  monospace, tinted, rounded container. Off-caret, a fenced block's ` ``` `
  lines have their text replaced and the rows collapse to zero height, acting as
  the container's padding; the caret entering the block restores the fences
  (dimmed).
- 2026-09-01 — increment 6: the atomic-range set is now derived by filtering
  every replacing decoration out of the built set — marker-hiding replaces
  included, not just widgets — so the caret jumps hidden `#`, `**`, `[[`, `](…)`
  in one keypress. The separate `atomic` array threaded through `nodes.ts` and
  `math.ts` is gone. The line-span reveal model is kept as ADR-004 chose it;
  per-node reveal is left to the customization API as a `reveal` option.
- 2026-09-01 — increment 7: `Stylo`'s default `mode` is now `in-place` (ADR-002
  §1). `types.ts` and the playground updated; ADR-002 §1 and ADR-004's staging
  section marked complete; `props.md` and `overview.md` describe the full node
  set and note `mode="source"` as the no-render-chunk path. `<Stylo value
onChange />` with no `mode` now lazy-loads the in-place chunk (and the shared
  ~85 kB gzip KaTeX chunk) on mount — the intended tradeoff for the default
  experience; `mode="source"` stays the zero-dependency surface.
- 2026-09-01 — increment 6b: task checkboxes, pulled in from the deferred list
  ahead of the default flip. A `TaskMarker` node becomes a `CheckboxWidget`
  (`<input type="checkbox">`); toggling dispatches a one-character change,
  `" "` ⇄ `"x"`, at the position resolved from the widget DOM. The `- ` list
  marker is hidden on task rows so the line reads as just the checkbox and its
  text. The caret entering the line restores the `- [ ]` source. Recorded as an
  ADR-004 scope amendment.

## After in-place

- **In-place customization API** — one deliberate pass deciding what canvas
  decorations a consumer can toggle or extend: the v1-deferred node types (task
  checkboxes, callout blockquotes `> [!note]`, image previews, rendered tables),
  nested-list indent guides, and any hook for consumer-supplied decorators. This
  is public-API surface, so it belongs in the v1 API design milestone, not in
  the increments above.
- **Frontmatter display mode** — the v1 canvas hides the YAML block behind a
  minimal "Properties" chip. Make this configurable: at least `source` (leave it
  raw), `chip` (current default), and `properties` (a rendered key/value panel).
  The `properties` mode depends on the deferred frontmatter _exposure_ work from
  ADR-001 (parsing the YAML — `gray-matter` / a YAML dependency and its own ADR,
  plus the `onFrontmatter` prop), so it lands with that, not before.
- The rest of the post-foundation work is unchanged and tracked in the
  [foundation milestone](./2026-09-01_foundation-milestone.md) "Next" list:
  declarative toolbar, `codeLanguages` prop, v1 public-API pass, publish
  automation.
