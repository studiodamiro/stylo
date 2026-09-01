# Stylo

**A plain-text-first Markdown editor for React, with first-class LaTeX support.**

Stylo is a zero-bloat Markdown editor component for React. Plain text stays
canonical — there is no WYSIWYG document model — so notes round-trip losslessly
with Obsidian and any other Markdown tool. CodeMirror 6 handles editing;
`remark` / `rehype` + KaTeX handle rendering; `[[wikilinks]]` and `$…$` math are
built in.

> **Status:** early scaffold. The API below is the plan, not yet shipped.

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

## Planned stack

| Concern          | Library                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| Editing surface  | CodeMirror 6 (`@codemirror/lang-markdown`, `@codemirror/language-data`)   |
| Render / preview | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `katex` |
| `[[wikilinks]]`  | small custom `remark` plugin                                              |
| Frontmatter      | `remark-frontmatter` (render) + `gray-matter` (parse)                     |

## Planned API sketch

```tsx
import { Stylo } from "stylo"
import "stylo/styles.css"

function Editor() {
  const [doc, setDoc] = useState("# Hello\n\nInline math: $e^{i\\pi} + 1 = 0$")

  return (
    <Stylo
      value={doc}
      onChange={setDoc}
      mode="split"                // "source" | "preview" | "split"
      onWikiLinkClick={(target) => navigate(target)}
    />
  )
}
```

## Development

```bash
npm install
npm run dev        # playground
npm run typecheck
npm run test
npm run build      # library bundle
```


## License

MIT © studiodamiro
