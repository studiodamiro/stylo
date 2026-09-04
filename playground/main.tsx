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

const DOC_URL = "/api/doc" // dev middleware in vite.config.ts — reads/writes playground/content/sample.md

const MODES: StyloMode[] = ["in-place", "source", "preview", "split"]

const TOOLBARS: Record<string, boolean | ToolbarConfig> = {
  default: true,
  compact: {
    items: ["save", "|", "bold", "italic", "code", "|", "h2", "link", "bulletList", "task"],
  },
  hidden: false,
}

type StickyPick = "off" | "top" | "bottom"
type StickyVisibilityPick = "consistent" | "dynamic"

/** Merge the sticky position + visibility pickers into whichever toolbar preset is chosen. */
function withSticky(
  cfg: boolean | ToolbarConfig,
  sticky: StickyPick,
  stickyVisibility: StickyVisibilityPick,
): boolean | ToolbarConfig {
  if (sticky === "off" || cfg === false) return cfg
  const base = cfg === true ? {} : cfg
  return { ...base, sticky, stickyVisibility }
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

/**
 * `useAutosave` from `docs/wiki/guides/autosave.md`: debounce `onChange`, skip a
 * save when nothing changed since `baseline` (the loaded / last-persisted text),
 * flush on tab hide, and expose `saveNow` for `Mod-s`.
 */
function useAutosave(
  value: string,
  baseline: string,
  save: (v: string) => Promise<void>,
  delay = 600,
) {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const saved = useRef(baseline)
  const latest = useRef(value)
  latest.current = value
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useRef(async () => {
    if (latest.current === saved.current) return
    const pending = latest.current
    setStatus("saving")
    try {
      await saveRef.current(pending)
      saved.current = pending
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }).current

  // Adopt a new baseline (initial load, external reload) without saving it back.
  useEffect(() => {
    saved.current = baseline
  }, [baseline])

  // Debounce: save `delay` ms after the last change.
  useEffect(() => {
    if (value === saved.current) return
    const id = setTimeout(flush, delay)
    return () => clearTimeout(id)
  }, [value, delay, flush])

  // Data-loss guard: flush when the tab is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush()
    }
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
  }, [flush])

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
  const [doc, setDoc] = useState("")
  const [baseline, setBaseline] = useState("")
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading")
  const [mode, setMode] = useState<StyloMode>("in-place")
  const [theme, setTheme] = useState<Theme>("light")

  // Load the document from the file, the way a real app would.
  useEffect(() => {
    let alive = true
    fetch(DOC_URL)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((text) => {
        if (!alive) return
        setDoc(text)
        setBaseline(text)
        setLoad("ready")
      })
      .catch(() => alive && setLoad("error"))
    return () => {
      alive = false
    }
  }, [])

  // Stylo's dark palette activates under a `.dark` / `[data-theme="dark"]`
  // ancestor — here, on <html>, the way next-themes / shadcn drive it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const [toolbar, setToolbar] = useState<keyof typeof TOOLBARS>("default")
  const [stickyToolbar, setStickyToolbar] = useState<StickyPick>("off")
  const [stickyVisibility, setStickyVisibility] = useState<StickyVisibilityPick>("consistent")
  const [frontmatter, setFrontmatter] = useState<"hidden" | "code">("hidden")
  const [tableEdit, setTableEdit] = useState<TableEditing>("cells")
  const [reveal, setReveal] = useState<RevealMode>("never")
  const [selectionUI, setSelectionUI] = useState<SelectionUI>("menu")
  const [lastLink, setLastLink] = useState<string | null>(null)
  const { status: saveStatus, saveNow } = useAutosave(doc, baseline, async (md) => {
    const r = await fetch(DOC_URL, { method: "PUT", body: md })
    if (!r.ok) throw new Error(String(r.status))
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
          <span style={{ marginLeft: "0.75rem" }}>sticky (touch)</span>
          <select
            value={stickyToolbar}
            disabled={toolbar === "hidden"}
            onChange={(e) => setStickyToolbar(e.target.value as StickyPick)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="off">off</option>
            <option value="top">top</option>
            <option value="bottom">bottom</option>
          </select>
          <select
            value={stickyVisibility}
            disabled={stickyToolbar === "off" || toolbar === "hidden"}
            onChange={(e) => setStickyVisibility(e.target.value as StickyVisibilityPick)}
            style={{
              padding: "0.2rem 0.4rem",
              borderRadius: 6,
              border: "1px solid var(--pg-border)",
            }}
          >
            <option value="consistent">consistent</option>
            <option value="dynamic">dynamic</option>
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

      {load === "loading" && <p style={{ color: "var(--pg-muted)" }}>Loading sample.md…</p>}

      {load === "error" && (
        <p style={{ color: "var(--pg-muted)" }}>
          Couldn’t reach <code>{DOC_URL}</code>. Start the playground with <code>npm run dev</code>{" "}
          so the file middleware is active.
        </p>
      )}

      {load === "ready" && (
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
          toolbar={withSticky(TOOLBARS[toolbar]!, stickyToolbar, stickyVisibility)}
          frontmatter={frontmatter}
          codeLanguages={languages}
          className={mode === "split" ? "playground-editor is-split" : "playground-editor"}
        />
      )}

      <p style={{ color: "var(--pg-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
        {lastLink ? `Wikilink clicked: ${lastLink}` : "Switch to preview and click a [[wikilink]]."}
        {" · "}
        {doc.length} characters
        {" · "}
        {
          {
            idle: "no changes saved yet",
            saving: "saving to sample.md…",
            saved: "saved to sample.md",
            error: "save failed — is the dev server up?",
          }[saveStatus]
        }{" "}
        (⌘/Ctrl-S saves now)
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
