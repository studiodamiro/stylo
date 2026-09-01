---
title: "System Overview"
created: 2026-09-01
type: wiki-architecture
parent: index
tags:
  - stylo/architecture
  - engineering/standard
---

# System Overview

## The one invariant: plain text is canonical

Stylo's public value is a **Markdown string**. There is no intermediate document
model that must be serialized back to text. Everything the editor does —
rendering a preview, styling the source, resolving a `[[wikilink]]`, typesetting
`$e^{i\pi}+1=0$` — is a pure function of that string plus cursor state.

This is the Obsidian stance, and it is a deliberate rejection of the
ProseMirror / Lexical / TipTap model, where the source of truth is a tree and
Markdown is an import/export format. That model is lossy for YAML frontmatter,
wikilinks, and math, and it fights any other tool that edits the same files. See
[ADR-001](../../journal/2026-09/2026-09-01_adr-001-editor-architecture.md) for the
full argument.

## Composed, not adopted

Stylo assembles four well-scoped libraries rather than taking on an editor
framework:

| Concern          | Library                                                                    | Role |
| ---------------- | ------------------------------------------------------------------------- | ---- |
| Editing surface  | CodeMirror 6 (`@codemirror/lang-markdown`, `@codemirror/language-data`)   | Text input, selection, syntax-aware source styling, toolbar commands as transactions |
| Render / preview | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `katex` | Markdown string → React element tree for the preview pane |
| `[[wikilinks]]`  | small custom `remark` plugin (~30 LOC)                                     | Rewrites `[[target]]` / `[[target\|label]]` into link nodes with a `data-wikilink` target |
| Frontmatter      | `remark-frontmatter` (render side) + `gray-matter` (parse side)           | Keeps the leading `---` YAML block out of the rendered body; exposes it as structured data to the host |

Every dependency is modular, tree-shakeable, and MIT.

## Data flow

```mermaid
flowchart LR
  subgraph Host["Host application"]
    V["Markdown string (state)"]
  end

  subgraph Stylo["<Stylo>"]
    CM["CodeMirror 6\nsource surface"]
    PIPE["unified pipeline\nremark-parse → gfm → math → frontmatter\n→ wikilinks → rehype → rehype-katex"]
    PREVIEW["Preview pane\n(React elements + KaTeX)"]
  end

  V -->|value| CM
  CM -->|onChange transaction| V
  V -->|same string| PIPE
  PIPE --> PREVIEW
  PREVIEW -->|onWikiLinkClick target| Host
```

The source surface and the preview never talk to each other. Both derive from the
same string; the host owns that string.

## View modes & UI Surfaces

The UX layer, customization API, and design-token system are specified in
[ADR-002](../../journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md).

`<Stylo mode>` selects the interaction layout:

- `in-place` (default) — Notion-like in-place canvas with live LaTeX math, headings, and code preview via CodeMirror 6 view decorations.
- `source` — raw CodeMirror Markdown text surface.
- `preview` — rendered HTML/KaTeX preview pane.
- `split` — side-by-side editing and preview with synchronized scroll.

### UI layers

**First release:**

1. **Adaptive canvas** — responsive writing surface themed through a small set of
   CSS custom properties: `--stylo-bg`, `--stylo-text`, `--stylo-text-muted`,
   `--stylo-border`, `--stylo-accent`, `--stylo-ring`, `--stylo-radius`. Defaults
   follow shadcn/ui's neutral conventions as a visual reference; no Tailwind or
   shadcn code is bundled.
2. **Declarative toolbar** — `left` / `right` slots, constrained heading sets
   (`headings: ["h1", "h2", "h3"]`), and `overflow: "wrap" | "collapse"`.

**Deferred (post-v1, additive — see ADR-002):** context-aware selection tooltip,
and the `<StyloToolbarSettings />` drag-and-drop customizer with magnetic docks.

Internal UI is styled with CSS Modules compiled to a single `dist/styles.css`;
consumers import it once and need no build-time CSS tooling.

## What Stylo does not own

- **Backend persistence.** The host holds the string and decides when to save
  (deferred `autoSave` hook, or `onSave`).
- **Navigation.** `onWikiLinkClick` hands the target back to the host; Stylo has
  no router and no vault index.
- **Brand colors.** Stylo ships scoped CSS and a design-token surface; the theme
  palette is inherited from the host.
- **KaTeX stylesheet.** Stylo's CSS is KaTeX-font-free; the consumer imports
  `stylo/katex.css` (or KaTeX's own CSS) once. See
  [ADR-003](../../journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md).
