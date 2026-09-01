import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { Stylo, type InPlaceDecorationToggles, type StyloMode } from "../src/index"
import "katex/dist/katex.min.css"
import "./styles.css"

const DEMO = `---
title: Welcome to Stylo
tags: [demo, markdown]
---

# Stylo playground

A plain-text editor where the Markdown string is the source of truth, built on
[CodeMirror 6](https://codemirror.net). Text can be **bold**, *italic*,
~~struck through~~, or \`inline code\` — the markers hide in the in-place canvas
until the caret lands on the line.

## What works **today**

- **Source** mode — a real CodeMirror 6 surface.
- **Preview** mode — GFM tables, math, and wikilinks.
- [x] in-place canvas
- [ ] toggle me in the in-place canvas

| Feature      |   Status |
| ------------ | -------: |
| Source mode  |     done |
| Preview mode |     done |
| In-place     |     done |

Inline math: $e^{i\\pi} + 1 = 0$. And a display block:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

Jump to another note with [[Getting Started]], or a labelled one:
[[api/reference|the API reference]].

---

> The YAML frontmatter above is kept out of the rendered preview.

\`\`\`ts
const greet = (name: string) => \`hello, \${name}\`
\`\`\`
`

const MODES: StyloMode[] = ["in-place", "source", "preview", "split"]

const DECORATION_KEYS: (keyof InPlaceDecorationToggles)[] = [
  "headings",
  "emphasis",
  "links",
  "wikilinks",
  "math",
  "lists",
  "tasks",
  "blockquote",
  "horizontalRule",
  "code",
  "frontmatter",
  "tables",
]

function App() {
  const [doc, setDoc] = useState(DEMO)
  const [mode, setMode] = useState<StyloMode>("in-place")
  const [lastLink, setLastLink] = useState<string | null>(null)
  // ADR-005: inPlace config is read once at mount, so a changed toggle remounts
  // the canvas via `key` below — a deliberate demo of that construction-time rule.
  const [decorations, setDecorations] = useState<Required<InPlaceDecorationToggles>>(
    () =>
      Object.fromEntries(
        DECORATION_KEYS.map((k) => [k, true]),
      ) as Required<InPlaceDecorationToggles>,
  )

  return (
    <main
      style={{
        maxWidth: mode === "split" ? 1100 : 760,
        margin: "3rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.2rem" }}>Stylo playground</h1>

      <div style={{ display: "flex", gap: 8, margin: "1rem 0" }}>
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #d4d4d8",
              background: mode === m ? "#18181b" : "#fff",
              color: mode === m ? "#fff" : "#18181b",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "in-place" && (
        <details style={{ margin: "0 0 1rem", fontSize: "0.85rem" }}>
          <summary style={{ cursor: "pointer", color: "#71717a" }}>
            Customize in-place decorations (ADR-005)
          </summary>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "0.35rem 1rem",
              marginTop: "0.6rem",
            }}
          >
            {DECORATION_KEYS.map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={decorations[key]}
                  onChange={(e) => setDecorations((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {key}
              </label>
            ))}
          </div>
        </details>
      )}

      <Stylo
        key={mode === "in-place" ? JSON.stringify(decorations) : "static"}
        value={doc}
        onChange={setDoc}
        mode={mode}
        onWikiLinkClick={setLastLink}
        inPlace={{ decorations }}
        className={mode === "split" ? "playground-editor is-split" : "playground-editor"}
      />

      <p style={{ color: "#71717a", fontSize: "0.85rem", marginTop: "1rem" }}>
        {lastLink ? `Wikilink clicked: ${lastLink}` : "Switch to preview and click a [[wikilink]]."}
        {" · "}
        {doc.length} characters
      </p>
    </main>
  )
}

const container = document.getElementById("root")
if (!container) throw new Error("#root not found")

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
