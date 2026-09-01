---
title: "ADR-001 — Editor architecture: compose from primitives, plain text is canonical"
created: 2026-09-01
type: adr
parent: index
tags:
  - stylo/architecture
  - engineering/adr
---

# ADR-001 — Editor architecture: compose from primitives, plain text is canonical

- **Status:** Accepted — amended in part by
  [ADR-002](./2026-09-01_adr-002-editor-ux-and-customization.md) (2026-09-01)
- **Date:** 2026-09-01
- **Deciders:** damiro, Grace

## Context

Stylo needs a React Markdown editor with first-class LaTeX (KaTeX) rendering,
usable across multiple projects. The notes it edits are plain `.md` files with
YAML frontmatter and `[[wikilinks]]`, also edited by Obsidian and other
plain-Markdown tools. Three broad approaches were on the table:

1. **Build a parser and editing surface from scratch.** Full control, but
   Markdown + GFM + math + frontmatter edge cases are a multi-month sink and a
   permanent maintenance load. `remark` and KaTeX already solve this correctly.
2. **Adopt a rich-text editor framework** — ProseMirror (via TipTap or Milkdown)
   or Lexical. Fast path to a WYSIWYG feel, and both ecosystems have KaTeX math
   extensions. But the source of truth becomes an in-memory document tree;
   Markdown is an import/export format. Round-tripping arbitrary Markdown, YAML
   frontmatter, and wikilinks through that tree is lossy, and it fights any other
   tool that edits the same file. Also the heaviest option by bundle size.
3. **Compose well-scoped primitives.** CodeMirror 6 as the text surface; the
   unified / `remark` / `rehype` pipeline plus KaTeX for rendering. This is the
   architecture Obsidian itself uses (CodeMirror 6).

The project's zero-bloat mandate (see `CONTRIBUTING.md`) weighs every transitive
dependency as a cost borne by every consumer of the library.

## Decision

Adopt approach **3**. Specifically:

- **Plain text is the canonical model.** `<Stylo>`'s value is a Markdown string.
  There is no intermediate document model. Preview, source styling, wikilink
  resolution, and math typesetting are all pure functions of the string plus
  cursor state.
- **Editing surface:** CodeMirror 6 — `@codemirror/lang-markdown` with
  `@codemirror/language-data` for fenced-code sub-highlighting. Toolbar actions
  are dispatched as CodeMirror transactions.

  > **Amended 2026-09-01 (foundation milestone):** `@codemirror/language-data` is
  > dropped. Passing the full grammar set emits ~110 lazy language chunks into the
  > published package for a notes editor where code blocks are incidental — the
  > zero-bloat mandate inverted. Fenced blocks keep Markdown-level styling;
  > per-language highlighting becomes an opt-in `codeLanguages` pass-through prop.
  > See
  > [the journal note](./2026-09-01_drop-codemirror-language-data.md).
  >
  > **Amended 2026-09-02:** the `codeLanguages` prop now exists. It is forwarded
  > verbatim to `@codemirror/lang-markdown` and covers all three CodeMirror
  > surfaces (`source`, `split`, `in-place`); the consumer supplies the grammar
  > set, so the package bundles none. See
  > [the journal note](./2026-09-02_code-languages-prop.md) and
  > [the wiki reference](../../wiki/reference/code-languages.md).

- **Render pipeline:** `react-markdown` + `remark-gfm` + `remark-math` +
  `rehype-katex` + `katex`.
- **Wikilinks:** a small custom `remark` plugin (~30 LOC) rewriting
  `[[target]]` / `[[target|label]]` into link nodes; the host handles navigation
  via `onWikiLinkClick`.
- **Frontmatter:** `remark-frontmatter` on the render side to keep the leading
  `---` block out of the body; `gray-matter` on the parse side to expose it as
  structured data.
- **No ProseMirror / Lexical / TipTap / Milkdown dependency.**
- First release ships `source`, `preview`, and `split` view modes. Obsidian-style
  inline live preview (rendered Markdown inside the CodeMirror surface via view
  decorations) is deferred; it is additive and does not violate the plain-text
  invariant.

  > **Amended by [ADR-002](./2026-09-01_adr-002-editor-ux-and-customization.md)
  > (2026-09-01):** the inline live-preview canvas (`in-place` mode) is promoted
  > to the default view and pulled into first-release scope. The plain-text
  > invariant and the composed-primitives stack below are unchanged; only the
  > shipping order of the view modes moves.

## Consequences

**Positive**

- Notes round-trip losslessly and stay fully interoperable with Obsidian.
- Smallest dependency footprint of the three options; every piece is modular,
  tree-shakeable, MIT.
- Each concern (input, parsing, math) is a boundary that can be swapped or tested
  in isolation.
- Matches a proven architecture (Obsidian).

**Negative / costs**

- No WYSIWYG editing out of the box. The first release is source + preview; the
  richer inline-preview experience is a later, non-trivial CodeMirror
  decorations milestone.
- Toolbar commands operate on text ranges, not semantic nodes, so some actions
  (e.g. "toggle bold" across mixed selections) need careful range logic.
- KaTeX ships webfonts; the host must include `katex` CSS and fonts. Documented
  as a peer/setup step rather than hidden — the concrete mechanism is settled in
  [ADR-003](./2026-09-01_adr-003-katex-math-rendering.md).

## Alternatives rejected

- **Approach 1 (from scratch):** disproportionate cost; reinvents solved
  problems.
- **Approach 2 (rich-text framework):** breaks the plain-text invariant, lossy
  round-trips, largest bundle, poor fit for files shared with other tools.
- **`@uiw/react-md-editor`:** viable for a prototype, but its opinionated chrome
  is hard to reconcile with host design systems and it is not a composable
  primitive.
