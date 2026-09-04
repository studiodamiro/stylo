# Stylo

**A plain-text-first Markdown editor for React, with first-class LaTeX support.**

Stylo is a zero-bloat Markdown editor component for React. Plain text stays
canonical — there is no WYSIWYG document model — so notes round-trip losslessly
with Obsidian and any other Markdown tool. CodeMirror 6 handles editing;
`remark` / `rehype` + KaTeX handle rendering; `[[wikilinks]]` and `$…$` math are
built in.

> **Status:** working library, pre-1.0. The in-place canvas, `source` / `preview`
> / `split` modes, the formatting toolbar, `[[wikilinks]]`, and KaTeX math all
> ship and are covered by an integration test suite (`npm run test`). The public
> API may still shift before 1.0.

---

## Install

Not on npm yet — install straight from git. The `prepare` script builds the
bundle during install, so there is nothing else to wire up:

```bash
npm install github:studiodamiro/stylo
```

React 18+ is a peer dependency. Import lines are in [Usage](#usage).

---

## Why

Most React "Markdown editors" are either a bare `<textarea>` with a preview pane,
or a full ProseMirror/Lexical rich-text stack that turns your document into an
in-memory model you must serialize back to Markdown — lossy for frontmatter,
wikilinks, and math, and hostile to files other tools also edit.

Stylo takes the Obsidian stance instead: **the Markdown string is the source of
truth.** The editor is a thin, composable surface over it.

## Design stance

- **Plain text is canonical.** The component's value is a Markdown string. No
  intermediate document model.
- **Compose, don't adopt a framework.** CodeMirror 6 for the editing surface;
  the unified/`remark` ecosystem + KaTeX for rendering.
- **Zero-bloat.** Every dependency is modular, tree-shakeable, and MIT. Nothing
  is pulled in "just in case."
- **Interoperable.** YAML frontmatter, `[[wikilinks]]`, and `$…$` / `$$…$$` math
  survive a full edit round-trip.

## Stack

| Concern          | Library                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| Editing surface  | CodeMirror 6 (`@codemirror/lang-markdown`)                                  |
| Render / preview | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `katex`  |
| `[[wikilinks]]`  | small custom `remark` plugin                                                |
| Frontmatter      | `remark-frontmatter` — fences recognised; key/value parsing deferred        |
| Styling          | CSS Modules + `--stylo-*` CSS custom properties — no Tailwind, no CSS-in-JS |
| Icons            | inline SVG, swappable via the `icons` prop — no icon-package dependency     |

Styling and icon decisions are recorded in
[ADR-002](./docs/journal/2026-09/2026-09-01_adr-002-editor-ux-and-customization.md);
the math engine and KaTeX asset delivery in
[ADR-003](./docs/journal/2026-09/2026-09-01_adr-003-katex-math-rendering.md).

## Usage

```tsx
import { Stylo, type StyloHandle } from "@damiro/stylo"
import "@damiro/stylo/styles.css"
import "@damiro/stylo/katex.css" // KaTeX stylesheet + fonts (or import "katex/dist/katex.min.css")

function Editor() {
  const [doc, setDoc] = useState("# Hello\n\nInline math: $e^{i\\pi} + 1 = 0$")
  const editor = useRef<StyloHandle>(null)

  return (
    <Stylo
      ref={editor}
      value={doc}
      onChange={setDoc}
      mode="in-place" // default — also "source" | "preview" | "split"
      onSave={(md) => persist(md)} // fires on Mod-s
      onFrontmatter={(raw) => setMeta(raw)} // raw `---` block; parse it yourself
      onWikiLinkClick={(target) => navigate(target)}
    />
  )
}
```

`ref` gives an imperative handle: `focus()`, `scrollToHeading(text)`,
`insertAtCursor(md)`, and `getView()` for the raw CodeMirror `EditorView`.

### Theming

Every colour is a `--stylo-*` custom property; override any of them on `.stylo`
or an ancestor. A dark palette ships built in and activates under a `.dark` or
`[data-theme="dark"]` ancestor — the `next-themes` / shadcn convention.

## Development

```bash
npm install
npm run dev        # playground
npm run typecheck
npm run test
npm run build      # library bundle
```

## License

MIT © damiro
