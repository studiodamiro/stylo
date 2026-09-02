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
| `inPlace`         | `InPlaceConfig`                                                                                 | —            | Turns individual in-place decoration types off (`decorations`), and picks how the caret entering a table behaves (`table: "source"` \| `"cells"`, default `"source"` — see [ADR-006](../../journal/2026-09/2026-09-02_adr-006-interactive-table-editing.md)). Read once, when the canvas mounts. See [in-place configuration](./in-place-config.md) ([ADR-005](../../journal/2026-09/2026-09-01_adr-005-in-place-decoration-toggles.md)).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `toolbar`         | `boolean \| { items?: (ToolbarCommandId \| "\|")[] }`                                           | `true`       | The formatting bar above the editing surface (`source`, `in-place`, `split`; never `preview`). Omit or `true` for the full default set, `false` to hide it, or `{ items }` to pick and order the buttons. Keyboard shortcuts (`Mod-b`/`i`/`k`, `Mod-Alt-1..3`) stay bound regardless. See [formatting toolbar](./toolbar.md) ([ADR-002 §2](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `icons`           | `Partial<Record<ToolbarCommandId, ReactNode>>`                                                  | —            | Replace individual toolbar glyphs, keyed by command id. Any id left out keeps its built-in inline-SVG icon — Stylo ships no icon dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `frontmatter`     | `"hidden" \| "code"`                                                                            | `"hidden"`   | How `preview` (and `split`'s preview pane) shows the leading `---` YAML block. `"hidden"` drops it; `"code"` renders the raw block as `<div class="stylo-frontmatter">` above the body. Restyle it with your own CSS (see below). A parsed key/value panel is deferred ([ADR-001](../../journal/2026-09/2026-09-01_adr-001-editor-architecture.md), needs a YAML parser).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `codeLanguages`   | `readonly LanguageDescription[] \| ((info: string) => Language \| LanguageDescription \| null)` | —            | Grammars for fenced-code sub-highlighting, forwarded verbatim to `@codemirror/lang-markdown`. Stylo bundles none — pass your own set (`codeLanguages={languages}` from `@codemirror/language-data`, or a hand-built list). Affects the CodeMirror surfaces (`source`, `split`, `in-place`); `preview` is unaffected. Read once, at mount. See [fenced-code highlighting](./code-languages.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `readOnly`        | `boolean`                                                                                       | `false`      | Render the source surface read-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `placeholder`     | `string`                                                                                        | —            | Shown when the document is empty (source surface).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `className`       | `string`                                                                                        | —            | Added to the root element alongside the internal classes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Styling tokens

Stylo ships structural CSS only. The palette comes from eight CSS custom
properties you can set on `.stylo` or any ancestor:

| Token                | Default   | Role                               |
| -------------------- | --------- | ---------------------------------- |
| `--stylo-bg`         | `#ffffff` | surface background                 |
| `--stylo-text`       | `#09090b` | body text                          |
| `--stylo-text-muted` | `#71717a` | secondary text                     |
| `--stylo-border`     | `#e4e4e7` | borders and rules                  |
| `--stylo-accent`     | `#18181b` | active / pressed states            |
| `--stylo-link`       | `#2563eb` | links and wikilinks (no underline) |
| `--stylo-ring`       | `#a1a1aa` | focus ring                         |
| `--stylo-radius`     | `0.5rem`  | corner radius                      |

Defaults follow shadcn/ui's neutral conventions as a visual reference; no
Tailwind or shadcn code is bundled.

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
label. A parsed key/value panel (and an `onFrontmatter` callback) is deferred.

## Math (preview)

`$…$` and `$$…$$` are rendered with KaTeX. KaTeX's stylesheet and fonts are
**not** in `@damiro/stylo/styles.css` — import them once yourself:

```ts
import "@damiro/stylo/katex.css" // a re-export of katex/dist/katex.min.css
```

The rationale (engine choice, why the stylesheet is separate) is in
[ADR-003](../../journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md).
