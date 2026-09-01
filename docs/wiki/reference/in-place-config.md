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
| `frontmatter`    | the "Properties" chip over the leading YAML block                    |
| `tables`         | the rendered `<table>`                                               |

## Applied at mount

The config is read once, when the in-place canvas is constructed. Changing
`inPlace` on an already-mounted `<Stylo>` has no effect until the component
remounts — give it a `key` derived from the config if you need it to react to
a toggle change live.

## Not in this pass

Deferred, each its own later decision:

- `inPlace.reveal` — `"line" | "node"` cursor-reveal granularity.
- `inPlace.frontmatter` — a `source` / `chip` / `properties` display mode; the
  `properties` panel needs YAML parsing and its own dependency.
- Table rendering options — inline formatting inside cells, style hooks.
- A consumer-supplied decorator hook for custom in-place node types.

See the [in-place canvas tracker](../../journal/2026-09/2026-09-01_in-place-canvas.md)
for what each of the twelve constructs above does when it is on.
