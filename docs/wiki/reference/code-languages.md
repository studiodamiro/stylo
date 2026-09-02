---
title: "Fenced-code highlighting"
created: 2026-09-02
type: wiki-reference
parent: index
tags:
  - stylo/wiki
  - engineering/standard
---

# Fenced-code highlighting

Stylo carries a built-in token palette (the `--stylo-syntax-*` custom
properties — see [props](./props.md#syntax-colours)) and applies it on every
CodeMirror surface (`source`, `split`, `in-place`). But it can only colour
tokens a language grammar has identified, and **Stylo bundles no grammars**: the
full `@codemirror/language-data` set compiles to ~110 lazy chunks in the package
tarball, which is the zero-bloat mandate inverted for a notes editor (see the
[2026-09-01 note](../../journal/2026-09/2026-09-01_drop-codemirror-language-data.md)
and the [ADR-001](../../journal/2026-09/2026-09-01_adr-001-editor-architecture.md)
amendment).

So without `codeLanguages` a fenced block gets Markdown-level styling only — a
monospace font and styled fences. The `codeLanguages` prop opts in with exactly
the grammars you want; it is forwarded verbatim to `@codemirror/lang-markdown`,
so the cost lands only on the consumer who asks for it, and matching blocks then
pick up the syntax palette automatically.

## The whole set

```tsx
import { Stylo } from "@damiro/stylo"
import { languages } from "@codemirror/language-data"

;<Stylo value={doc} onChange={setDoc} codeLanguages={languages} />
```

`languages` is a list of `LanguageDescription` entries, each with a lazy
`import()` for its grammar. A block like ` ```python ` triggers the dynamic
import for the Python grammar and re-parses once it resolves; your bundler
code-splits each grammar into its own chunk, fetched on first use.

## A curated subset

Pull in only the languages you expect, and skip the `@codemirror/language-data`
dependency:

```tsx
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { LanguageDescription } from "@codemirror/language"

const codeLanguages = [
  LanguageDescription.of({ name: "javascript", alias: ["js", "ts"], support: javascript() }),
  LanguageDescription.of({ name: "python", alias: ["py"], support: python() }),
]

;<Stylo value={doc} onChange={setDoc} codeLanguages={codeLanguages} />
```

## Scope

- **CodeMirror surfaces only.** `source`, the source pane of `split`, and the
  `in-place` canvas all build their editor through the same path, so one prop
  covers all three.
- **`preview` is unaffected.** It renders through `react-markdown` / rehype, a
  separate pipeline; code highlighting there would be its own rehype plugin and
  its own dependency decision.
- **Read once, at mount.** Changing `codeLanguages` on a mounted `<Stylo>` has no
  effect until it remounts. Give it a `key` if the set must change live.

## Type

```ts
type CodeLanguages =
  readonly LanguageDescription[] | ((info: string) => Language | LanguageDescription | null)
```

The function form receives the fence info string (the text after the opening
` ``` `) and returns the grammar to use, or `null` for none.
