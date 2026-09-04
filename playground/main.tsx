import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { languages } from "@codemirror/language-data"
import {
  Stylo,
  type InPlaceDecorationToggles,
  type RevealMode,
  type SelectionUI,
  type StyloMode,
  type TableEditing,
  type ToolbarConfig,
} from "../src/index"
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

\`\`\`python
def greet(name: str) -> str:
    return f"hello, {name}"
\`\`\`
`

const MODES: StyloMode[] = ["in-place", "source", "preview", "split"]

const TOOLBARS: Record<string, boolean | ToolbarConfig> = {
  default: true,
  compact: {
    items: ["save", "|", "bold", "italic", "code", "|", "h2", "link", "bulletList", "task"],
  },
  hidden: false,
}

/**
 * Trimmed `useAutosave` — debounce `onChange`, report status, expose `saveNow`
 * for `Mod-s`. The full version (blur / pagehide flush, error state) is in
 * `docs/wiki/guides/autosave.md`.
 */
function useAutosave(value: string, save: (v: string) => void, delay = 600) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")
  const saved = useRef(value)
  const latest = useRef(value)
  latest.current = value
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useRef(() => {
    if (latest.current === saved.current) return
    setStatus("saving")
    saveRef.current(latest.current)
    saved.current = latest.current
    setStatus("saved")
  }).current

  useEffect(() => {
    if (value === saved.current) return
    const id = setTimeout(flush, delay)
    return () => clearTimeout(id)
  }, [value, delay, flush])

  return { status, saveNow: flush }
}

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

type Theme = "light" | "dark"

function App() {
  const [doc, setDoc] = useState(DEMO)
  const [mode, setMode] = useState<StyloMode>("in-place")
  const [theme, setTheme] = useState<Theme>("light")

  // Stylo's dark palette activates under a `.dark` / `[data-theme="dark"]`
  // ancestor — here, on <html>, the way next-themes / shadcn drive it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const [toolbar, setToolbar] = useState<keyof typeof TOOLBARS>("default")
  const [frontmatter, setFrontmatter] = useState<"hidden" | "code">("hidden")
  const [tableEdit, setTableEdit] = useState<TableEditing>("cells")
  const [reveal, setReveal] = useState<RevealMode>("never")
  const [selectionUI, setSelectionUI] = useState<SelectionUI>("menu")
  const [lastLink, setLastLink] = useState<string | null>(null)
  const { status: saveStatus, saveNow } = useAutosave(doc, (md) => {
    try {
      localStorage.setItem("stylo:playground", md)
    } catch {
      /* private mode, quota, etc. */
    }
  })
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
              border: "1px solid var(--pg-border)",
              background: mode === m ? "var(--pg-fg)" : "var(--pg-surface)",
              color: mode === m ? "var(--pg-surface)" : "var(--pg-fg)",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          style={{
            marginLeft: "auto",
            padding: "0.35rem 0.8rem",
            borderRadius: 6,
            border: "1px solid var(--pg-border)",
            background: "var(--pg-surface)",
            color: "var(--pg-fg)",
            cursor: "pointer",
          }}
        >
          {theme === "light" ? "◐ dark" : "◑ light"}
        </button>
      </div>

      {mode !== "preview" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "var(--pg-muted)",
          }}
        >
          toolbar
          <select
            value={toolbar}
            onChange={(e) => setToolbar(e.target.value as keyof typeof TOOLBARS)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            {Object.keys(TOOLBARS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      )}

      {(mode === "preview" || mode === "split") && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "var(--pg-muted)",
          }}
        >
          frontmatter
          <select
            value={frontmatter}
            onChange={(e) => setFrontmatter(e.target.value as "hidden" | "code")}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="hidden">hidden</option>
            <option value="code">code</option>
          </select>
        </label>
      )}

      {mode === "in-place" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "var(--pg-muted)",
          }}
        >
          table editing
          <select
            value={tableEdit}
            onChange={(e) => setTableEdit(e.target.value as TableEditing)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="source">source</option>
            <option value="cells">cells</option>
          </select>
          <span style={{ marginLeft: "0.75rem" }}>reveal (ADR-007)</span>
          <select
            value={reveal}
            onChange={(e) => setReveal(e.target.value as RevealMode)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="caret">caret</option>
            <option value="never">never</option>
          </select>
          <span style={{ marginLeft: "0.75rem" }}>selection</span>
          <select
            value={selectionUI}
            onChange={(e) => setSelectionUI(e.target.value as SelectionUI)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="menu">menu</option>
            <option value="bar">bar</option>
            <option value="none">none</option>
          </select>
        </label>
      )}

      {mode === "in-place" && (
        <details style={{ margin: "0 0 1rem", fontSize: "0.85rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--pg-muted)" }}>
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
        key={
          mode === "in-place"
            ? `${JSON.stringify(decorations)}:${tableEdit}:${reveal}:${selectionUI}`
            : "static"
        }
        value={doc}
        onChange={setDoc}
        mode={mode}
        onSave={() => saveNow()}
        onWikiLinkClick={setLastLink}
        onLinkClick={(href) => window.open(href, "_blank", "noopener")}
        inPlace={{ decorations, table: tableEdit, reveal, selectionUI }}
        toolbar={TOOLBARS[toolbar]}
        frontmatter={frontmatter}
        codeLanguages={languages}
        className={mode === "split" ? "playground-editor is-split" : "playground-editor"}
      />

      <p style={{ color: "var(--pg-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
        {lastLink ? `Wikilink clicked: ${lastLink}` : "Switch to preview and click a [[wikilink]]."}
        {" · "}
        {doc.length} characters
        {" · "}
        autosave:{" "}
        {saveStatus === "saving"
          ? "saving…"
          : saveStatus === "saved"
            ? "saved to localStorage"
            : "idle"}{" "}
        (⌘/Ctrl-S or the compact toolbar to save now)
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
