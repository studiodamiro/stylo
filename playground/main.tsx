import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { Stylo, type StyloMode } from "../src/index"
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

| Feature      | Status |
| ------------ | ------ |
| Source mode  | done   |
| Preview mode | done   |
| In-place     | soon   |

Inline math: $e^{i\\pi} + 1 = 0$. And a display block:

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

Jump to another note with [[Getting Started]], or a labelled one:
[[api/reference|the API reference]].

> The YAML frontmatter above is kept out of the rendered preview.

\`\`\`ts
const greet = (name: string) => \`hello, \${name}\`
\`\`\`
`

const MODES: StyloMode[] = ["source", "preview", "split", "in-place"]

function App() {
  const [doc, setDoc] = useState(DEMO)
  const [mode, setMode] = useState<StyloMode>("source")
  const [lastLink, setLastLink] = useState<string | null>(null)

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

      <Stylo
        value={doc}
        onChange={setDoc}
        mode={mode}
        onWikiLinkClick={setLastLink}
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
