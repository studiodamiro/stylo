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

| Prop              | Type                                             | Default    | Notes                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`           | `string`                                         | _required_ | The canonical Markdown document.                                                                                                                                                                                                                                                                                                         |
| `onChange`        | `(next: string) => void`                         | _required_ | Called with the complete Markdown string on every edit.                                                                                                                                                                                                                                                                                  |
| `mode`            | `"in-place" \| "source" \| "preview" \| "split"` | `"source"` | Which view to show. `source`, `preview`, and `split` are implemented; `in-place` warns once and falls back to `source`. `split` expects the root element to have a bounded height. The default becomes `in-place` once the decoration canvas lands ([ADR-002](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md)). |
| `onWikiLinkClick` | `(target: string) => void`                       | —          | Fired when a rendered `[[wikilink]]` is activated in preview. `target` is the part before `\|`. Stylo does no navigation itself.                                                                                                                                                                                                         |
| `readOnly`        | `boolean`                                        | `false`    | Render the source surface read-only.                                                                                                                                                                                                                                                                                                     |
| `placeholder`     | `string`                                         | —          | Shown when the document is empty (source surface).                                                                                                                                                                                                                                                                                       |
| `className`       | `string`                                         | —          | Added to the root element alongside the internal classes.                                                                                                                                                                                                                                                                                |

## Styling tokens

Stylo ships structural CSS only. The palette comes from seven CSS custom
properties you can set on `.stylo` or any ancestor:

| Token                | Default   | Role                 |
| -------------------- | --------- | -------------------- |
| `--stylo-bg`         | `#ffffff` | surface background   |
| `--stylo-text`       | `#09090b` | body text            |
| `--stylo-text-muted` | `#71717a` | secondary text       |
| `--stylo-border`     | `#e4e4e7` | borders and rules    |
| `--stylo-accent`     | `#18181b` | links, active states |
| `--stylo-ring`       | `#a1a1aa` | focus ring           |
| `--stylo-radius`     | `0.5rem`  | corner radius        |

Defaults follow shadcn/ui's neutral conventions as a visual reference; no
Tailwind or shadcn code is bundled.

## Math (preview)

`$…$` and `$$…$$` are rendered with KaTeX. KaTeX's stylesheet and fonts are
**not** in `@damiro/stylo/styles.css` — import them once yourself:

```ts
import "@damiro/stylo/katex.css" // a re-export of katex/dist/katex.min.css
```

The rationale (engine choice, why the stylesheet is separate) is in
[ADR-003](../../journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md).
