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

### Explicitly out of v1 (stay source-styled)

- Rendered tables
- Highlighted code fences (waits on the `codeLanguages` pass-through prop)
- Image inline previews
- Task checkboxes
- Embeds / transclusions

## Standing decisions

- **Default `mode` stays `source`** until in-place is proven. The flip to
  `in-place` as the default is the last increment, with an ADR-002 amendment.
- **The in-place plugin is lazy-loaded** (like `Preview`), so it carries `katex`
  into its own chunk and `mode="source"` consumers never fetch it.
- Decorations are built over the **visible viewport only**, rebuilt on
  `docChanged`, viewport change, and `selectionSet` (for cursor reveal).
- Replaced block widgets are marked `atomic` so the caret steps over them
  instead of into hidden text.
- Each increment is its own commit, verifiable in the playground.

## Increments

| #   | Increment                                                                       | Status | Commit | Notes                                                                                             |
| --- | ------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------- |
| 0   | ADR-004 — decoration architecture + v1 scope                                    | ✅     | —      | Merged into this tracker; see [ADR-004](./2026-09-01_adr-004-in-place-decoration-canvas.md).      |
| 1   | Plugin skeleton, viewport decoration builder, cursor-reveal mechanism, headings | ✅     | —      | `src/inplace/*`; lazy `InPlaceView`; ATX headings at display size, `#` hidden off the caret line. |
| 2   | Emphasis — bold / italic / strikethrough / inline code                          | ☐      |        |                                                                                                   |
| 3   | Links + wikilinks                                                               | ☐      |        |                                                                                                   |
| 4   | Block and inline math widgets (KaTeX)                                           | ☐      |        |                                                                                                   |
| 5   | Horizontal rule, blockquote, list markers                                       | ☐      |        |                                                                                                   |
| 6   | Cursor-reveal edge cases + `atomicRanges` pass                                  | ☐      |        |                                                                                                   |
| 7   | Flip default `mode` to `in-place`; ADR-002 amendment; wiki + props updates      | ☐      |        |                                                                                                   |

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

## After in-place

The remaining post-foundation work is unchanged and tracked in the
[foundation milestone](./2026-09-01_foundation-milestone.md) "Next" list:
declarative toolbar, `codeLanguages` prop, v1 public-API pass, publish
automation.
